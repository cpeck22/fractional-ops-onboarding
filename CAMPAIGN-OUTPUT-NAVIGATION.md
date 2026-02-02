# Campaign Output Navigation & Collapsible Sections

## Overview

The campaign output display now features collapsible sections, a navigation sidebar, and section deletion capabilities to help users navigate and customize their campaign copy efficiently.

## Features Implemented

### 1. **Collapsible Sections**
- All campaign output sections (emails, LinkedIn DMs, call scripts, messaging, etc.) can be expanded or collapsed
- Click the section header to toggle expand/collapse
- Sections remember their state while navigating
- First email expands by default for quick viewing

**Benefits:**
- Reduces scrolling for long campaigns
- Focus on specific sections you're working on
- Cleaner, more organized interface

### 2. **Navigation Sidebar**
- Sticky sidebar shows all visible sections
- Click any section to scroll directly to it
- Active section highlighting as you scroll
- Shows count of visible sections
- Responsive design (collapses on mobile)

**Benefits:**
- Quick navigation to any section
- Visual overview of campaign structure
- Know which section you're currently viewing

### 3. **Delete Sections**
- Users can delete sections they don't need (e.g., remove LinkedIn DMs if not needed)
- Trash icon on each section header
- HubSpot-style confirmation modal requiring typing "DELETE"
- Deleted sections removed from navigation
- Cannot delete the "Full Editable Copy" section (required for final approval)

**Benefits:**
- Customize output to match your campaign needs
- Remove channels you're not using
- Cleaner final output

### 4. **Maintained Editing Capabilities**
- All existing editing functionality preserved
- Subject lines and email bodies remain editable
- Highlighted preview still available
- Full campaign copy editor still accessible

## Components Created

### `CollapsibleCampaignSection.tsx`
Reusable component for collapsible sections with:
- Expand/collapse functionality
- Optional delete button with confirmation
- Icon support
- Smooth animations
- Scroll-into-view support

**Props:**
- `id`: Unique section identifier
- `title`: Section display name
- `icon`: Optional React icon component
- `children`: Section content
- `defaultExpanded`: Initial expansion state (default: true)
- `onDelete`: Delete handler function
- `isDeletable`: Whether section can be deleted (default: true)

### `CampaignNavigationSidebar.tsx`
Sticky sidebar component with:
- Auto-tracking of active section while scrolling
- Click-to-scroll navigation
- Section visibility awareness
- Responsive design
- Icon support for each section

**Props:**
- `sections`: Array of section objects with:
  - `id`: Section identifier
  - `title`: Display name
  - `icon`: React icon component
  - `isVisible`: Whether section is currently visible

## User Experience Flow

### Viewing Campaign Output
1. User generates campaign copy
2. Email sequence displays with:
   - Info banner about collapsible sections
   - Navigation sidebar (desktop)
   - Collapsible sections for each email
3. User can:
   - Click section headers to expand/collapse
   - Click sidebar links to jump to sections
   - Scroll naturally with active section tracking

### Editing Content
1. Expand the section you want to edit
2. Edit content directly in the section
3. Collapse when done
4. Or use "Full Editable Copy" section for bulk editing

### Deleting Sections
1. Click trash icon on unwanted section
2. Confirmation modal appears
3. Type "DELETE" to confirm
4. Section removed from view and navigation
5. Toast notification confirms deletion

### Navigation
1. Sidebar shows all visible sections
2. Active section highlighted in blue
3. Click any section name to jump to it
4. Smooth scroll animation
5. Sticky positioning keeps nav accessible

## Technical Implementation

### State Management
```typescript
const [visibleSections, setVisibleSections] = useState<{ [key: string]: boolean }>({});
```

Tracks which sections are visible (not deleted):
- Initialized when email sequence loads
- Updated when sections are deleted
- Checked before rendering sections

### Section IDs
- `highlighted-preview`: Full sequence with highlights
- `email-0`, `email-1`, etc.: Individual emails
- `full-copy`: Full editable copy section
- `highlight-legend`: Highlight color legend

### Delete Handler
```typescript
const handleDeleteSection = (sectionId: string) => {
  setVisibleSections(prev => ({
    ...prev,
    [sectionId]: false
  }));
  toast.success('Section removed from campaign output');
};
```

## Layout Structure

```
┌─────────────────────────────────────────────┐
│  Campaign Copy Header                      │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Navigation  │  Highlighted Preview         │
│  Sidebar     │  (Collapsible)               │
│              │                              │
│  • Preview   │  ──────────────────────────  │
│  • Email 1   │  Email 1 (Collapsible)       │
│  • Email 2   │    - Subject Line            │
│  • Email 3   │    - Body Content            │
│  • Full Copy │    - Signature               │
│  • Legend    │                              │
│              │  ──────────────────────────  │
│              │  Email 2 (Collapsible)       │
│              │                              │
│              │  ──────────────────────────  │
│              │  Full Editable Copy          │
│              │  (Collapsible)               │
│              │                              │
└──────────────┴──────────────────────────────┘
```

## Future Enhancements

Potential improvements:
- [ ] Reorder sections via drag-and-drop
- [ ] Keyboard shortcuts for navigation (arrow keys)
- [ ] Expand/collapse all button
- [ ] Export only visible sections
- [ ] Templates for common section combinations
- [ ] Section search/filter
- [ ] Undo delete functionality
- [ ] Save section preferences per user

## Files Modified

1. **Components Created:**
   - `/components/CollapsibleCampaignSection.tsx`
   - `/components/CampaignNavigationSidebar.tsx`

2. **Pages Updated:**
   - `/app/client/[category]/[code]/new-campaign/new-campaign-content.tsx`

3. **Documentation:**
   - `CAMPAIGN-OUTPUT-NAVIGATION.md` (this file)

## Testing Checklist

- [x] Build passes without errors
- [x] Components compile correctly
- [x] No TypeScript errors
- [ ] Manual testing needed:
  - [ ] Expand/collapse sections
  - [ ] Navigate via sidebar
  - [ ] Delete sections with confirmation
  - [ ] Edit content in collapsed/expanded sections
  - [ ] Mobile responsive behavior
  - [ ] Multiple email sequences
  - [ ] Single email campaigns

## Notes

- The "Full Editable Copy" section cannot be deleted as it's required for final approval
- Section visibility persists during the session but resets on page reload
- Navigation sidebar only appears when there are multiple sections to navigate
- All existing functionality (editing, highlighting, approval) remains unchanged
