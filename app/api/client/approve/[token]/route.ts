import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString()
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
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

    // Verify user owns this execution
    if (approval.play_executions.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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

