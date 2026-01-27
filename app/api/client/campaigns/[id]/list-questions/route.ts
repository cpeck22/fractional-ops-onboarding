import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// POST - Answer list building questions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { has_account_list, has_prospect_list } = body;

    if (typeof has_account_list !== 'boolean' || typeof has_prospect_list !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'has_account_list and has_prospect_list must be boolean values' },
        { status: 400 }
      );
    }

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
      .select('*')
      .eq('id', params.id)
      .eq('user_id', effectiveUserId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Determine list status and approval status
    let listStatus = 'not_required';
    let approvalStatus = 'pending_copy'; // Skip list approval

    if (!has_account_list || !has_prospect_list) {
      listStatus = 'pending_upload';
      approvalStatus = 'pending_list'; // Need list before copy approval
    }

    // Update campaign
    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        list_status: listStatus,
        approval_status: approvalStatus,
        list_data: {
          ...campaign.list_data,
          has_account_list,
          has_prospect_list
        }
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('❌ Error updating campaign:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update campaign' },
        { status: 500 }
      );
    }

    console.log(`✅ List questions answered: ${listStatus}`);

    return NextResponse.json({
      success: true,
      listStatus,
      approvalStatus,
      message: listStatus === 'pending_upload' ? 
        'List building required. Solution architect will be notified when copy is generated.' : 
        'List not required. Proceeding to copy approval.'
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/client/campaigns/[id]/list-questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process list questions', details: error.message },
      { status: 500 }
    );
  }
}
