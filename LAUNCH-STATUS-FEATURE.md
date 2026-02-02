# Launch Status Feature Implementation

## Overview
Complete redesign of the Launch Status page (`/client/outbound-campaigns`) with a three-column approval workflow for campaign launches.

## User Experience Flow

### 1. Campaign Creation
When a Claire play generates a campaign:
- Campaign automatically created with Copy status = "In Progress"
- List status = "Not Started" (shows Select Existing / Create New buttons)
- Launch status = "Not Started" (locked with 🔒 icon)

### 2. Copy Approval (Column 1: "Copy")
**Status Progression:**
- 🟠 **Orange** - In Progress (default)
- 🔴 **Red** - Changes Required (if client requests revisions)
- 🟢 **Green** - Approved (client approves messaging)

*Note: This workflow already exists in the current system*

### 3. List Approval (Column 2: "List")
**Initial State - Two Buttons:**
- **"Select Existing"** (Green button) - Choose from uploaded lists
- **"Create New"** (Gray button) - Create a new list (coming soon)

**When "Select Existing" clicked:**
1. Modal opens showing all available lists (from Lists repository)
2. Shows account lists and prospect lists
3. Display: Name, Type, File Type, Row Count, Status, Upload Date
4. User selects a list
5. List attaches to campaign
6. List status automatically updates to match selected list's status:
   - If selecting approved list → List column turns 🟢 Green
   - If selecting draft list → List column turns 🟠 Orange (In Progress)

**Status Progression:**
- ⚪ **Gray** - Not Started (shows Select Existing / Create New buttons)
- 🟠 **Orange** - In Progress (list selected but not approved)
- 🟢 **Green** - Approved (list selected and approved)

### 4. Launch Workflow (Column 3: "Launch")
**Locked State:**
- Shows 🔒 Lock icon
- Gray background
- "Not Started" label
- **Cannot be clicked** until both Copy and List are Approved (🟢 Green)

**Unlocked State (both Copy and List approved):**
- Lock icon changes to 🔓 Unlocked
- Automatically changes to 🟠 Orange "In Progress"
- Becomes clickable button
- User clicks → Status changes to 🟢 Green "Live"
- **Triggers Zapier webhook** to notify GTM engineering team

**Status Progression:**
- ⚪ **Gray with 🔒** - Not Started (locked until Copy + List approved)
- 🟠 **Orange** - In Progress (unlocked, ready to launch)
- 🟢 **Green** - Live (launched, webhook triggered)

## UI Components

### Campaign Card Layout
```
┌────────────────────────────────────────────────────────────┐
│ [Left Side - Details]        [Right Side - 3 Columns]      │
│                                                            │
│ [ID#123] - Campaign Name     ┌──────┬──────┬──────┐       │
│ [Play 2001] - Play Name      │ Copy │ List │Launch│       │
│ Created: User [Date][Time]   ├──────┼──────┼──────┤       │
│ Updated: User [Date][Time]   │  🟠  │ [Sel]│  🔒  │       │
│                              │      │ [New]│      │       │
│                              └──────┴──────┴──────┘       │
│                                          [▼] View/Edit    │
└────────────────────────────────────────────────────────────┘
```

### Status Color Coding

#### Copy Column (Messaging)
- 🟠 **Orange** (`bg-orange-500`) - In Progress
- 🔴 **Red** (`bg-red-500`) - Changes Required  
- 🟢 **Green** (`bg-green-500`) - Approved

#### List Column
- ⚪ **Gray** (`bg-gray-400`) - Not Started (buttons shown)
- 🟠 **Orange** (`bg-orange-500`) - In Progress
- 🟢 **Green** (`bg-green-500`) - Approved

#### Launch Column
- ⚪ **Gray** (`bg-gray-400`) with 🔒 - Not Started (locked)
- 🟠 **Orange** (`bg-orange-500`) with 🔓 - In Progress (clickable)
- 🟢 **Green** (`bg-green-500`) - Live

## Components Created

### 1. `SelectListModal.tsx`
Modal component for selecting existing lists:
- Fetches all lists from `/api/client/lists`
- Displays lists in selectable cards
- Shows list metadata (type, file format, row count, status, date)
- Returns selected list ID and name to parent component
- Empty state when no lists available

**Props:**
- `isOpen`: boolean - Modal visibility
- `onClose`: () => void - Close handler
- `onSelect`: (listId, listName) => void - Selection handler
- `impersonateUserId`: string | null | undefined - For admin impersonation

### 2. `new-campaigns-list-content.tsx`
New Launch Status page component:
- Displays campaigns with three-column status
- Handles list selection and attachment
- Manages launch status progression
- Integrates with SelectListModal
- View/Edit and Delete actions with dropdown

**Key Functions:**
- `handleSelectExistingList()` - Opens list selection modal
- `handleListSelected()` - Attaches selected list to campaign
- `handleCreateNewList()` - Placeholder for create new list
- `handleUpdateLaunchStatus()` - Updates launch status and triggers webhooks
- `isLaunchLocked()` - Determines if launch is locked

## API Endpoints Created

### 1. `POST /api/client/outbound-campaigns/[id]/attach-list`
Attaches a selected list to a campaign.

**Request Body:**
```json
{
  "list_id": "string",
  "list_name": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "List attached successfully"
}
```

**TODO:** Implement database update to set:
- `list_id` on campaign
- `list_name` on campaign
- `list_status` to match selected list's status

### 2. `POST /api/client/outbound-campaigns/[id]/update-launch-status`
Updates launch status and triggers Zapier webhook if launching live.

**Request Body:**
```json
{
  "launch_status": "in_progress" | "live"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Launch status updated to live"
}
```

**TODO:** Implement:
- Database update for `launch_status`
- Zapier webhook call when status = 'live'
- Use environment variable: `ZAPIER_CAMPAIGN_LAUNCH_WEBHOOK`

## Navigation Updates

### Command Centre Menu
Added "Lists" item:
```typescript
{
  id: 'commandCentre',
  label: 'Command Centre',
  icon: ListChecks,
  items: [
    { href: '/client/outbound-campaigns', label: 'Launch Status', icon: Rocket },
    { href: '/client/lists', label: 'Lists', icon: FileSpreadsheet },  // ← NEW
  ],
}
```

## Lists Repository Page

### Features
- Two tabs: **Account Lists** and **Prospect Lists**
- Upload button for CSV and XLSX files
- Table view showing:
  - List name
  - File type (CSV/XLSX)
  - Row count
  - Status (Draft/Approved)
  - Upload date
  - Actions (Download/Delete)
- Format requirements displayed for each list type

### Account List Format
**Required Columns:**
- Company Name
- Company Domain
- LinkedIn URL
- Location
- Headcount
- Revenue

### Prospect List Format
**Required Columns:**
- First Name
- Last Name
- Email
- Title
- Company Name
- LinkedIn URL

## Database Schema Needed

### New Table: `campaign_lists`
```sql
CREATE TABLE campaign_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('account', 'prospect')),
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  file_url TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- RLS policies
ALTER TABLE campaign_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lists"
  ON campaign_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lists"
  ON campaign_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON campaign_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON campaign_lists FOR DELETE
  USING (auth.uid() = user_id);
```

### Update Table: `outbound_campaigns` (or equivalent)
Add new columns:
```sql
ALTER TABLE outbound_campaigns
  ADD COLUMN copy_status TEXT DEFAULT 'in_progress' CHECK (copy_status IN ('in_progress', 'changes_required', 'approved')),
  ADD COLUMN list_status TEXT DEFAULT 'not_started' CHECK (list_status IN ('not_started', 'in_progress', 'approved')),
  ADD COLUMN launch_status TEXT DEFAULT 'not_started' CHECK (launch_status IN ('not_started', 'in_progress', 'live')),
  ADD COLUMN list_id UUID REFERENCES campaign_lists(id),
  ADD COLUMN list_name TEXT,
  ADD COLUMN play_code TEXT,
  ADD COLUMN play_name TEXT,
  ADD COLUMN created_by TEXT,
  ADD COLUMN updated_by TEXT;
```

## Integration Points

### 1. Campaign Copy Approval
When copy is approved (existing workflow):
```typescript
// In approve-copy endpoint:
copy_status: 'approved'
```

### 2. List Selection
When user selects a list:
```typescript
// Attach list to campaign
list_id: selectedList.id
list_name: selectedList.name
list_status: selectedList.status // 'draft' or 'approved'
```

### 3. Auto-Unlock Launch
When both Copy and List are approved:
```typescript
if (copy_status === 'approved' && list_status === 'approved') {
  // Launch automatically unlocks and goes to 'in_progress'
  launch_status: 'in_progress'
}
```

### 4. Launch Live
When user clicks Launch button:
```typescript
launch_status: 'live'
// Trigger Zapier webhook
await fetch(process.env.ZAPIER_CAMPAIGN_LAUNCH_WEBHOOK, {
  method: 'POST',
  body: JSON.stringify({
    campaign_id: campaign.id,
    campaign_name: campaign.campaignName,
    play_code: campaign.play_code,
    list_id: campaign.list_id,
    list_name: campaign.list_name,
    launched_at: new Date().toISOString()
  })
});
```

## Environment Variables Needed

Add to `.env.local`:
```
ZAPIER_CAMPAIGN_LAUNCH_WEBHOOK=https://hooks.zapier.com/hooks/catch/...
```

## Files Created

1. **Pages:**
   - `/app/client/lists/page.tsx` - Lists repository page
   - `/app/client/lists/lists-content.tsx` - Lists page content
   - `/app/client/outbound-campaigns/new-campaigns-list-content.tsx` - New launch status design

2. **Components:**
   - `/components/SelectListModal.tsx` - List selection modal

3. **API Endpoints:**
   - `/app/api/client/lists/route.ts` - Fetch lists
   - `/app/api/client/lists/upload/route.ts` - Upload list files
   - `/app/api/client/outbound-campaigns/[id]/attach-list/route.ts` - Attach list to campaign
   - `/app/api/client/outbound-campaigns/[id]/update-launch-status/route.ts` - Update launch status

4. **Documentation:**
   - `LAUNCH-STATUS-FEATURE.md` (this file)

## Files Modified

1. `/app/client/layout.tsx` - Added Lists to Command Centre navigation
2. `/app/client/allbound/allbound-plays-content.tsx` - List view default, toggle on left
3. `/app/client/outbound/outbound-plays-content.tsx` - List view default, removed header
4. `/app/client/nurture/nurture-plays-content.tsx` - List view default, toggle on left

## Next Steps (Database Implementation)

### Priority 1: Database Schema
1. Create `campaign_lists` table
2. Add new columns to campaigns table
3. Set up RLS policies
4. Run migrations

### Priority 2: API Implementation
1. Implement actual list upload with file storage
2. Parse CSV/XLSX files and validate columns
3. Update campaigns when lists are attached
4. Implement auto-unlock logic for Launch status
5. Add Zapier webhook integration

### Priority 3: File Storage
1. Set up Supabase Storage bucket for list files
2. Implement file upload to storage
3. Generate public URLs for list downloads
4. Add file validation (column headers, data format)

### Priority 4: Enhanced Features
1. Implement "Create New" list workflow
2. Add list preview/download functionality
3. Add list editing capabilities
4. Add list approval workflow
5. Track who uploaded/approved lists
6. Add list usage tracking (which campaigns use which lists)

## Testing Checklist

### Frontend (Completed)
- [x] Lists page renders
- [x] Lists navigation works
- [x] Launch Status page renders with three columns
- [x] Select Existing button opens modal
- [x] Create New button shows placeholder message
- [x] Lock icon shows on Launch when not ready
- [x] View/Edit and Delete dropdowns work
- [x] Build passes without errors

### Backend (Pending - Needs Database)
- [ ] Lists API returns actual data from database
- [ ] List upload stores file and creates database record
- [ ] Attach list updates campaign correctly
- [ ] List status syncs when list selected
- [ ] Launch auto-unlocks when Copy and List approved
- [ ] Launch status updates correctly
- [ ] Zapier webhook triggers on launch live
- [ ] File download works
- [ ] File validation works

### Integration (Pending)
- [ ] Copy approval updates copy_status
- [ ] List selection updates list_status
- [ ] Auto-unlock logic works
- [ ] Manual launch button works
- [ ] Zapier receives webhook with correct data
- [ ] GTM engineering team gets notified
- [ ] Campaign tracking persists across sessions

## Visual Design

### Colors and States
Based on CEO wireframes, status colors are:
- **Orange** (`bg-orange-500`) - In Progress, active work
- **Red** (`bg-red-500`) - Changes Required, needs attention
- **Green** (`bg-green-500`) - Approved/Live, ready/complete
- **Gray** (`bg-gray-400`) - Not Started, locked, inactive

### Layout
- **Left 1/3**: Campaign metadata and details
- **Right 2/3**: Three equal columns (Copy, List, Launch)
- **Status boxes**: 24px height (h-24), rounded, centered content
- **Dropdown**: Top-right corner for View/Edit and Delete actions

## Workflow Example

### Example 1: Happy Path
1. **Campaign Created**
   - Copy: 🟠 In Progress
   - List: ⚪ Not Started (buttons)
   - Launch: ⚪ Locked 🔒

2. **User Approves Copy**
   - Copy: 🟢 Approved ✅
   - List: ⚪ Not Started (buttons)
   - Launch: ⚪ Locked 🔒

3. **User Selects Approved List**
   - Copy: 🟢 Approved
   - List: 🟢 Approved ✅
   - Launch: 🟠 In Progress 🔓 (auto-unlocked!)

4. **User Clicks Launch**
   - Copy: 🟢 Approved
   - List: 🟢 Approved
   - Launch: 🟢 Live 🚀
   - **Zapier webhook triggers** → GTM team notified

### Example 2: With Revisions
1. **Campaign Created**
   - Copy: 🟠 In Progress
   - List: ⚪ Not Started
   - Launch: ⚪ Locked 🔒

2. **User Requests Copy Changes**
   - Copy: 🔴 Changes Required
   - List: ⚪ Not Started
   - Launch: ⚪ Locked 🔒

3. **Copy Revised and Approved**
   - Copy: 🟢 Approved
   - List: ⚪ Not Started
   - Launch: ⚪ Locked 🔒 (still locked!)

4. **User Selects In-Progress List**
   - Copy: 🟢 Approved
   - List: 🟠 In Progress
   - Launch: ⚪ Locked 🔒 (still locked - need list approved!)

5. **List Approved**
   - Copy: 🟢 Approved
   - List: 🟢 Approved
   - Launch: 🟠 In Progress 🔓 (now unlocked!)

6. **User Launches**
   - Launch: 🟢 Live 🚀

## Integration with Existing Features

### Copy Approval
The existing copy approval workflow automatically sets `copy_status`:
- When copy generated → `in_progress`
- When changes requested → `changes_required`
- When approved → `approved`

### Play Executions
Campaigns can originate from:
- Direct campaign creation (`/client/outbound-campaigns/new`)
- Play executions (`/client/{category}/{code}`)

Both feed into the same Launch Status page.

## Future Enhancements

1. **Bulk Actions**
   - Select multiple campaigns
   - Bulk launch
   - Bulk list assignment

2. **Filters & Search**
   - Filter by play code
   - Filter by status combination
   - Search by campaign name
   - Date range filters

3. **Analytics**
   - Time from creation to launch
   - Average time in each status
   - Most used lists
   - Launch success rates

4. **Notifications**
   - Email when copy approved
   - Email when list approved
   - Email when campaign launches
   - Slack integration

5. **List Management**
   - List versioning
   - List deduplication
   - List merge capabilities
   - List segmentation tools

## Known Limitations (Current Implementation)

1. **No Database Persistence**
   - Statuses are placeholders
   - List attachments not stored
   - Campaign data mock structure

2. **No File Processing**
   - Upload button placeholder
   - No CSV/XLSX parsing
   - No validation of column headers

3. **No Zapier Integration**
   - Webhook URL placeholder
   - No actual HTTP call

4. **No List Creation**
   - "Create New" button is placeholder
   - No UI for manual list entry

These limitations will be resolved once database schema is implemented.

## Testing the UI (Current State)

You can test the UI flow even without database:
1. Navigate to `/client/outbound-campaigns`
2. You'll see the new three-column layout
3. Click "Select Existing" buttons in List column
4. Modal opens (shows empty state since no lists yet)
5. Notice Launch column is locked with 🔒
6. View/Edit and Delete dropdowns work

## Summary

✅ **Completed:**
- Lists repository UI
- Launch Status three-column UI
- SelectListModal component
- API endpoint structure
- Navigation updates
- View toggle updates
- Documentation

⏳ **Pending (Needs Database):**
- campaign_lists table creation
- Campaign status columns
- List upload and storage
- Status update logic
- Zapier webhook integration
- Auto-unlock logic

🎯 **Ready For:**
- Database schema implementation
- Backend logic integration
- Testing with real data
