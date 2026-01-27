import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify play exists and is active
    console.log(`🔍 [Campaign Creation] Looking up play: "${playCode}" in claire_plays table`);
    
    // First, let's see if the play exists at all (without .single())
    const { data: allPlays, error: allPlaysError } = await supabaseAdmin
      .from('claire_plays')
      .select('code, name, is_active')
      .eq('code', playCode);
    
    console.log(`📊 [Campaign Creation] Play lookup results for "${playCode}":`, {
      found: allPlays?.length || 0,
      plays: allPlays,
      error: allPlaysError
    });

    if (allPlaysError) {
      console.error('❌ [Campaign Creation] Database error looking up play:', allPlaysError);
      return NextResponse.json(
        { success: false, error: `Database error: ${allPlaysError.message}` },
        { status: 500 }
      );
    }

    if (!allPlays || allPlays.length === 0) {
      console.error(`❌ [Campaign Creation] Play "${playCode}" not found in database`);
      return NextResponse.json(
        { success: false, error: `Play code "${playCode}" not found. Please ensure the play exists in claire_plays table.` },
        { status: 404 }
      );
    }

    if (allPlays.length > 1) {
      console.error(`❌ [Campaign Creation] Multiple plays found with code "${playCode}":`, allPlays);
      return NextResponse.json(
        { success: false, error: `Multiple plays found with code "${playCode}". Database integrity issue.` },
        { status: 500 }
      );
    }

    const play = allPlays[0];
    console.log(`✅ [Campaign Creation] Play found:`, { code: play.code, name: play.name, isActive: play.is_active });

    if (!play.is_active) {
      console.error(`❌ [Campaign Creation] Play "${playCode}" is inactive`);
      return NextResponse.json(
        { success: false, error: `Play "${playCode}" is not active` },
        { status: 400 }
      );
    }

    // Get workspace API key
    console.log('🔍 [Campaign Creation] Fetching workspace for user:', effectiveUserId);
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

    // Create campaign (campaign_type auto-derived from play)
    console.log('📝 [Campaign Creation] Creating campaign in database...');
    const campaignData = {
      user_id: effectiveUserId,
      play_code: playCode,
      campaign_name: campaignName.trim(),
      campaign_type: play.name, // Use play name as campaign type
      campaign_brief: campaignBrief || {},
      additional_brief: additionalBrief?.trim() || null,
      workspace_api_key: workspaceData.workspace_api_key,
      workspace_oid: workspaceData.workspace_oid,
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
      campaignType: play.name
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
