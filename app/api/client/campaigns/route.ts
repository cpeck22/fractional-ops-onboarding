import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// POST - Create new campaign for any play
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 [Campaign Creation] POST /api/client/campaigns started');
    
    const body = await request.json();
    const { 
      playCode, 
      campaignName, 
      campaignBrief, // { meeting_transcript, written_strategy }
      additionalBrief 
    } = body;

    console.log('📥 [Campaign Creation] Received request:', {
      playCode,
      campaignName,
      hasCampaignBrief: !!campaignBrief,
      hasAdditionalBrief: !!additionalBrief
    });

    // Validation
    if (!playCode || !campaignName || !campaignName.trim()) {
      console.error('❌ [Campaign Creation] Validation failed: Missing playCode or campaignName');
      return NextResponse.json(
        { success: false, error: 'playCode and campaignName are required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    console.log('🔐 [Campaign Creation] Authenticating user...');
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      console.error('❌ [Campaign Creation] Authentication failed:', authError);
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ [Campaign Creation] User authenticated:', user.email);

    // Check for impersonation
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    let effectiveUserId = user.id;

    if (impersonateUserId) {
      console.log('👤 [Campaign Creation] Impersonation detected:', impersonateUserId);
      const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      if (!isAdmin) {
        console.error('❌ [Campaign Creation] Impersonation denied: User is not admin');
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
      effectiveUserId = impersonateUserId;
      console.log('✅ [Campaign Creation] Impersonation authorized. Effective user ID:', effectiveUserId);
    }

    // Get workspace API key FIRST (we need it to query Octave)
    console.log('🔍 [Campaign Creation] Fetching workspace for user:', effectiveUserId);
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (workspaceError || !workspaceData?.workspace_api_key) {
      console.error('❌ [Campaign Creation] No workspace found:', workspaceError);
      return NextResponse.json(
        { success: false, error: 'No workspace found. Please complete onboarding first.' },
        { status: 404 }
      );
    }
    console.log('✅ [Campaign Creation] Workspace found:', workspaceData.workspace_oid);

    // Find agent in Octave by play code (NO DATABASE LOOKUP!)
    console.log(`🔍 [Campaign Creation] Looking up agent in Octave for play code: "${playCode}"`);
    
    let agentOId = null;
    let agentName = null;
    let agentType = null;

    try {
      const allAgents = [];
      let offset = 0;
      const limit = 50;
      let hasNext = true;

      // Fetch all agents from Octave
      while (hasNext) {
        const response = await axios.get(
          'https://app.octavehq.com/api/v2/agents/list',
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceData.workspace_api_key
            },
            params: {
              offset,
              limit,
              orderField: 'createdAt',
              orderDirection: 'DESC'
            }
          }
        );

        const pageAgents = response.data?.data || [];
        allAgents.push(...pageAgents);
        hasNext = response.data?.hasNext || false;
        offset += limit;

        if (!hasNext) break;
      }

      console.log(`📊 [Campaign Creation] Found ${allAgents.length} total agents in workspace`);

      // Search for agent matching play code
      const codePattern = playCode.toLowerCase();

      // Try exact match at start first
      let matchedAgent = allAgents.find((agent: any) => {
        const agentName = (agent.name || '').toLowerCase();
        return agentName.startsWith(codePattern + '_') || agentName.startsWith(codePattern + ' ');
      });

      // Fallback: code anywhere in name
      if (!matchedAgent) {
        matchedAgent = allAgents.find((agent: any) => {
          const agentName = (agent.name || '').toLowerCase();
          return agentName.includes(codePattern);
        });
      }

      if (!matchedAgent) {
        console.error(`❌ [Campaign Creation] No agent found for play code "${playCode}" in Octave workspace`);
        return NextResponse.json(
          {
            success: false,
            error: `No agent found matching play code "${playCode}" in your Octave workspace. Please ensure the agent exists and is named with the play code (e.g., "${playCode}_Agent Name").`
          },
          { status: 404 }
        );
      }

      agentOId = matchedAgent.oId;
      agentName = matchedAgent.name;
      agentType = matchedAgent.type;

      console.log(`✅ [Campaign Creation] Found agent in Octave:`, {
        oId: agentOId,
        name: agentName,
        type: agentType,
        playCode
      });

    } catch (octaveError: any) {
      console.error('❌ [Campaign Creation] Error fetching agents from Octave:', octaveError.response?.data || octaveError.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to Octave workspace',
          details: octaveError.response?.data?.message || octaveError.message
        },
        { status: 500 }
      );
    }

    // Create campaign (campaign_type derived from agent name)
    console.log('📝 [Campaign Creation] Creating campaign in database...');
    const campaignData = {
      user_id: effectiveUserId,
      play_code: playCode,
      campaign_name: campaignName.trim(),
      campaign_type: agentName, // Use agent name as campaign type
      campaign_brief: campaignBrief || {},
      additional_brief: additionalBrief?.trim() || null,
      workspace_api_key: workspaceData.workspace_api_key,
      workspace_oid: workspaceData.workspace_oid,
      agent_oid: agentOId, // Store agent metadata
      agent_type: agentType, // Store agent type (EMAIL, CONTENT, etc.)
      status: 'draft',
      approval_status: 'draft',
      list_status: 'pending_questions',
      intermediary_outputs: {},
      runtime_context: {},
      final_outputs: {},
      list_data: {}
    };
    
    console.log('📊 [Campaign Creation] Campaign data:', {
      userId: effectiveUserId,
      playCode,
      campaignName: campaignName.trim(),
      campaignType: agentName,
      agentType,
      agentOId
    });

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert(campaignData)
      .select('*')
      .single();

    if (campaignError) {
      console.error('❌ [Campaign Creation] Database error creating campaign:', campaignError);
      return NextResponse.json(
        { success: false, error: 'Failed to create campaign', details: campaignError.message },
        { status: 500 }
      );
    }

    console.log('✅ [Campaign Creation] Campaign created successfully:', {
      id: campaign.id,
      name: campaign.campaign_name,
      playCode: campaign.play_code
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        playCode: campaign.play_code,
        status: campaign.status,
        approvalStatus: campaign.approval_status,
        createdAt: campaign.created_at
      }
    });
  } catch (error: any) {
    console.error('❌ Error in POST /api/client/campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create campaign', details: error.message },
      { status: 500 }
    );
  }
}

// GET - List all campaigns for user
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
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

    // Get filters from query params
    const playCode = searchParams.get('play_code');
    const status = searchParams.get('status');
    const approvalStatus = searchParams.get('approval_status');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query
    let query = supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (playCode) {
      query = query.eq('play_code', playCode);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (approvalStatus) {
      query = query.eq('approval_status', approvalStatus);
    }

    const { data: campaigns, error: campaignsError } = await query;

    if (campaignsError) {
      console.error('❌ Error fetching campaigns:', campaignsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    // Get play details for each campaign
    const playCodeSet = new Set(campaigns?.map(c => c.play_code) || []);
    const { data: plays } = await supabaseAdmin
      .from('claire_plays')
      .select('code, name, category')
      .in('code', Array.from(playCodeSet));

    const playsMap = new Map(plays?.map(p => [p.code, p]) || []);

    // Enrich campaigns with play details
    const enrichedCampaigns = campaigns?.map(campaign => ({
      id: campaign.id,
      campaignName: campaign.campaign_name,
      playCode: campaign.play_code,
      playName: playsMap.get(campaign.play_code)?.name || campaign.play_code,
      playCategory: playsMap.get(campaign.play_code)?.category || 'unknown',
      campaignType: campaign.campaign_type,
      status: campaign.status,
      approvalStatus: campaign.approval_status,
      listStatus: campaign.list_status,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at
    })) || [];

    return NextResponse.json({
      success: true,
      campaigns: enrichedCampaigns
    });

  } catch (error: any) {
    console.error('❌ Error in GET /api/client/campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns', details: error.message },
      { status: 500 }
    );
  }
}
