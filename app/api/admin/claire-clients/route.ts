import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users who have workspaces (from octave_outputs)
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('user_id, company_name, workspace_api_key, created_at')
      .order('created_at', { ascending: false });

    if (workspaceError) {
      console.error('Error loading workspace data:', workspaceError);
      return NextResponse.json(
        { success: false, error: 'Failed to load workspace data' },
        { status: 500 }
      );
    }

    // Get unique user IDs from workspaces
    const uniqueUserIds = Array.from(new Set(workspaceData?.map(w => w.user_id) || []));

    // Get all executions to count play executions per user
    const { data: executions, error: execError } = await supabaseAdmin
      .from('play_executions')
      .select('user_id');

    if (execError) {
      console.error('Error loading executions:', execError);
      // Continue without execution counts if this fails
    }

    // Create execution count map
    const executionCountMap: Record<string, number> = {};
    executions?.forEach(e => {
      executionCountMap[e.user_id] = (executionCountMap[e.user_id] || 0) + 1;
    });

    // Get all user emails
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error loading users:', usersError);
      return NextResponse.json(
        { success: false, error: 'Failed to load users' },
        { status: 500 }
      );
    }

    // Create email map
    const userEmailsMap: Record<string, string> = {};
    users?.forEach(u => {
      if (u.email) {
        userEmailsMap[u.id] = u.email;
      }
    });

    // Get company info for each user with workspace
    const clientsData = [];
    
    for (const userId of uniqueUserIds) {
      // Get the most recent workspace data for this user
      const userWorkspace = workspaceData?.find(w => w.user_id === userId);
      
      // Count executions for this user
      const executionsCount = executionCountMap[userId] || 0;

      clientsData.push({
        user_id: userId,
        email: userEmailsMap[userId] || 'Unknown',
        company_name: userWorkspace?.company_name || null,
        executions_count: executionsCount,
        has_workspace: !!userWorkspace?.workspace_api_key
      });
    }

    // Sort by execution count (most active first), then by company name
    clientsData.sort((a, b) => {
      if (b.executions_count !== a.executions_count) {
        return b.executions_count - a.executions_count;
      }
      return (a.company_name || '').localeCompare(b.company_name || '');
    });

    return NextResponse.json({
      success: true,
      clients: clientsData
    });

  } catch (error: any) {
    console.error('❌ Error fetching clients:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients', details: error.message },
      { status: 500 }
    );
  }
}

