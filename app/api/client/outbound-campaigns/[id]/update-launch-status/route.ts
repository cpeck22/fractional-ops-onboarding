import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check for impersonation
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

    const campaignId = params.id;
    const body = await request.json();
    const { launch_status } = body;

    if (!launch_status || !['in_progress', 'live'].includes(launch_status)) {
      return NextResponse.json({ success: false, error: 'Invalid launch status' }, { status: 400 });
    }

    console.log(`🚀 Updating launch status for campaign ${campaignId} to ${launch_status}`);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current campaign to verify copy & list are approved (if updating to 'in_progress')
    const { data: currentCampaign, error: fetchError } = await supabaseAdmin
      .from('outbound_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', effectiveUserId)
      .single();

    if (fetchError || !currentCampaign) {
      console.error('Campaign not found:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Campaign not found' 
      }, { status: 404 });
    }

    // Verify prerequisites before allowing launch status changes
    if (launch_status === 'in_progress') {
      // Can only set to in_progress if both copy and list are approved
      if (currentCampaign.copy_status !== 'approved' || currentCampaign.list_status !== 'approved') {
        return NextResponse.json({
          success: false,
          error: 'Both copy and list must be approved before launch can begin',
          details: {
            copy_status: currentCampaign.copy_status,
            list_status: currentCampaign.list_status
          }
        }, { status: 400 });
      }
    }

    // Update launch status in database
    const { data: updatedCampaign, error: updateError } = await supabaseAdmin
      .from('outbound_campaigns')
      .update({ launch_status })
      .eq('id', campaignId)
      .eq('user_id', effectiveUserId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating launch status:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update launch status',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log(`✅ Launch status updated successfully to ${launch_status}`);

    // If launching live, trigger Zapier webhook
    if (launch_status === 'live') {
      const zapierWebhookUrl = process.env.ZAPIER_CAMPAIGN_LAUNCH_WEBHOOK;
      
      if (zapierWebhookUrl) {
        console.log('🔔 Triggering Zapier webhook for campaign launch...');
        
        try {
          const webhookPayload = {
            campaign_id: campaignId,
            campaign_name: updatedCampaign.campaign_name,
            user_id: effectiveUserId,
            user_email: user.email,
            list_id: updatedCampaign.list_id,
            list_name: updatedCampaign.list_name,
            play_code: updatedCampaign.play_code || null,
            play_name: updatedCampaign.play_name || null,
            final_assets: updatedCampaign.final_assets || {},
            launched_at: new Date().toISOString()
          };

          const webhookResponse = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload)
          });

          if (!webhookResponse.ok) {
            console.error('⚠️ Zapier webhook failed:', webhookResponse.status, await webhookResponse.text());
            // Don't fail the request, just log the error
          } else {
            console.log('✅ Zapier webhook triggered successfully');
          }
        } catch (webhookError) {
          console.error('⚠️ Error calling Zapier webhook:', webhookError);
          // Don't fail the request, just log the error
        }
      } else {
        console.log('⚠️ Zapier webhook URL not configured (ZAPIER_CAMPAIGN_LAUNCH_WEBHOOK env var)');
      }
    }

    return NextResponse.json({
      success: true,
      message: `Launch status updated to ${launch_status}`,
      campaign: {
        id: updatedCampaign.id,
        campaign_name: updatedCampaign.campaign_name,
        copy_status: updatedCampaign.copy_status,
        list_status: updatedCampaign.list_status,
        launch_status: updatedCampaign.launch_status
      }
    });
  } catch (error: any) {
    console.error('Error updating launch status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
