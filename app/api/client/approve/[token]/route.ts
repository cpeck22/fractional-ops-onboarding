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

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for impersonation parameter
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    
    // Verify admin access if impersonating
    let isAdminImpersonating = false;
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
      isAdminImpersonating = true;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find approval by token
    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('play_approvals')
      .select(`
        *,
        play_executions!inner (
          *,
          claire_plays (
            code,
            name,
            category
          )
        )
      `)
      .eq('shareable_token', token)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      );
    }

    // Verify user owns this execution OR admin is impersonating the owner
    const executionOwnerId = approval.play_executions.user_id;
    const effectiveUserId = impersonateUserId || user.id;
    
    if (!isAdminImpersonating && executionOwnerId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // If admin is impersonating, verify the impersonated user owns the execution
    if (isAdminImpersonating && executionOwnerId !== impersonateUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Execution does not belong to impersonated user' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      execution: approval.play_executions,
      approval: {
        id: approval.id,
        status: approval.status,
        due_date: approval.due_date,
        comments: approval.comments,
        approved_at: approval.approved_at,
        rejected_at: approval.rejected_at
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approval', details: error.message },
      { status: 500 }
    );
  }
}

