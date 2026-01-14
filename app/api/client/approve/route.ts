import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, dueDate } = body;

    if (!executionId) {
      return NextResponse.json(
        { success: false, error: 'executionId is required' },
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

    // Verify execution belongs to user
    const { data: execution, error: execError } = await supabaseAdmin
      .from('play_executions')
      .select('*, claire_plays(*)')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single();

    if (execError || !execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Update execution status to pending_approval
    const { error: updateError } = await supabaseAdmin
      .from('play_executions')
      .update({ status: 'pending_approval' })
      .eq('id', executionId);

    if (updateError) {
      console.error('Error updating execution:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update execution' },
        { status: 500 }
      );
    }

    // Create approval record
    const shareableToken = randomUUID();
    const defaultDueDate = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('play_approvals')
      .insert({
        execution_id: executionId,
        shareable_token: shareableToken,
        status: 'pending',
        due_date: defaultDueDate
      })
      .select('*')
      .single();

    if (approvalError) {
      console.error('Error creating approval:', approvalError);
      return NextResponse.json(
        { success: false, error: 'Failed to create approval' },
        { status: 500 }
      );
    }

    // Send email notification to ali.hassan@fractionalops.com
    try {
      const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_APPROVAL_NOTIFICATION || 'https://hooks.zapier.com/hooks/catch/placeholder/';
      
      if (zapierWebhookUrl && !zapierWebhookUrl.includes('placeholder')) {
        await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: user.email,
            clientName: execution.company_name || 'Unknown',
            playCode: execution.claire_plays?.code || 'Unknown',
            playName: execution.claire_plays?.name || 'Unknown',
            executionId: executionId,
            approvalToken: shareableToken,
            dueDate: defaultDueDate,
            createdAt: new Date().toISOString()
          })
        });
        console.log('✅ Approval notification sent to Zapier');
      } else {
        console.warn('⚠️ Zapier webhook URL not configured - using placeholder (no email sent)');
      }
    } catch (emailError) {
      console.error('Error sending approval notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      approval: {
        id: approval.id,
        shareableToken: shareableToken,
        dueDate: defaultDueDate
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create approval', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { approvalId, status, comments, approverEmail } = body;

    if (!approvalId || !status) {
      return NextResponse.json(
        { success: false, error: 'approvalId and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieHeader || cookieStore.toString()
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

    // Verify approval belongs to user's execution
    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('play_approvals')
      .select(`
        *,
        play_executions!inner (
          user_id,
          claire_plays (*)
        )
      `)
      .eq('id', approvalId)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      );
    }

    // Check if user owns the execution
    if (approval.play_executions.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update approval
    const updateData: any = {
      status,
      approver_email: approverEmail || user.email,
      approver_user_id: user.id,
      comments: comments || null
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejection_reason = comments || 'Rejected by user';
    }

    const { data: updatedApproval, error: updateError } = await supabaseAdmin
      .from('play_approvals')
      .update(updateData)
      .eq('id', approvalId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating approval:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update approval' },
        { status: 500 }
      );
    }

    // Update execution status
    await supabaseAdmin
      .from('play_executions')
      .update({ 
        status: status === 'approved' ? 'approved' : 'rejected',
        approved_at: status === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', approval.play_executions.id);

    return NextResponse.json({
      success: true,
      approval: updatedApproval
    });

  } catch (error: any) {
    console.error('❌ Error updating approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update approval', details: error.message },
      { status: 500 }
    );
  }
}

