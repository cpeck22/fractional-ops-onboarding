import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

// CRITICAL: Force dynamic rendering - prevents Next.js/Vercel from caching this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // ✅ FIX: Use the NEW output values from frontend, don't preserve old ones
    // The frontend explicitly sets highlighted_html: null when user edits
    // We MUST respect that and not overwrite with old values
    const newOutput = typeof output === 'string' 
      ? { content: output, jsonContent: {} }
      : output;
    
    // Update execution output - use NEW values from frontend
    const updateData: any = {
      output: newOutput, // ✅ Use exactly what frontend sends (including null values)
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

/**
 * DELETE - Delete an execution (only allowed for drafts)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;

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

    console.log(`🗑️ DELETE request for execution: ${executionId}, user: ${effectiveUserId}, admin: ${user.email}`);

    // Verify execution belongs to user (or impersonated user) and is a draft
    const { data: existingExecution, error: verifyError } = await supabaseAdmin
      .from('play_executions')
      .select('id, user_id, status')
      .eq('id', executionId)
      .eq('user_id', effectiveUserId)
      .single();

    if (verifyError) {
      console.error(`❌ Error verifying execution ${executionId}:`, verifyError);
      // Check if it's a "not found" error (PGRST116) or other error
      if (verifyError.code === 'PGRST116') {
        console.log(`⚠️ Execution ${executionId} not found - may already be deleted`);
        return NextResponse.json(
          { success: false, error: 'Execution not found or already deleted' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Execution not found or unauthorized', details: verifyError.message },
        { status: 404 }
      );
    }

    if (!existingExecution) {
      console.log(`⚠️ Execution ${executionId} not found for user ${effectiveUserId}`);
      return NextResponse.json(
        { success: false, error: 'Execution not found or unauthorized' },
        { status: 404 }
      );
    }

    console.log(`📋 Execution found: ${executionId}, status: ${existingExecution.status}, user: ${existingExecution.user_id}`);

    // Only allow deletion of drafts
    if (existingExecution.status !== 'draft') {
      console.log(`⚠️ Attempted to delete non-draft execution ${executionId} with status: ${existingExecution.status}`);
      return NextResponse.json(
        { success: false, error: 'Only draft executions can be deleted' },
        { status: 400 }
      );
    }

    // Delete the execution (cascade will handle related records like play_approvals)
    const { error: deleteError, data: deleteData } = await supabaseAdmin
      .from('play_executions')
      .delete()
      .eq('id', executionId)
      .eq('user_id', effectiveUserId) // Double-check user ownership
      .select();

    if (deleteError) {
      console.error(`❌ Error deleting execution ${executionId}:`, deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete execution', details: deleteError.message },
        { status: 500 }
      );
    }

    // Verify deletion actually happened
    if (!deleteData || deleteData.length === 0) {
      console.error(`⚠️ Delete returned no rows for execution ${executionId} - may not have existed or already deleted`);
      // Verify if it still exists
      const { data: stillExists } = await supabaseAdmin
        .from('play_executions')
        .select('id')
        .eq('id', executionId)
        .single();
      
      if (stillExists) {
        console.error(`❌ Execution ${executionId} still exists after delete attempt!`);
        return NextResponse.json(
          { success: false, error: 'Delete operation did not complete successfully' },
          { status: 500 }
        );
      } else {
        console.log(`✅ Execution ${executionId} was already deleted or never existed`);
        return NextResponse.json({
          success: true,
          message: 'Execution deleted successfully'
        });
      }
    }

    console.log(`✅ Execution deleted successfully: ${executionId}, deleted rows: ${deleteData.length}`);
    
    // Double-check deletion by querying again
    const { data: verifyDeleted } = await supabaseAdmin
      .from('play_executions')
      .select('id')
      .eq('id', executionId)
      .single();
    
    if (verifyDeleted) {
      console.error(`❌ CRITICAL: Execution ${executionId} still exists after delete!`);
      return NextResponse.json(
        { success: false, error: 'Delete operation did not complete successfully' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Execution deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Error deleting execution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete execution', details: error.message },
      { status: 500 }
    );
  }
}
