import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// DELETE /api/client/campaigns/[id] - Delete a campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const campaignId = params.id;

    // Check for impersonation
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    const effectiveUserId = impersonateUserId || user.id;

    // Create Supabase admin client for database operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, try to find the campaign in play_executions table
    const { data: playExecution, error: playError } = await supabaseAdmin
      .from('play_executions')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', effectiveUserId)
      .single();

    if (!playError && playExecution) {
      // Delete from play_executions
      const { error: deleteError } = await supabaseAdmin
        .from('play_executions')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', effectiveUserId);

      if (deleteError) {
        console.error('Error deleting play execution:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to delete campaign' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    }

    // If not found in play_executions, try outbound_campaigns
    const { data: outboundCampaign, error: outboundError } = await supabaseAdmin
      .from('outbound_campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', effectiveUserId)
      .single();

    if (!outboundError && outboundCampaign) {
      // Delete from outbound_campaigns
      const { error: deleteError } = await supabaseAdmin
        .from('outbound_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', effectiveUserId);

      if (deleteError) {
        console.error('Error deleting outbound campaign:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to delete campaign' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    }

    // If not found in outbound_campaigns, try campaigns table
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .eq('user_id', effectiveUserId)
      .single();

    if (!campaignError && campaign) {
      // Delete from campaigns
      const { error: deleteError } = await supabaseAdmin
        .from('campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', effectiveUserId);

      if (deleteError) {
        console.error('Error deleting campaign:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to delete campaign' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    }

    // Campaign not found in any table
    return NextResponse.json(
      { success: false, error: 'Campaign not found or unauthorized' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error in DELETE /api/client/campaigns/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
