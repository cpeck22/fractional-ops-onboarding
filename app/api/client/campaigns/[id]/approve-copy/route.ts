import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validatePlaceholders } from '@/lib/placeholder-validation';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// POST - Client approves/edits campaign copy
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { edited_copy, comments } = body;

    if (!edited_copy) {
      return NextResponse.json(
        { success: false, error: 'edited_copy is required' },
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

    // Verify copy has been generated
    if (campaign.status !== 'assets_generated') {
      return NextResponse.json(
        { success: false, error: 'Campaign copy must be generated before approval' },
        { status: 400 }
      );
    }

    // Validate placeholders using validation library
    const validationResult = validatePlaceholders(edited_copy);

    if (!validationResult.isValid) {
      console.warn(`⚠️ Missing placeholders in edited copy: ${validationResult.missingPlaceholders.join(', ')}`);
      // Return warning but allow approval (client decision)
    }

    if (validationResult.warnings.length > 0) {
      console.log(`ℹ️ Placeholder warnings: ${validationResult.warnings.join(', ')}`);
    }

    // Update campaign with approved copy
    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        approved_copy: edited_copy,
        approval_status: 'launch_approved',
        status: 'launch_approved'
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('❌ Error updating campaign:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to approve copy' },
        { status: 500 }
      );
    }

    // Create campaign approval record for copy stage
    const { error: approvalError } = await supabaseAdmin
      .from('campaign_approvals')
      .insert({
        campaign_id: params.id,
        approval_stage: 'copy',
        status: 'approved',
        approved_by: effectiveUserId,
        approver_email: user.email,
        comments: comments || null,
        approved_at: new Date().toISOString(),
        audit_log: [
          {
            action: 'approved',
            timestamp: new Date().toISOString(),
            actor: user.email,
            details: {
              edited: edited_copy !== (campaign.final_outputs?.raw_content || ''),
              missingPlaceholders: validationResult.missingPlaceholders.length > 0 ? validationResult.missingPlaceholders : null,
              warnings: validationResult.warnings.length > 0 ? validationResult.warnings : null
            }
          }
        ]
      });

    if (approvalError) {
      console.error('❌ Error creating approval record:', approvalError);
      // Don't fail request, just log
    }

    console.log(`✅ Copy approved for campaign ${params.id}`);

    // The trigger will automatically create a notification to the solution architect

    return NextResponse.json({
      success: true,
      message: 'Campaign copy approved! Status updated to Launch Approved.',
      validation: validationResult
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/client/campaigns/[id]/approve-copy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve copy', details: error.message },
      { status: 500 }
    );
  }
}
