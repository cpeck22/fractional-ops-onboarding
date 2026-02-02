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
    const { list_id, list_name, list_status } = body;

    if (!list_id) {
      return NextResponse.json({ success: false, error: 'List ID required' }, { status: 400 });
    }

    console.log(`📋 Attaching list ${list_id} (${list_name}) to campaign ${campaignId}`);

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the list exists and belongs to the user
    const { data: list, error: listError } = await supabaseAdmin
      .from('campaign_lists')
      .select('id, name, status, type, row_count')
      .eq('id', list_id)
      .eq('user_id', effectiveUserId)
      .single();

    if (listError || !list) {
      console.error('List not found or unauthorized:', listError);
      return NextResponse.json({ 
        success: false, 
        error: 'List not found or unauthorized' 
      }, { status: 404 });
    }

    // Determine list_status based on the selected list's approval status
    // If the list is already approved, set to 'approved', otherwise 'in_progress'
    const newListStatus = list.status === 'approved' ? 'approved' : 'in_progress';

    // Update the campaign with the list information
    const { data: campaign, error: updateError } = await supabaseAdmin
      .from('outbound_campaigns')
      .update({
        list_id: list_id,
        list_name: list.name,
        list_status: newListStatus
      })
      .eq('id', campaignId)
      .eq('user_id', effectiveUserId)
      .select('id, list_id, list_name, list_status, copy_status, launch_status')
      .single();

    if (updateError) {
      console.error('Error updating campaign with list:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to attach list to campaign',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log(`✅ Successfully attached list to campaign:`, {
      campaignId,
      listId: list_id,
      listName: list.name,
      listStatus: newListStatus,
      listType: list.type,
      rowCount: list.row_count
    });

    return NextResponse.json({
      success: true,
      message: 'List attached successfully',
      campaign: {
        id: campaign.id,
        list_id: campaign.list_id,
        list_name: campaign.list_name,
        list_status: campaign.list_status,
        copy_status: campaign.copy_status,
        launch_status: campaign.launch_status
      },
      list: {
        type: list.type,
        row_count: list.row_count,
        status: list.status
      }
    });
  } catch (error: any) {
    console.error('Error attaching list:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
