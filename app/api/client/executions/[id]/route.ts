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

/**
 * GET - Fetch a specific execution by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'Execution ID is required' },
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

    // Check for impersonation - if admin is impersonating, verify admin access
    let effectiveUserId = user.id;
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
      effectiveUserId = impersonateUserId;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch execution
    const { data: execution, error: executionError } = await supabaseAdmin
      .from('play_executions')
      .select(`
        *,
        claire_plays (
          code,
          name,
          category
        )
      `)
      .eq('id', executionId)
      .eq('user_id', effectiveUserId)
      .single();

    if (executionError || !execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution: {
        id: execution.id,
        output: execution.output,
        status: execution.status,
        runtime_context: execution.runtime_context,
        created_at: execution.created_at,
        executed_at: execution.executed_at,
        play: execution.claire_plays
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching execution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch execution', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update execution output (for saving drafts)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const body = await request.json();
    const { output, status } = body;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'Execution ID is required' },
        { status: 400 }
      );
    }

    if (!output) {
      return NextResponse.json(
        { success: false, error: 'Output is required' },
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check for impersonation - if admin is impersonating, verify admin access
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    let effectiveUserId = user.id;
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
      effectiveUserId = impersonateUserId;
    }

    // Verify execution belongs to user (or impersonated user)
    const { data: existingExecution, error: verifyError } = await supabaseAdmin
      .from('play_executions')
      .select('id, user_id')
      .eq('id', executionId)
      .eq('user_id', effectiveUserId)
      .single();

    if (verifyError || !existingExecution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update execution output
    const updateData: any = {
      output: typeof output === 'string' 
        ? { content: output, jsonContent: {} }
        : output,
      updated_at: new Date().toISOString()
    };

    if (status) {
      updateData.status = status;
    }

    const { data: updatedExecution, error: updateError } = await supabaseAdmin
      .from('play_executions')
      .update(updateData)
      .eq('id', executionId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Error updating execution:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update execution' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      execution: {
        id: updatedExecution.id,
        output: updatedExecution.output,
        status: updatedExecution.status
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating execution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update execution', details: error.message },
      { status: 500 }
    );
  }
}

