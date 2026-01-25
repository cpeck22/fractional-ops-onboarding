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

    const { data: campaigns, error } = await supabaseAdmin
      .from('outbound_campaigns')
      .select('id, campaign_name, status, created_at, updated_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching campaigns:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaigns: campaigns || []
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/client/outbound-campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns', details: error.message },
      { status: 500 }
    );
  }
}
