import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

export const dynamic = 'force-dynamic';

// POST - Send email notification for campaign workflow event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { notification_type, recipient_email, metadata } = body;

    if (!notification_type || !recipient_email) {
      return NextResponse.json(
        { success: false, error: 'notification_type and recipient_email are required' },
        { status: 400 }
      );
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
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('campaign_notifications')
      .insert({
        campaign_id: params.id,
        notification_type,
        recipient_email,
        status: 'pending',
        metadata: metadata || {}
      })
      .select('*')
      .single();

    if (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      return NextResponse.json(
        { success: false, error: 'Failed to create notification' },
        { status: 500 }
      );
    }

    // Send email via Zapier webhook (using existing webhook)
    const webhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('⚠️ ZAPIER_WEBHOOK_URL not configured, skipping email send');
      
      // Update notification status to failed
      await supabaseAdmin
        .from('campaign_notifications')
        .update({
          status: 'failed',
          error_message: 'Webhook URL not configured'
        })
        .eq('id', notification.id);

      return NextResponse.json({
        success: false,
        error: 'Email webhook not configured'
      });
    }

    // Build email content based on notification type
    let emailSubject = '';
    let emailBody = '';

    switch (notification_type) {
      case 'list_building_required':
        emailSubject = `[Claire] List Building Required: ${campaign.campaign_name}`;
        emailBody = `
Campaign: ${campaign.campaign_name}
Play Code: ${campaign.play_code}

A client has created a campaign that requires list building assistance.

List Building Instructions:
${campaign.intermediary_outputs?.list_building_instructions || 'Not available'}

Campaign URL: ${process.env.NEXT_PUBLIC_APP_URL}/admin/campaigns/${params.id}

Please build the list and upload it when ready.
        `.trim();
        break;

      case 'list_ready_for_review':
        emailSubject = `[Claire] Campaign List Ready for Review: ${campaign.campaign_name}`;
        emailBody = `
Hi,

Your campaign list for "${campaign.campaign_name}" has been uploaded and is ready for review.

Please review and approve the list to proceed to copy approval.

Review List: ${process.env.NEXT_PUBLIC_APP_URL}/client/campaigns/${params.id}/approve-list

Total Records: ${campaign.list_data?.total_records || 0}
        `.trim();
        break;

      case 'launch_approved':
        emailSubject = `[Claire] Campaign Approved: ${campaign.campaign_name}`;
        emailBody = `
Campaign: ${campaign.campaign_name}
Play Code: ${campaign.play_code}

A client has approved their campaign copy. Status: Launch Approved.

Campaign URL: ${process.env.NEXT_PUBLIC_APP_URL}/admin/campaigns/${params.id}

The campaign is ready for launch.
        `.trim();
        break;

      default:
        emailSubject = `[Claire] Campaign Notification: ${campaign.campaign_name}`;
        emailBody = `Campaign notification for ${campaign.campaign_name}`;
    }

    // Send to Zapier webhook
    try {
      await axios.post(webhookUrl, {
        to: recipient_email,
        subject: emailSubject,
        body: emailBody,
        campaign_id: params.id,
        campaign_name: campaign.campaign_name,
        notification_type
      });

      // Update notification status to sent
      await supabaseAdmin
        .from('campaign_notifications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      console.log(`✅ Email sent: ${notification_type} to ${recipient_email}`);

      return NextResponse.json({
        success: true,
        message: 'Notification sent successfully'
      });

    } catch (emailError: any) {
      console.error('❌ Error sending email:', emailError);

      // Update notification status to failed
      await supabaseAdmin
        .from('campaign_notifications')
        .update({
          status: 'failed',
          error_message: emailError.message
        })
        .eq('id', notification.id);

      return NextResponse.json(
        { success: false, error: 'Failed to send email notification' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Error in POST /api/client/campaigns/[id]/send-notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notification', details: error.message },
      { status: 500 }
    );
  }
}
