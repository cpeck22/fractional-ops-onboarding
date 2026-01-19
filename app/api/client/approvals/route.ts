import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Admin emails that can impersonate clients
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status
    const playCategory = searchParams.get('category'); // Filter by play category
    const impersonateUserId = searchParams.get('impersonate'); // Check for impersonation

    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin access if impersonating
    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
    }

    // Check for impersonation - if admin is impersonating, use impersonated user's data
    const effectiveUserId = impersonateUserId || user.id;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query
    let query = supabaseAdmin
      .from('play_executions')
      .select(`
        *,
        claire_plays (
          code,
          name,
          category
        ),
        play_approvals (
          id,
          shareable_token,
          status,
          due_date,
          approved_at,
          rejected_at,
          comments
        )
      `)
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (playCategory) {
      query = query.eq('claire_plays.category', playCategory);
    }

    const { data: executions, error } = await query;

    if (error) {
      console.error('Error fetching approvals:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch approvals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      executions: executions || []
    });

  } catch (error: any) {
    console.error('❌ Error fetching approvals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approvals', details: error.message },
      { status: 500 }
    );
  }
}

