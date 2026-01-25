import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

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

    const { data: campaign, error } = await supabaseAdmin
      .from('outbound_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', effectiveUserId)
      .single();

    if (error || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        campaignName: campaign.campaign_name,
        meetingTranscript: campaign.meeting_transcript,
        writtenStrategy: campaign.written_strategy,
        additionalBrief: campaign.additional_brief,
        intermediaryOutputs: campaign.intermediary_outputs || {},
        finalAssets: campaign.final_assets || {},
        status: campaign.status,
        createdAt: campaign.created_at,
        updatedAt: campaign.updated_at
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
