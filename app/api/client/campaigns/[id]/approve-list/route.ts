import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// POST - Client approves list preview
export async function POST(
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

    // Verify list has been uploaded
    if (campaign.list_status !== 'uploaded') {
      return NextResponse.json(
        { success: false, error: 'List must be uploaded before approval' },
        { status: 400 }
      );
    }

    // Update campaign approval status
    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        list_status: 'client_reviewed',
        approval_status: 'pending_copy'
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('❌ Error updating campaign:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to approve list' },
        { status: 500 }
      );
    }

    // Create campaign approval record for list stage
    const { error: approvalError } = await supabaseAdmin
      .from('campaign_approvals')
      .insert({
        campaign_id: params.id,
        approval_stage: 'list',
        status: 'approved',
        approved_by: effectiveUserId,
        approver_email: user.email,
        approved_at: new Date().toISOString()
      });

    if (approvalError) {
      console.error('❌ Error creating approval record:', approvalError);
      // Don't fail request, just log
    }

    console.log(`✅ List approved for campaign ${params.id}`);

    return NextResponse.json({
      success: true,
      message: 'List approved. You can now review and approve the campaign copy.'
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/client/campaigns/[id]/approve-list:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve list', details: error.message },
      { status: 500 }
    );
  }
}
