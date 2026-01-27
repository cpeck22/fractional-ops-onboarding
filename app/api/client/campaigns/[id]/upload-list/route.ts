import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { parse } from 'csv-parse/sync';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// POST - Upload and parse CSV/XLSX list (admin/solution architect only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin access (only solution architects can upload lists)
    const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required to upload lists' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const listType = formData.get('list_type') as string; // 'account' or 'prospect'

    if (!file || !listType) {
      return NextResponse.json(
        { success: false, error: 'file and list_type are required' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV (TODO: Add XLSX support with xlsx library)
    let records: any[];
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseError: any) {
      return NextResponse.json(
        { success: false, error: 'Failed to parse CSV file', details: parseError.message },
        { status: 400 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    // Validate required columns (flexible column names)
    const firstRecord = records[0];
    const columnNames = Object.keys(firstRecord).map(k => k.toLowerCase());

    const accountNameCol = columnNames.find(c => 
      c.includes('account') || c.includes('company') || c.includes('organization')
    );
    const prospectNameCol = columnNames.find(c => 
      c.includes('name') || c.includes('prospect') || c.includes('contact') || c.includes('first')
    );
    const jobTitleCol = columnNames.find(c => 
      c.includes('title') || c.includes('role') || c.includes('position')
    );

    if (!accountNameCol || !prospectNameCol || !jobTitleCol) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Required columns not found. CSV must include: account/company name, prospect/contact name, and job title',
          availableColumns: columnNames
        },
        { status: 400 }
      );
    }

    // Extract only account_name, prospect_name, job_title for preview
    const listPreview = records.slice(0, 100).map(record => ({
      account_name: record[Object.keys(firstRecord).find(k => k.toLowerCase() === accountNameCol)!] || '',
      prospect_name: record[Object.keys(firstRecord).find(k => k.toLowerCase() === prospectNameCol)!] || '',
      job_title: record[Object.keys(firstRecord).find(k => k.toLowerCase() === jobTitleCol)!] || ''
    }));

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get campaign (admin can access any campaign)
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*, user_id')
      .eq('id', params.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Save file to storage (using Supabase storage or file system)
    // For now, we'll store the file content in the database
    // TODO: Implement proper file storage (S3, Supabase Storage, etc.)
    const fileUrl = `data:text/csv;base64,${Buffer.from(fileContent).toString('base64')}`;

    // Update campaign with list data
    const updatedListData = {
      ...(campaign.list_data || {}),
      [`${listType}_list_file`]: fileUrl,
      list_preview: listPreview,
      total_records: records.length,
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.email
    };

    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        list_status: 'uploaded',
        list_data: updatedListData
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('❌ Error updating campaign:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save list' },
        { status: 500 }
      );
    }

    console.log(`✅ List uploaded: ${records.length} records`);

    // The trigger will automatically create a notification to the client

    return NextResponse.json({
      success: true,
      listPreview,
      totalRecords: records.length,
      message: 'List uploaded successfully. Client has been notified to review.'
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/client/campaigns/[id]/upload-list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload list', details: error.message },
      { status: 500 }
    );
  }
}
