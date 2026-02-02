import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// Recommended columns for each list type (informational only, not enforced)
const RECOMMENDED_COLUMNS = {
  account: ['company name', 'company domain', 'linkedin url', 'location', 'headcount', 'revenue'],
  prospect: ['first name', 'last name', 'email', 'title', 'company name', 'linkedin url']
};

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check for impersonation
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    const effectiveUserId = impersonateUserId || user.id;

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listType = formData.get('type') as 'account' | 'prospect';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!listType || !['account', 'prospect'].includes(listType)) {
      return NextResponse.json({ success: false, error: 'Invalid list type' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid file type. Only CSV and Excel (.xlsx) files are supported.' 
      }, { status: 400 });
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rows: any[] = [];
    let headers: string[] = [];

    // Parse based on file type
    if (fileExtension === 'csv') {
      // Parse CSV
      const csvContent = buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
      rows = records;
      if (rows.length > 0) {
        headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());
      }
    } else {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
      rows = jsonData;
      if (rows.length > 0) {
        headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());
      }
    }

    // Check if file has data rows (no column validation required)
    if (rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'File is empty or contains no valid data rows' 
      }, { status: 400 });
    }

    // Initialize Supabase client with service role for storage
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upload file to Supabase Storage
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${effectiveUserId}/${timestamp}_${sanitizedFileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('campaign-lists')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload file to storage',
        details: uploadError.message
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('campaign-lists')
      .getPublicUrl(storagePath);

    // Save metadata to database (simplified)
    console.log('💾 Saving list to database:', {
      user_id: effectiveUserId,
      name: fileName,
      type: listType,
      row_count: rows.length
    });
    
    const { data: listRecord, error: dbError } = await supabaseAdmin
      .from('campaign_lists')
      .insert({
        user_id: effectiveUserId,
        name: fileName,
        type: listType,
        file_type: fileExtension === 'xls' ? 'xlsx' : fileExtension,
        file_url: publicUrl,
        row_count: rows.length,
        status: 'draft'
      })
      .select()
      .single();
    
    if (dbError) {
      console.error('❌ Database insert error:', {
        error: dbError,
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from('campaign-lists').remove([storagePath]);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save list metadata',
        details: dbError.message,
        code: dbError.code
      }, { status: 500 });
    }

    if (!listRecord) {
      console.error('❌ No list record returned after insert (no error, but no data)');
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save list - no record returned' 
      }, { status: 500 });
    }

    console.log('✅ List saved successfully to database:', {
      id: listRecord.id,
      user_id: listRecord.user_id,
      name: listRecord.name,
      type: listRecord.type,
      row_count: listRecord.row_count
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${listType} list with ${rows.length} rows`,
      list: {
        id: listRecord.id,
        name: listRecord.name,
        type: listRecord.type,
        row_count: listRecord.row_count,
        status: listRecord.status,
        uploaded_at: listRecord.uploaded_at
      }
    });

  } catch (error: any) {
    console.error('Error in list upload route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
