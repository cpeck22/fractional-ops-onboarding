import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// POST - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignName, meetingTranscript, writtenStrategy, additionalBrief } = body;

    if (!campaignName || !campaignName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Campaign name is required' },
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

    // Get workspace API key
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (workspaceError || !workspaceData?.workspace_api_key) {
      return NextResponse.json(
        { success: false, error: 'Claire API key missing, please contact Fractional Ops to fix.' },
        { status: 404 }
      );
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('outbound_campaigns')
      .insert({
        user_id: effectiveUserId,
        campaign_name: campaignName.trim(),
        meeting_transcript: meetingTranscript?.trim() || null,
        written_strategy: writtenStrategy?.trim() || null,
        additional_brief: additionalBrief?.trim() || null,
        workspace_api_key: workspaceData.workspace_api_key,
        workspace_oid: workspaceData.workspace_oid,
        status: 'draft',
        intermediary_outputs: {},
        final_assets: {}
      })
      .select('*')
      .single();

    if (campaignError) {
      console.error('❌ Error creating campaign:', campaignError);
      return NextResponse.json(
        { success: false, error: 'Failed to create campaign', details: campaignError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        status: campaign.status,
        createdAt: campaign.created_at
      }
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/client/outbound-campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign', details: error.message },
      { status: 500 }
    );
  }
}

// GET - List all campaigns for user
export async function GET(request: NextRequest) {
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

    // Query all three sources: campaigns, outbound_campaigns, and play_executions
    const { data: newCampaigns, error: newError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    const { data: oldCampaigns, error: oldError } = await supabaseAdmin
      .from('outbound_campaigns')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    // Also query play_executions to show approved plays from simple flow
    const { data: playExecutions, error: playError } = await supabaseAdmin
      .from('play_executions')
      .select(`
        *,
        claire_plays (
          code,
          name,
          category
        )
      `)
      .eq('user_id', effectiveUserId)
      .order('executed_at', { ascending: false });

    if (newError && oldError && playError) {
      console.error('❌ Error fetching campaigns:', { newError, oldError, playError });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    // Merge all three campaign sources
    const allCampaigns = [
      ...(newCampaigns || []).map((c: any) => ({ ...c, source: 'campaigns' })),
      ...(oldCampaigns || []).map((c: any) => ({ ...c, source: 'outbound_campaigns' })),
      ...(playExecutions || []).map((p: any) => ({
        id: p.id,
        campaign_name: `${p.claire_plays?.name || 'Play'} (${p.claire_plays?.code || 'Unknown'})`,
        status: p.status, // draft, in_progress, or approved
        created_at: p.executed_at || p.created_at,
        updated_at: p.updated_at,
        output: p.output,
        runtime_context: p.runtime_context, // Include the runtime context (personas, use cases, references)
        play_code: p.claire_plays?.code,
        play_category: p.claire_plays?.category,
        source: 'play_executions'
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const error = null; // Combined query succeeded
    const campaigns = allCampaigns;

    if (error) {
      console.error('❌ Error fetching campaigns:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    // Parse JSONB fields and format response
    const formattedCampaigns = (campaigns || []).map((campaign: any) => {
      // Handle JSONB that might be returned as string
      let finalAssets = campaign.final_assets;
      if (typeof finalAssets === 'string') {
        try {
          finalAssets = JSON.parse(finalAssets);
        } catch (e) {
          console.error('❌ Failed to parse final_assets string:', e);
          finalAssets = null;
        }
      }
      if (finalAssets === null || finalAssets === undefined) {
        finalAssets = {};
      }

      let intermediaryOutputs = campaign.intermediary_outputs;
      if (typeof intermediaryOutputs === 'string') {
        try {
          intermediaryOutputs = JSON.parse(intermediaryOutputs);
        } catch (e) {
          intermediaryOutputs = {};
        }
      }
      if (intermediaryOutputs === null || intermediaryOutputs === undefined) {
        intermediaryOutputs = {};
      }

      return {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        meetingTranscript: campaign.meeting_transcript,
        writtenStrategy: campaign.written_strategy,
        additionalBrief: campaign.additional_brief,
        intermediaryOutputs: intermediaryOutputs,
        finalAssets: finalAssets,
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      campaigns: formattedCampaigns
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/client/outbound-campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns', details: error.message },
      { status: 500 }
    );
  }
}
