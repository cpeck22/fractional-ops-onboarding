# GTM Strategy Safety Features Implementation

## Overview
Added two critical UX safety features to prevent accidental data loss in the GTM Strategy section:

1. **Unsaved Changes Warning** - Warns users before leaving a page with unsaved edits
2. **Delete Confirmation Modal** - Requires typing "DELETE" to confirm deletion (HubSpot-style)

## Components Created

### 1. `ConfirmDeleteModal.tsx`
Reusable modal component for confirming deletions:
- Displays item name being deleted
- Requires user to type "DELETE" (case-sensitive) in a text input
- Delete button remains disabled until "DELETE" is typed correctly
- Provides "Cancel" option to abort deletion

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Handler for closing modal
- `onConfirm`: () => void - Handler for confirmed deletion
- `itemName`: string - Name of item being deleted (displayed in modal)
- `itemType`: string - Type of item (e.g., "item", "service", "persona")

### 2. `UnsavedChangesWarning.tsx`
Component that hooks into browser's `beforeunload` event:
- Shows browser's native confirmation dialog when closing tab/window
- Activates only when `hasUnsavedChanges` is true
- No visual UI - purely functional component

**Props:**
- `hasUnsavedChanges`: boolean - Whether there are unsaved changes
- `message`: string (optional) - Custom warning message

## Implementation Pattern

### For Detail/Edit Pages (e.g., `services/[oId]/page.tsx`)

#### 1. Add Imports
```typescript
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import UnsavedChangesWarning from '@/components/UnsavedChangesWarning';
```

#### 2. Add State Variables
```typescript
// Unsaved changes tracking
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Delete confirmation modal state
const [deleteConfirmation, setDeleteConfirmation] = useState<{
  isOpen: boolean;
  field: string;
  index: number;
  itemName: string;
}>({
  isOpen: false,
  field: '',
  index: -1,
  itemName: ''
});
```

#### 3. Add useEffect to Track Changes
```typescript
useEffect(() => {
  if (!entity || !isEditing) {
    setHasUnsavedChanges(false);
    return;
  }

  // Compare formData with original entity data
  const hasChanges = 
    formData.field1 !== (entity.field1 || '') ||
    formData.field2 !== (entity.field2 || '') ||
    // ... compare all fields ...
    JSON.stringify(formData.arrayField) !== JSON.stringify(entity.arrayField || []);

  setHasUnsavedChanges(hasChanges);
}, [formData, entity, isEditing]);
```

#### 4. Update handleSave
```typescript
const handleSave = async () => {
  // ... existing save logic ...
  toast.success('Entity updated successfully');
  setHasUnsavedChanges(false); // ← Add this line
  setIsEditing(false);
  await loadEntity();
};
```

#### 5. Update handleCancel
```typescript
const handleCancel = () => {
  // Check for unsaved changes
  if (hasUnsavedChanges) {
    const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
    if (!confirmed) return;
  }

  // Reset form data...
  setHasUnsavedChanges(false);
  setIsEditing(false);
};
```

#### 6. Update handleRemoveArrayItem
```typescript
const handleRemoveArrayItem = (field: string, index: number) => {
  const fieldArray = formData[field as keyof typeof formData] as string[];
  const itemName = fieldArray[index] || 'this item';
  
  // Show delete confirmation modal
  setDeleteConfirmation({
    isOpen: true,
    field,
    index,
    itemName
  });
};
```

#### 7. Add handleConfirmDelete
```typescript
const handleConfirmDelete = () => {
  const { field, index } = deleteConfirmation;
  setFormData(prev => ({
    ...prev,
    [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
  }));
  
  setDeleteConfirmation({
    isOpen: false,
    field: '',
    index: -1,
    itemName: ''
  });
};
```

#### 8. Add handleBack
```typescript
const handleBack = () => {
  if (hasUnsavedChanges) {
    const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
    if (!confirmed) return;
  }
  router.back();
};
```

#### 9. Update Back Button
```typescript
<button onClick={handleBack} className="...">
  <ArrowLeft />
</button>
```

#### 10. Add Components to JSX (before closing </div>)
```typescript
{/* Unsaved Changes Warning */}
<UnsavedChangesWarning hasUnsavedChanges={hasUnsavedChanges} />

{/* Delete Confirmation Modal */}
<ConfirmDeleteModal
  isOpen={deleteConfirmation.isOpen}
  onClose={() => setDeleteConfirmation({ isOpen: false, field: '', index: -1, itemName: '' })}
  onConfirm={handleConfirmDelete}
  itemName={deleteConfirmation.itemName}
  itemType="item"
/>
```

### For New/Create Pages (e.g., `services/new/new-service-content.tsx`)

#### 1-2. Same imports and state as detail pages

#### 3. Add useEffect to Track Changes (slightly different)
```typescript
useEffect(() => {
  // Consider form filled if any field has content
  const hasContent = 
    formData.field1.trim() !== '' ||
    formData.field2.trim() !== '' ||
    formData.arrayField.some(item => item.trim() !== '');
  
  setHasUnsavedChanges(hasContent);
}, [formData]);
```

#### 4-10. Same handlers and JSX updates as detail pages

## Status

### ✅ Completed
- ✅ `ConfirmDeleteModal.tsx` component
- ✅ `UnsavedChangesWarning.tsx` component
- ✅ `services/[oId]/page.tsx` (detail page)
- ✅ `services/new/new-service-content.tsx` (new page)

### 🔲 Remaining Files (14 total)

**Personas:**
- 🔲 `personas/[oId]/page.tsx`
- 🔲 `personas/new/content.tsx`

**Use Cases:**
- 🔲 `use-cases/[oId]/page.tsx`
- 🔲 `use-cases/new/content.tsx`

**References:**
- 🔲 `references/[oId]/page.tsx`
- 🔲 `references/new/content.tsx`

**Segments:**
- 🔲 `segments/[oId]/page.tsx`
- 🔲 `segments/new/content.tsx`

**Playbooks:**
- 🔲 `playbooks/[oId]/page.tsx`
- 🔲 `playbooks/new/content.tsx`

**Competitors:**
- 🔲 `competitors/[oId]/page.tsx`
- 🔲 `competitors/new/content.tsx`

**Proof Points:**
- 🔲 `proof-points/[oId]/page.tsx`
- 🔲 `proof-points/new/content.tsx`

## User Experience

### Unsaved Changes Warning
- **Trigger**: User tries to leave page (close tab, navigate away, click back button) while editing
- **Behavior**: Shows confirmation dialog asking if user wants to leave without saving
- **Message**: "You have unsaved changes. Are you sure you want to leave this page?"

### Delete Confirmation
- **Trigger**: User clicks "Remove" button on any array field item
- **Behavior**: Shows modal requiring typing "DELETE"
- **Protection**: Delete button disabled until exact text "DELETE" is typed
- **Cancel**: User can click "Cancel" or X to abort deletion

## Technical Notes

- Both components are reusable across all entity types
- `UnsavedChangesWarning` uses browser's native `beforeunload` event
- Delete confirmation tracks field name, index, and item name for context
- All state management is local to each page component
- No global state or context required
