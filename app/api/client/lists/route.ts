import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // For now, return empty lists (placeholder until database schema is ready)
    // TODO: Implement database query once campaign_lists table is created
    const lists: any[] = [];

    return NextResponse.json({
      success: true,
      lists: lists || []
    });
  } catch (error) {
    console.error('Error in lists route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
