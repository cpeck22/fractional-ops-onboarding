import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// GET - Get campaign by ID
export async function GET(
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

    console.log('TESTING LOGS BELOW');
    console.log('📥 GET /api/client/outbound-campaigns/[id] - Fetching campaign:', {
      campaignId: params.id,
      effectiveUserId,
      userEmail: user.email
    });

    // Force fresh read - don't use cache
    // Match save route logic: query by ID only, then verify ownership
    const { data: campaign, error } = await supabaseAdmin
      .from('outbound_campaigns')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    console.log('📥 GET - RAW DATABASE RESPONSE:', JSON.stringify(campaign, null, 2));
    console.log('📥 GET - Database query result:', {
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      } : null,
      campaignFound: !!campaign,
      campaignId: campaign?.id,
      campaignUserId: campaign?.user_id,
      effectiveUserId: effectiveUserId,
      userIdMatch: campaign?.user_id === effectiveUserId,
      campaignStatus: campaign?.status,
      hasFinalAssets: !!campaign?.final_assets,
      finalAssetsType: typeof campaign?.final_assets,
      finalAssetsIsNull: campaign?.final_assets === null,
      finalAssetsIsUndefined: campaign?.final_assets === undefined,
      finalAssetsRaw: campaign?.final_assets,
      finalAssetsKeys: campaign?.final_assets ? Object.keys(campaign.final_assets) : [],
      finalAssetsCampaignCopyKeys: campaign?.final_assets?.campaignCopy ? Object.keys(campaign.final_assets.campaignCopy) : [],
      finalAssetsEmail1A: campaign?.final_assets?.campaignCopy?.email1A ? {
        hasSubject: !!campaign.final_assets.campaignCopy.email1A.subject,
        subjectLength: campaign.final_assets.campaignCopy.email1A.subject?.length || 0,
        hasBody: !!campaign.final_assets.campaignCopy.email1A.body,
        bodyLength: campaign.final_assets.campaignCopy.email1A.body?.length || 0
      } : null,
      finalAssetsStringified: campaign?.final_assets ? JSON.stringify(campaign.final_assets).substring(0, 1000) : 'null/undefined'
    });

    if (error || !campaign) {
      console.error('❌ GET - Campaign not found:', { error, campaignFound: !!campaign });
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (campaign.user_id !== effectiveUserId) {
      console.error('❌ GET - Ownership mismatch:', {
        campaignUserId: campaign.user_id,
        effectiveUserId
      });
      return NextResponse.json(
        { success: false, error: 'Forbidden: Campaign does not belong to user' },
        { status: 403 }
      );
    }

    // Handle JSONB that might be returned as string
    let finalAssets = campaign.final_assets;
    if (typeof finalAssets === 'string') {
      console.log('⚠️ GET - final_assets is a string, parsing...');
      try {
        finalAssets = JSON.parse(finalAssets);
      } catch (e) {
        console.error('❌ GET - Failed to parse final_assets string:', e);
        finalAssets = null;
      }
    }
    // Only default to {} if it's actually null/undefined, NOT if it's an empty object
    if (finalAssets === null || finalAssets === undefined) {
      finalAssets = {};
    }

    const responseData = {
      success: true,
      campaign: {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        meetingTranscript: campaign.meeting_transcript,
        writtenStrategy: campaign.written_strategy,
        additionalBrief: campaign.additional_brief,
        intermediaryOutputs: campaign.intermediary_outputs || {},
        finalAssets: finalAssets,
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at
      }
    };

    console.log('📥 GET - Response being sent:', {
      hasFinalAssets: !!responseData.campaign.finalAssets,
      finalAssetsKeys: responseData.campaign.finalAssets ? Object.keys(responseData.campaign.finalAssets) : [],
      finalAssetsCampaignCopyKeys: responseData.campaign.finalAssets?.campaignCopy ? Object.keys(responseData.campaign.finalAssets.campaignCopy) : [],
      finalAssetsEmail1A: responseData.campaign.finalAssets?.campaignCopy?.email1A ? {
        hasSubject: !!responseData.campaign.finalAssets.campaignCopy.email1A.subject,
        subjectLength: responseData.campaign.finalAssets.campaignCopy.email1A.subject?.length || 0,
        hasBody: !!responseData.campaign.finalAssets.campaignCopy.email1A.body,
        bodyLength: responseData.campaign.finalAssets.campaignCopy.email1A.body?.length || 0
      } : null,
      responseStringified: JSON.stringify(responseData).substring(0, 500)
    });
    console.log('📥 GET - FULL RESPONSE DATA:', JSON.stringify(responseData, null, 2));
    console.log('📥 GET - campaign.finalAssets raw:', responseData.campaign.finalAssets);
    console.log('📥 GET - campaign.finalAssets type:', typeof responseData.campaign.finalAssets);
    console.log('📥 GET - campaign.finalAssets keys:', responseData.campaign.finalAssets ? Object.keys(responseData.campaign.finalAssets) : 'null/undefined');
    console.log('📥 GET - campaign.status:', responseData.campaign.status);

    // Prevent caching - force fresh data
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('❌ Error in GET /api/client/outbound-campaigns/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaign', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
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

    // Build update object
    const updates: any = {};
    if (body.campaignName !== undefined) updates.campaign_name = body.campaignName.trim();
    if (body.meetingTranscript !== undefined) updates.meeting_transcript = body.meetingTranscript?.trim() || null;
    if (body.writtenStrategy !== undefined) updates.written_strategy = body.writtenStrategy?.trim() || null;
    if (body.additionalBrief !== undefined) updates.additional_brief = body.additionalBrief?.trim() || null;
    if (body.intermediaryOutputs !== undefined) updates.intermediary_outputs = body.intermediaryOutputs;
    if (body.finalAssets !== undefined) updates.final_assets = body.finalAssets;
    if (body.status !== undefined) updates.status = body.status;

    const { data: campaign, error } = await supabaseAdmin
      .from('outbound_campaigns')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', effectiveUserId)
      .select('*')
      .single();

    if (error || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Failed to update campaign', details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        status: campaign.status,
        updatedAt: campaign.updated_at
      }
    });
  } catch (error: any) {
    console.error('❌ Error in PUT /api/client/outbound-campaigns/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update campaign', details: error.message },
      { status: 500 }
    );
  }
}
