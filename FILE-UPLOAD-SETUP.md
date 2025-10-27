# 📁 File Upload Implementation Guide

## 🎉 What's Been Implemented

Your app now has **full file upload functionality** with Supabase Storage integration!

### ✨ Features

- ✅ Upload files to Supabase Storage (cloud storage)
- ✅ Store file URLs in database
- ✅ Send file URLs to Zapier webhook
- ✅ File validation (type & size)
- ✅ Upload progress indicator
- ✅ Display uploaded files with clickable links
- ✅ Multiple file support
- ✅ User-scoped storage (organized by user ID)

---

## 🔧 Setup Required

### **Step 1: Configure Supabase Storage Policies**

Go to: [Storage Policies](https://supabase.com/dashboard/project/wmvccwxvtwhtlrltbnej/storage/policies)

#### **Policy 1: Allow Users to Upload**
```sql
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Questionnaire Files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 2: Allow Users to Read**
```sql
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'Questionnaire Files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 3: Allow Users to Update**
```sql
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Questionnaire Files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 4: Allow Users to Delete**
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'Questionnaire Files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 📝 How It Works

### **File Upload Flow**

1. **User selects files** (Questions 26 & 27)
2. **Validation runs**:
   - Max 10MB per file
   - Allowed: PDF, DOC, DOCX, PNG, JPG, JPEG
3. **Files uploaded to** Supabase Storage:
   - Path: `userId/timestamp_filename.ext`
   - Example: `c8a2f01c-c513-46b3-aed0-ecc69814e040/1730057123456_brand-guide.pdf`
4. **URLs stored** in database (comma-separated)
5. **Auto-save** after upload
6. **Files displayed** with clickable links

---

## 🎯 What Gets Sent to Zapier

### **New Fields in Webhook:**

```json
{
  // Original fields (backward compatible)
  "brandDocuments": "url1, url2, url3",
  "additionalFiles": "url1, url2",
  
  // NEW: Array format for easy iteration
  "brandDocumentsUrls": ["url1", "url2", "url3"],
  "additionalFilesUrls": ["url1", "url2"],
  "totalFileCount": 5
}
```

### **Using File URLs in Zapier:**

**Option 1: Access Individual URLs**
```
Loop through brandDocumentsUrls array:
  For each URL:
    - Download file
    - Upload to Monday.com
    - Or attach to email
```

**Option 2: Send All URLs as Links**
```
Send email with file links:
Brand Documents:
{{brandDocumentsUrls}}

Additional Files:
{{additionalFilesUrls}}
```

---

## 🧪 Testing the Implementation

### **Step 1: Test File Upload**

1. Go to http://localhost:3000
2. Navigate to **Step 10: Brand & Examples**
3. Try uploading files in **Question 26** (Brand Documents)
4. Try uploading files in **Question 27** (Additional Files)

**Watch for:**
- ✅ "Uploading files..." message
- ✅ Success toast notification
- ✅ Files listed with clickable links
- ✅ Files accessible when clicked

### **Step 2: Check Database**

Files are stored as URLs in your `questionnaire_responses` table:
```
field_key: brandDocuments
field_value: https://wmvccwxvtwhtlrltbnej.supabase.co/storage/v1/object/public/Questionnaire%20Files/...
```

### **Step 3: Check Supabase Storage**

1. Go to [Storage](https://supabase.com/dashboard/project/wmvccwxvtwhtlrltbnej/storage/buckets/Questionnaire%20Files)
2. You should see folders named by user ID
3. Inside: `timestamp_filename.ext`

### **Step 4: Test Zapier**

1. Submit questionnaire with files
2. Check Zapier webhook data
3. Look for new fields:
   - `brandDocumentsUrls`
   - `additionalFilesUrls`
   - `totalFileCount`

---

## 📊 File Storage Structure

```
Questionnaire Files/
├── c8a2f01c-c513-46b3-aed0-ecc69814e040/
│   ├── 1730057123456_brand-guidelines.pdf
│   ├── 1730057123457_voice-doc.pdf
│   └── 1730057123458_logo.png
├── another-user-id/
│   └── their-files.pdf
```

---

## 🔒 Security Features

- ✅ **User-scoped**: Each user can only access their own files
- ✅ **Authentication required**: Must be logged in to upload
- ✅ **File validation**: Size and type restrictions
- ✅ **RLS policies**: Database-level security
- ✅ **Unique filenames**: Timestamp prevents conflicts

---

## ⚠️ File Upload Limits

| Limit | Value |
|-------|-------|
| Max file size | 10MB |
| Allowed types | PDF, DOC, DOCX, PNG, JPG, JPEG |
| Multiple files | Yes |
| Storage quota | 1GB free (Supabase) |

---

## 🐛 Troubleshooting

### **"Failed to upload" error**

**Causes:**
- Storage policies not configured
- File too large (>10MB)
- Invalid file type
- Not authenticated

**Solution:**
1. Check Supabase Storage policies
2. Verify file size/type
3. Ensure user is logged in

### **Files not showing in Storage**

**Solution:**
1. Check browser console for errors
2. Verify bucket name is correct: `Questionnaire Files`
3. Check RLS policies are active

### **Can't access uploaded files**

**Solution:**
1. Ensure bucket is **public** OR
2. Use signed URLs for private buckets
3. Check file path format

---

## 💰 Costs

### **Supabase Storage Pricing**
- **Free tier**: 1GB storage
- **Pro**: $0.021/GB/month
- **Bandwidth**: Included in free tier

### **Expected Usage**
- Average questionnaire: 5-10 files
- Average file size: 2-3MB
- 100 clients: ~2-3GB = $0.06/month

Very affordable! 💸

---

## 🎉 Success Checklist

- [ ] Storage policies configured in Supabase
- [ ] Tested file upload (Questions 26 & 27)
- [ ] Files visible in Supabase Storage
- [ ] Files accessible via links
- [ ] Zapier receives file URLs
- [ ] Monday.com receives files (via Zapier)

---

## 📞 Next Steps

1. **Configure Storage Policies** (see Step 1 above)
2. **Test file upload** locally
3. **Test Zapier integration** with files
4. **Deploy to production**
5. **Monitor storage usage** in Supabase

---

## 🚀 Deployed!

**Commit**: `5fe99a2`  
**Status**: Ready for testing  
**Location**: http://localhost:3000 (Step 10: Brand & Examples)

Happy uploading! 📁✨

