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
    const { list_id, list_name } = body;

    if (!list_id) {
      return NextResponse.json({ success: false, error: 'List ID required' }, { status: 400 });
    }

    // TODO: Update campaign with list_id and set list_status to 'approved'
    // For now, return success placeholder
    console.log(`📋 Attaching list ${list_id} (${list_name}) to campaign ${campaignId}`);

    return NextResponse.json({
      success: true,
      message: 'List attached successfully'
    });
  } catch (error) {
    console.error('Error attaching list:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
