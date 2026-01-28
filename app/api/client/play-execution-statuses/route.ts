import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

/**
 * GET - Get execution status counts for all plays
 * Returns: { "0002": { draft: 2, in_progress: 1, approved: 3, total: 6 }, ... }
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all executions for this user with play code
    const { data: executions, error } = await supabaseAdmin
      .from('play_executions')
      .select('id, status, play_code')
      .eq('user_id', effectiveUserId);

    if (error) {
      console.error('Error fetching execution statuses:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch execution statuses' },
        { status: 500 }
      );
    }

    // Group executions by play code and status
    const statusMap: Record<string, { draft: number; in_progress: number; approved: number; total: number }> = {};

    executions?.forEach((exec: any) => {
      const playCode = exec.play_code;
      if (!playCode) return;

      if (!statusMap[playCode]) {
        statusMap[playCode] = { draft: 0, in_progress: 0, approved: 0, total: 0 };
      }

      statusMap[playCode].total++;

      if (exec.status === 'draft') {
        statusMap[playCode].draft++;
      } else if (exec.status === 'in_progress') {
        statusMap[playCode].in_progress++;
      } else if (exec.status === 'approved') {
        statusMap[playCode].approved++;
      }
    });

    return NextResponse.json({
      success: true,
      statuses: statusMap
    });

  } catch (error: any) {
    console.error('❌ Error in GET /api/client/play-execution-statuses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch execution statuses', details: error.message },
      { status: 500 }
    );
  }
}
