import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// GET - Get list preview (account_name, prospect_name, job_title only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    let effectiveUserId = user.id;

    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
      effectiveUserId = impersonateUserId;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('list_data, list_status')
      .eq('id', params.id)
      .eq('user_id', effectiveUserId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify list has been uploaded
    if (campaign.list_status !== 'uploaded' && campaign.list_status !== 'client_reviewed') {
      return NextResponse.json(
        { success: false, error: 'No list available for preview' },
        { status: 400 }
      );
    }

    const listData = campaign.list_data || {};
    const listPreview = listData.list_preview || [];

    return NextResponse.json({
      success: true,
      listPreview,
      totalRecords: listData.total_records || 0,
      uploadedAt: listData.uploaded_at || null
    });

  } catch (error: any) {
    console.error('❌ Error in GET /api/client/campaigns/[id]/preview-list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch list preview', details: error.message },
      { status: 500 }
    );
  }
}
