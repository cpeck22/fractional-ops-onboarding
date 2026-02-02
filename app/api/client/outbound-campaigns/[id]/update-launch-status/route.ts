import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = params.id;
    const body = await request.json();
    const { launch_status } = body;

    if (!launch_status || !['in_progress', 'live'].includes(launch_status)) {
      return NextResponse.json({ success: false, error: 'Invalid launch status' }, { status: 400 });
    }

    // TODO: Update campaign launch_status in database
    // If launching live, trigger Zapier webhook
    console.log(`🚀 Updating launch status for campaign ${campaignId} to ${launch_status}`);

    if (launch_status === 'live') {
      // TODO: Trigger Zapier webhook
      console.log('🔔 Would trigger Zapier webhook here');
      const zapierWebhookUrl = process.env.ZAPIER_CAMPAIGN_LAUNCH_WEBHOOK;
      if (zapierWebhookUrl) {
        // Placeholder for Zapier webhook call
        console.log('Zapier webhook URL:', zapierWebhookUrl);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Launch status updated to ${launch_status}`
    });
  } catch (error) {
    console.error('Error updating launch status:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
