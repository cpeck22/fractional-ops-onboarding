import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

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

    // Get all executions to find unique clients
    const { data: executions, error: execError } = await supabaseAdmin
      .from('play_executions')
      .select('user_id')
      .order('created_at', { ascending: false });

    if (execError) {
      console.error('Error loading executions:', execError);
      return NextResponse.json(
        { success: false, error: 'Failed to load executions' },
        { status: 500 }
      );
    }

    // Get unique user IDs
    const uniqueUserIds = Array.from(new Set(executions?.map(e => e.user_id) || []));

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

    // Get company info for each user
    const clientsData = [];
    
    for (const userId of uniqueUserIds) {
      // Get company info from octave_outputs
      const { data: workspaceData } = await supabaseAdmin
        .from('octave_outputs')
        .select('company_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Count executions for this user
      const executionsCount = executions?.filter(e => e.user_id === userId).length || 0;

      clientsData.push({
        user_id: userId,
        email: userEmailsMap[userId] || 'Unknown',
        company_name: workspaceData?.company_name || null,
        executions_count: executionsCount
      });
    }

    // Sort by execution count (most active first)
    clientsData.sort((a, b) => b.executions_count - a.executions_count);

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

