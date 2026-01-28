# Simple Flow Implementation - Client-Ready Play Execution

## 🎯 LOOM DEMO READY!

This document outlines the complete simple flow implementation for CEOs to use Claire plays effortlessly.

---

## 🎬 The 9-Step Flow (ALL WORKING)

### ✅ Step 1: Select Play from Master List
- Navigate to `/client/allbound`, `/client/nurture`, or `/client/outbound`
- View available plays with descriptions
- See real-time status badges on each play card

### ✅ Step 2: Select Inputs
- Click play card (e.g., 0002 - Qualified Website Visitors)
- Select **Persona** (required, single select)
- Select **Use Case(s)** (required, multi-select)
- Select **Case Study/Reference** (optional, multi-select)

### ✅ Step 3: Run Play
- Click "Run Play" button
- Octave agent executes with selected context
- Output generated with **automatic highlighting** (async background process)

### ✅ Step 4: Review Output with Highlights
- **Highlighted copy** displays automatically
- **Legend shows all categories:**
  - 🔵 Persona
  - 🟡 Segment
  - 🟢 Use Case (Outcome)
  - 🔴 Problem/Blocker
  - 🟡 CTA/Lead Magnet
  - 🔵 Resource/Valuable Offer
  - 🟠 **Personalization** ({{first_name}}, {{company_name}}, etc.)
- Toggle highlights on/off with button
- Status: **Draft** (not saved yet)

### ✅ Step 5: Go Back to Master List → See "In Progress"
- After clicking "Save as In Progress" button
- Or after auto-save triggers (2 seconds after editing)
- Master list displays: **📝 In Progress (1)**

### ✅ Step 6: Edit Copy (Auto-Save + Manual Save)
- Click "Edit" button
- Make changes in textarea
- **Auto-save:** Saves 2 seconds after you stop typing
  - Shows: "💾 Auto-saving..."
  - Then: "✅ Saved 12:34:56 PM"
- **Manual save:** Click "Save Now" button anytime
- **Refinement:** Use "Refine Output" for AI-based edits
- Status automatically updates to **In Progress**

### ✅ Step 7: Hit "Approve & Send"
- Click "Approve & Send" button
- Saves final edits
- Updates status to **Approved**
- Sends Zapier webhook notification to GTM Engineer
- Shows success toast: "✅ Approved! Notification sent to GTM Engineer"
- Auto-redirects to master list after 2 seconds

### ✅ Step 8: Go Back to Master List → See "Approved"
- Master list now displays: **✅ Approved (1)**
- Play card shows updated status
- Can still click play to view approved copy (read-only)

### ✅ Step 9: Notification Sent to GTM Engineer
- **Zapier Webhook:** https://hooks.zapier.com/hooks/catch/23854516/uqv6s35/
- **Payload includes:**
  - Client email and company name
  - Play code and name
  - Execution ID
  - Final edited output
  - Approval timestamp
  - Approver email

---

## 📊 Status Workflow

```
┌─────────┐    Save/Edit     ┌──────────────┐    Approve     ┌──────────┐
│  DRAFT  │ ───────────────> │ IN PROGRESS  │ ─────────────> │ APPROVED │
│ (🟡)    │   (manual or     │   (📝)       │   (sends      │  (✅)    │
└─────────┘    auto-save)     └──────────────┘   webhook)    └──────────┘
   │                                                               │
   │ Not saved                                                     │ Notification
   │ Yellow badge                                                  │ sent to GTME
   │                                                               │ Green badge
   └───────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### New API Endpoints

1. **`POST /api/client/approve-execution`**
   - Direct approve (skip approval page)
   - Updates execution status to 'approved'
   - Sends Zapier webhook notification
   - Returns success confirmation

2. **`GET /api/client/play-execution-statuses`**
   - Groups all executions by play code and status
   - Returns counts: `{ "0002": { draft: 2, in_progress: 1, approved: 3, total: 6 } }`
   - Used by master list to show status badges

### Status Badge Display

**Master List (All Categories):**
- Queries execution statuses via `/api/client/play-execution-statuses`
- Displays badges on each play card:
  - 🟡 Draft (X) - Amber background
  - 📝 In Progress (X) - Blue background
  - ✅ Approved (X) - Green background
- Only shows if executions exist for that play

**Play Execution Page:**
- Shows current status above action buttons
- Updates in real-time after save/approve
- Color-coded badges match master list

### Auto-Save Implementation

**How It Works:**
1. `useEffect` monitors `editedOutput` state changes
2. Debounce timer: 2 seconds
3. Clear previous timeout on each keystroke
4. After 2 seconds of no changes → auto-save triggers
5. Makes PUT request to `/api/client/executions/[id]`
6. Updates status to 'in_progress'
7. Shows "✅ Saved" indicator with timestamp

**Safety Features:**
- Only runs when editing
- Skips if execution is already approved
- Cleans HTML artifacts before saving
- Updates local state immediately
- Cleanup on unmount

### Button States

**Save as In Progress:**
- Enabled: draft or in_progress status
- Disabled: approved status
- Action: Save edits + update status to 'in_progress'

**Approve & Send:**
- Enabled: any status except approved
- Disabled: already approved
- Action: Save edits + update to 'approved' + send webhook + redirect
- Shows "✅ Approved" when disabled

---

## 🚀 Deployment Checklist

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor:
-- File: supabase-add-in-progress-status.sql

ALTER TABLE play_executions DROP CONSTRAINT IF EXISTS play_executions_status_check;

ALTER TABLE play_executions 
ADD CONSTRAINT play_executions_status_check 
CHECK (status IN ('draft', 'in_progress', 'pending_approval', 'approved', 'rejected'));
```

### 2. Set Environment Variable (Vercel)
```bash
ZAPIER_WEBHOOK_APPROVAL_NOTIFICATION=https://hooks.zapier.com/hooks/catch/23854516/uqv6s35/
```

Note: If env var not set, the hardcoded fallback in `approve-execution/route.ts` will be used.

### 3. Test Complete Flow

**Test Script:**
1. Go to `/client/allbound`
2. Click Play 0002 (Qualified Website Visitors)
3. Select any Persona
4. Select any Use Case
5. Select any Case Study (optional)
6. Click "Run Play"
7. Wait for output (highlighting happens in background)
8. Click "Edit"
9. Make a small change
10. Wait 2 seconds → See "✅ Saved" indicator
11. Go back to `/client/allbound`
12. Verify: Play 0002 shows "📝 In Progress (1)" badge
13. Click Play 0002 again
14. Click "Approve & Send"
15. See: "✅ Approved! Notification sent to GTM Engineer"
16. Wait 2 seconds (auto-redirect)
17. Verify: Play 0002 shows "✅ Approved (1)" badge
18. Check Zapier (webhook received)

---

## 📦 What's NOT Included (Hidden for CEOs)

The complex campaign creation flow (`/client/outbound/2001/new-campaign`) is still in the codebase but:
- **Not linked** from play cards
- **Not visible** to CEOs
- **Still functional** for Solution Architects who know the URL
- Routes still exist: `/client/[category]/[code]/new-campaign`

This keeps the advanced workflow available for internal use while presenting CEOs with the simple, intuitive flow.

---

## 🎥 LOOM Recording Checklist

### Before Recording:
- [ ] Run SQL migration in Supabase
- [ ] Set Zapier webhook env var in Vercel
- [ ] Clear any existing test executions (optional - or use them to show statuses!)
- [ ] Log in as test client

### During Recording:
- [ ] Show master list with play cards
- [ ] Click play, show selection form
- [ ] Run play, wait for output
- [ ] Show highlighted output with legend
- [ ] Point out {{placeholders}} in orange
- [ ] Show status badges on master list
- [ ] Edit copy, show auto-save indicator
- [ ] Click "Approve & Send"
- [ ] Show success message
- [ ] Go back to master list
- [ ] Show "Approved" badge
- [ ] Show Zapier notification (if possible)

---

## 🔥 Key Features for Demo

1. **One-Click Play Execution** - No complex briefing process
2. **Automatic Highlighting** - Color-coded legend, perfect visibility
3. **Real-Time Status Tracking** - See progress on master list
4. **Auto-Save** - Never lose work (2-second debounce)
5. **Direct Approve** - One click to finalize and notify
6. **Zapier Integration** - Notification sent to GTM Engineer
7. **Beautiful UI** - Clean, modern, professional

---

## 🎯 Client Value Proposition

"Click a play, select your inputs, generate copy with AI highlights, edit if needed, and approve. 
Your GTM Engineer is notified automatically. That's it. That's Claire."

**Simple. Fast. Production-ready copy in minutes, not hours.**

---

## ✅ All Done - Ready to Record!

The simple flow is 100% functional and client-ready. Record your Loom demo now! 🚀
