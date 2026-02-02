#!/usr/bin/env python3
"""
Script to apply safety features (unsaved changes warning and delete confirmation)
to all GTM Strategy entity pages.
"""

import os
import re

# Entity types and their file paths
entities = [
    ('personas', 'personas'),
    ('use-cases', 'use-cases'),
    ('references', 'references'),
    ('segments', 'segments'),
    ('playbooks', 'playbooks'),
    ('competitors', 'competitors'),
    ('proof-points', 'proof-points'),
]

def add_imports(content):
    """Add safety feature component imports if not present"""
    if 'ConfirmDeleteModal' in content and 'UnsavedChangesWarning' in content:
        return content  # Already has imports
    
    # Find the last import statement
    import_pattern = r"(import [^;]+from ['\"][^'\"]+['\"];)"
    imports = list(re.finditer(import_pattern, content))
    
    if imports:
        last_import = imports[-1]
        insert_pos = last_import.end()
        
        new_imports = "\nimport ConfirmDeleteModal from '@/components/ConfirmDeleteModal';\nimport UnsavedChangesWarning from '@/components/UnsavedChangesWarning';"
        
        content = content[:insert_pos] + new_imports + content[insert_pos:]
    
    return content

def add_state_variables(content):
    """Add unsaved changes and delete confirmation state"""
    if 'hasUnsavedChanges' in content and 'deleteConfirmation' in content:
        return content  # Already has state
    
    # Find the end of existing useState declarations
    # Look for the last useState before useEffect
    pattern = r"(\]\);)\s*\n\s*\n\s*(useEffect\()"
    match = re.search(pattern, content)
    
    if match:
        insert_pos = match.start(2)
        
        new_state = """  // Unsaved changes tracking
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

  """
        
        content = content[:insert_pos] + new_state + content[insert_pos:]
    
    return content

def add_handlers(content, is_detail_page=True):
    """Add delete confirmation and back handlers"""
    if 'handleConfirmDelete' in content and 'handleBack' in content:
        return content  # Already has handlers
    
    # Find handleRemoveArrayItem function and replace it
    pattern = r"(  const handleRemoveArrayItem = \(field: string, index: number\) => \{[^}]+\}\;)"
    
    replacement = """  const handleRemoveArrayItem = (field: string, index: number) => {
    // Get the item value for the confirmation modal
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

  const handleConfirmDelete = () => {
    // Actually delete the item
    const { field, index } = deleteConfirmation;
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }));
    
    // Close modal
    setDeleteConfirmation({
      isOpen: false,
      field: '',
      index: -1,
      itemName: ''
    });
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
      if (!confirmed) return;
    }
    router.back();
  };"""
    
    content = re.sub(pattern, replacement, content)
    
    return content

def add_components_to_jsx(content):
    """Add safety components before closing div"""
    if '<UnsavedChangesWarning' in content:
        return content  # Already added
    
    # Find the return statement's closing </div> before );
    # Look for pattern: </div>\n  );\n}
    pattern = r"(      </div>\n    </div>\n  \);\n\})"
    
    replacement = """      </div>

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
    </div>
  );
}"""
    
    content = re.sub(pattern, replacement, content)
    
    return content

def update_back_button(content):
    """Update back button to use handleBack"""
    # Replace onClick={() => router.back()} with onClick={handleBack}
    content = re.sub(
        r'onClick=\{\(\) => router\.back\(\)\}',
        'onClick={handleBack}',
        content
    )
    return content

def update_save_handler(content):
    """Add setHasUnsavedChanges(false) to save handler"""
    if 'setHasUnsavedChanges(false)' in content:
        return content
    
    # Find toast.success and add setHasUnsavedChanges(false) before setIsEditing(false) or router.push
    pattern = r"(toast\.success\([^\)]+\);)\n(\s+)(setIsEditing\(false\);|const backUrl)"
    replacement = r"\1\n\2setHasUnsavedChanges(false);\n\2\3"
    
    content = re.sub(pattern, replacement, content)
    
    return content

def update_cancel_handler(content):
    """Add unsaved changes check to cancel handler"""
    if 'Check for unsaved changes' in content:
        return content
    
    pattern = r"(  const handleCancel = \(\) => \{)\n"
    replacement = r"\1\n    // Check for unsaved changes\n    if (hasUnsavedChanges) {\n      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');\n      if (!confirmed) return;\n    }\n\n"
    
    content = re.sub(pattern, replacement, content)
    
    # Also add setHasUnsavedChanges(false) before setIsEditing(false)
    pattern2 = r"(\s+)(\}\n\s+setIsEditing\(false\);)"
    replacement2 = r"\1  setHasUnsavedChanges(false);\n\1\2"
    content = re.sub(pattern2, replacement2, content)
    
    return content

def process_detail_page(file_path):
    """Process a detail/edit page [oId]/page.tsx"""
    print(f"Processing detail page: {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Apply all transformations
    content = add_imports(content)
    content = add_state_variables(content)
    content = add_handlers(content, is_detail_page=True)
    content = update_back_button(content)
    content = update_save_handler(content)
    content = update_cancel_handler(content)
    content = add_components_to_jsx(content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated: {file_path}")

def process_new_page(file_path):
    """Process a new/create page content.tsx"""
    print(f"Processing new page: {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Apply transformations
    content = add_imports(content)
    content = add_state_variables(content)
    content = add_handlers(content, is_detail_page=False)
    content = update_back_button(content)
    content = update_save_handler(content)
    content = add_components_to_jsx(content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Updated: {file_path}")

def main():
    base_path = "/Users/alisharif/fractional-ops-onboarding/app/client/gtm-strategy"
    
    for entity_name, entity_folder in entities:
        print(f"\n{'='*60}")
        print(f"Processing {entity_name}...")
        print(f"{'='*60}")
        
        # Process detail page
        detail_page = os.path.join(base_path, entity_folder, "[oId]", "page.tsx")
        if os.path.exists(detail_page):
            try:
                process_detail_page(detail_page)
            except Exception as e:
                print(f"❌ Error processing {detail_page}: {e}")
        else:
            print(f"⚠️  Not found: {detail_page}")
        
        # Process new page content file
        new_page = os.path.join(base_path, entity_folder, "new", "content.tsx")
        if os.path.exists(new_page):
            try:
                process_new_page(new_page)
            except Exception as e:
                print(f"❌ Error processing {new_page}: {e}")
        else:
            print(f"⚠️  Not found: {new_page}")
    
    print(f"\n{'='*60}")
    print("✅ All files processed!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
