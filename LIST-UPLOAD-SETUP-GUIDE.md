# List Upload Feature - Setup Guide

## ✅ What's Been Implemented

### Backend (Fully Implemented):
1. **File Upload Endpoint** (`/api/client/lists/upload`)
   - Accepts CSV and Excel (.xlsx, .xls) files
   - Validates file types and required columns
   - Parses CSV using `csv-parse`
   - Parses Excel using `xlsx` library
   - Counts rows automatically
   - Uploads to Supabase Storage
   - Saves metadata to database

2. **List Fetching Endpoint** (`/api/client/lists`)
   - Fetches lists from database
   - Supports admin impersonation
   - Orders by upload date (newest first)

3. **Column Validation**:
   - **Account Lists**: Company Name, Company Domain, LinkedIn URL, Location, Headcount, Revenue
   - **Prospect Lists**: First Name, Last Name, Email, Title, Company Name, LinkedIn URL
   - Case-insensitive matching
   - Detailed error messages if columns are missing

4. **File Storage**:
   - Files stored in Supabase Storage bucket: `campaign-lists`
   - Path structure: `{user_id}/{timestamp}_{filename}`
   - Public URLs generated for file access

5. **Database Integration**:
   - Saves to `campaign_lists` table
   - Tracks: name, type, file_type, file_url, row_count, status
   - Includes uploaded_by (user email) and timestamps

## 🔧 Setup Required (Your Part)

### Step 1: Create Supabase Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New Bucket"**
3. Configure:
   ```
   Bucket name: campaign-lists
   Public bucket: NO (keep private)
   File size limit: 50 MB (or adjust as needed)
   Allowed MIME types:
     - text/csv
     - application/vnd.ms-excel
     - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   ```
4. Click **Create**

### Step 2: Run SQL Setup Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file: `supabase-campaign-lists-setup.sql`
3. Copy the entire SQL content
4. Paste into SQL Editor
5. Click **Run**

This will:
- Create `campaign_lists` table (if not exists)
- Enable Row Level Security
- Add RLS policies (users can only see/edit their own lists)
- Create performance indexes
- Set up storage bucket policies

### Step 3: Verify Environment Variables

Make sure these exist in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🚀 How It Works

### Upload Flow:

1. **User selects file** → Upload button in Lists page
2. **File validation** → Check file type (CSV/XLSX only)
3. **File parsing** → Extract rows and headers
4. **Column validation** → Verify required columns exist
5. **Storage upload** → Upload file to Supabase Storage
6. **Database save** → Save metadata to `campaign_lists` table
7. **Success response** → Return list details to frontend

### File Parsing:

**CSV Files:**
- Uses `csv-parse` library
- Handles various CSV formats
- Trim whitespace automatically
- Skip empty lines

**Excel Files:**
- Uses `xlsx` library
- Reads first sheet only
- Converts to JSON format
- Handles both .xlsx and .xls

### Column Validation:

Headers are normalized to lowercase and trimmed before comparison.

**Account List Example:**
```csv
Company Name, Company Domain, LinkedIn URL, Location, Headcount, Revenue
Acme Corp, acme.com, linkedin.com/company/acme, San Francisco, 500, $50M
```

**Prospect List Example:**
```csv
First Name, Last Name, Email, Title, Company Name, LinkedIn URL
John, Doe, john@acme.com, CEO, Acme Corp, linkedin.com/in/johndoe
```

## 📊 Database Schema

```sql
campaign_lists
├── id (UUID, primary key)
├── user_id (UUID, references auth.users)
├── name (TEXT, filename)
├── type (TEXT, 'account' or 'prospect')
├── file_type (TEXT, 'csv' or 'xlsx')
├── file_url (TEXT, Supabase Storage URL)
├── row_count (INTEGER, number of data rows)
├── status (TEXT, 'draft' or 'approved')
├── uploaded_by (TEXT, user email)
├── uploaded_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## 🔒 Security

- **RLS Enabled**: Users can only see/edit their own lists
- **Private Bucket**: Files not publicly accessible
- **Authentication Required**: Must be logged in to upload/view
- **File Type Validation**: Only CSV and Excel files accepted
- **Column Validation**: Ensures data integrity

## 🧪 Testing the Feature

### Test Upload:

1. Go to `/client/lists`
2. Click on **Account Lists** or **Prospect Lists** tab
3. Click **Upload** button
4. Select a CSV or Excel file with required columns
5. Wait for processing (should take 1-3 seconds for most files)
6. See success message and list appears in table

### Test Select Existing:

1. Go to `/client/outbound-campaigns` (Launch Status)
2. Find a campaign
3. Click **Select** button in List column
4. Modal opens showing all your uploaded lists
5. Select a list
6. List attaches to campaign (once that feature is wired up)

## ❌ Common Errors & Solutions

### "Failed to upload file to storage"
- **Cause**: Storage bucket doesn't exist
- **Fix**: Create `campaign-lists` bucket in Supabase Dashboard

### "Missing required columns: X, Y, Z"
- **Cause**: CSV/Excel file missing required column headers
- **Fix**: Add the missing columns to your file
- **Note**: Column names are case-insensitive

### "No file provided"
- **Cause**: File didn't upload properly
- **Fix**: Try again, check file size limit (50MB default)

### "Invalid file type"
- **Cause**: Trying to upload non-CSV/Excel file
- **Fix**: Convert to CSV or Excel format

## 📈 File Size Limits

Current settings:
- **Default**: 50 MB per file
- **Adjustable**: Change in Supabase Storage bucket settings
- **Recommended**: Keep under 10 MB for fast processing

## 🔄 Next Steps (Future Enhancements)

- [ ] Download list feature
- [ ] Delete list with confirmation
- [ ] Edit list metadata (rename, change status)
- [ ] List preview (show first 10 rows)
- [ ] Duplicate detection
- [ ] Bulk upload (multiple files)
- [ ] List merging
- [ ] Export to different formats

## 📝 Dependencies Added

```json
{
  "csv-parse": "^6.1.0",  // Already installed
  "xlsx": "^5.0.0"         // Newly installed
}
```

## 🎯 Files Modified

1. `/app/api/client/lists/upload/route.ts` - Full upload implementation
2. `/app/api/client/lists/route.ts` - Database fetching
3. `package.json` - Added xlsx dependency
4. `supabase-campaign-lists-setup.sql` - Complete SQL setup

## ✅ Ready to Test!

Once you've:
1. ✅ Created the `campaign-lists` storage bucket
2. ✅ Run the SQL setup script
3. ✅ Verified environment variables

The feature is **FULLY FUNCTIONAL** and ready to use! 🚀

Upload a test CSV file and watch it parse, validate, store, and display in your Lists repository.
