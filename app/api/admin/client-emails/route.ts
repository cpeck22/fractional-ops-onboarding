import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (you may want to add admin role check here)
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to get all users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Create a map of user_id -> email
    const emailsMap: Record<string, string> = {};
    users?.forEach(u => {
      if (u.email) {
        emailsMap[u.id] = u.email;
      }
    });

    return NextResponse.json({
      success: true,
      emails: emailsMap
    });

  } catch (error: any) {
    console.error('❌ Error fetching client emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch emails', details: error.message },
      { status: 500 }
    );
  }
}

