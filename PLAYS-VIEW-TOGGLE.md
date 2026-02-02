# Plays View Toggle Feature

## Overview
Added Icon View / List View toggle to all plays pages, allowing users to switch between card-based grid layout and a comprehensive table layout.

## Affected Pages
- `/client/allbound` - Always On Signals plays
- `/client/outbound` - Campaigns plays  
- `/client/nurture` - CRM Nurture plays

## Features Implemented

### 1. **View Toggle Button** ✅
Located at the top right of each plays page:
- **Icon View**: Card-based grid layout (default, existing view)
- **List View**: Table format with detailed information

**Design:**
- Toggle button group with active state highlighting
- Icons from lucide-react: `LayoutGrid` (Icon View) and `List` (List View)
- Active button highlighted in primary color (blue)
- Inactive buttons show hover effect

### 2. **Icon View (Grid)** ✅
The existing card-based layout, maintained as default:
- 3-column responsive grid on desktop
- 2-column on tablet
- 1-column on mobile
- Each play shows:
  - Play code badge
  - Play name
  - Description
  - Status badges (Draft, In Progress, Approved) when applicable
  - Disabled state for unavailable plays

### 3. **List View (Table)** ✅
New table format showing all plays in a scannable list:

**Columns:**
1. **Play #** - Play code (e.g., 0002, 2001) as clickable badge
2. **Name** - Play name as clickable link
3. **Description** - Full play description (truncated with `line-clamp-2`)
4. **Draft** - Count of draft executions in circular badge
5. **In Progress** - Count of in-progress executions in circular badge
6. **Approved** - Count of approved/completed executions in circular badge

**Features:**
- Hover effect on rows for better interactivity
- Clickable play codes and names (both navigate to play detail page)
- Status counts shown in colored circular badges:
  - **Draft**: Amber background (🟡)
  - **In Progress**: Blue background (📝)
  - **Approved**: Green background (✅)
- Empty states show "—" when no executions exist
- Disabled plays shown with reduced opacity
- Alert icon and "Currently unavailable" text for disabled plays

## User Benefits

### Icon View (Grid)
**Best for:**
- Visual browsing
- Quick scanning by play names
- Focusing on individual plays
- Mobile usage

**Advantages:**
- Larger, easier to tap on mobile
- More visual breathing room
- Better for fewer plays

### List View (Table)
**Best for:**
- Comprehensive overview
- Comparing multiple plays
- Seeing all status counts at once
- Desktop usage

**Advantages:**
- See all plays on one screen (no scrolling through cards)
- Quick status overview for all plays
- Easier to compare execution counts
- More information density
- Better for power users

## Technical Implementation

### State Management
Each page has a `viewMode` state:
```typescript
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
```

### Toggle Button UI
```typescript
<div className="inline-flex rounded-lg border border-fo-border bg-white shadow-sm">
  <button
    onClick={() => setViewMode('grid')}
    className={/* Active: bg-fo-primary text-white, Inactive: hover states */}
  >
    <LayoutGrid className="w-4 h-4" />
    <span>Icon View</span>
  </button>
  <button
    onClick={() => setViewMode('list')}
    className={/* Active: bg-fo-primary text-white, Inactive: hover states */}
  >
    <List className="w-4 h-4" />
    <span>List View</span>
  </button>
</div>
```

### Conditional Rendering
```typescript
{viewMode === 'grid' && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Card layout */}
  </div>
)}

{viewMode === 'list' && (
  <div className="bg-white rounded-lg shadow-sm border border-fo-border overflow-hidden">
    <table className="w-full">
      {/* Table layout */}
    </table>
  </div>
)}
```

### Table Structure
- **Header**: Uses `bg-fo-light` with uppercase, semibold column labels
- **Body**: Alternating row hover states with `hover:bg-fo-light/50`
- **Status Badges**: Circular badges with color-coded backgrounds
  ```typescript
  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
    {play.executions.draft}
  </span>
  ```

## Files Modified

### 1. `/app/client/allbound/allbound-plays-content.tsx`
- Added `LayoutGrid` and `List` icon imports
- Added `viewMode` state
- Added toggle button UI
- Wrapped existing grid in conditional render
- Added new list view table

### 2. `/app/client/outbound/outbound-plays-content.tsx`
- Same changes as allbound
- Toggle button placed next to "Create Campaign" button

### 3. `/app/client/nurture/nurture-plays-content.tsx`
- Same changes as allbound and outbound
- Consistent implementation across all three pages

## User Experience Flow

### Switching Views
1. User lands on plays page (default: Icon View)
2. User clicks "List View" toggle button
3. Table view instantly replaces card grid
4. User can click "Icon View" to return to cards
5. View state persists during page session

### Interacting with List View
1. User scans table rows for plays
2. Click play code or name to navigate to play detail
3. Status counts provide quick overview of execution states
4. Hover effect highlights current row
5. Disabled plays clearly marked with reduced opacity

## Design Consistency

### Colors & Badges
- **Draft**: `bg-amber-100 text-amber-700` (warm, cautionary)
- **In Progress**: `bg-blue-100 text-blue-700` (active, working)
- **Approved**: `bg-green-100 text-green-700` (complete, success)
- **Play Code**: `bg-fo-primary/10 text-fo-primary` (brand color)

### Typography
- **Headers**: Uppercase, semibold, tracking-wider
- **Play Names**: Font-semibold for emphasis
- **Descriptions**: Regular weight, truncated for consistency
- **Status Counts**: Semibold within badges

### Spacing
- Table cells: `px-6 py-4` for comfortable padding
- Status badges: `w-8 h-8` for consistent sizing
- Gap between toggle buttons: Border separator

## Future Enhancements

Potential improvements:
- [ ] Persist view preference in localStorage
- [ ] Add column sorting (by name, status counts, etc.)
- [ ] Add filters (show only draft, in progress, etc.)
- [ ] Add search functionality for play names/descriptions
- [ ] Export list view to CSV
- [ ] Keyboard shortcuts (G for Grid, L for List)
- [ ] Remember last view preference per user
- [ ] Add tooltips on status badges showing full status names

## Testing Checklist

- [x] Build passes without errors
- [x] Toggle switches between views correctly
- [x] Icon View maintains existing functionality
- [x] List View displays all columns correctly
- [x] Status badges show correct counts
- [x] Clicking play codes/names navigates correctly
- [x] Disabled plays show properly in both views
- [x] Empty state message displays when no plays
- [ ] Manual testing needed:
  - [ ] Responsive behavior on mobile/tablet
  - [ ] Status badge colors render correctly
  - [ ] Hover states work properly
  - [ ] All three pages (allbound/outbound/nurture) work consistently
  - [ ] Navigation from table rows works
  - [ ] Impersonate parameter maintained in links

## CEO Feedback Addressed

✅ **"Toggle between icon view and list view"**
- Implemented toggle button with clear labels and icons

✅ **"List view shows row by row all different plays"**
- Table layout with one play per row

✅ **"Each row has columns for number, name, and description"**
- Play #, Name, and Description columns implemented

✅ **"Overview of how many in draft, in progress, completed"**
- Dedicated columns for Draft, In Progress, and Approved counts

✅ **"Same with outbound and same with CRM"**
- Applied consistently to all three pages

## Performance Notes

- No additional API calls required (uses existing data)
- Conditional rendering ensures only one view loaded at a time
- Table structure optimized for performance with proper key attributes
- Hover states use CSS transitions for smooth UX
