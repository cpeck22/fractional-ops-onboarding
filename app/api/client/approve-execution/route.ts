import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// Direct approve endpoint (skip approval page)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { executionId, playCode, playName, editedOutput } = body;

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

    // Verify execution belongs to user
    const { data: execution, error: execError } = await supabaseAdmin
      .from('play_executions')
      .select('*, claire_plays(*)')
      .eq('id', executionId)
      .eq('user_id', effectiveUserId)
      .single();

    if (execError || !execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Get user profile for company info
    const { data: workspaceData } = await supabaseAdmin
      .from('octave_outputs')
      .select('company_name')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Update execution status to approved
    const { error: updateError } = await supabaseAdmin
      .from('play_executions')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', executionId);

    if (updateError) {
      console.error('Error updating execution:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update execution' },
        { status: 500 }
      );
    }

    // Send notification to GTM Engineer via Zapier
    try {
      const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_APPROVAL_NOTIFICATION || 'https://hooks.zapier.com/hooks/catch/23854516/uqv6s35/';
      
      if (zapierWebhookUrl) {
        await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientEmail: user.email,
            clientName: workspaceData?.company_name || 'Unknown',
            playCode: playCode || execution.claire_plays?.code || 'Unknown',
            playName: playName || execution.claire_plays?.name || 'Unknown',
            executionId: executionId,
            editedOutput: editedOutput,
            approvedAt: new Date().toISOString(),
            approvedBy: user.email
          })
        });
        console.log('✅ Approval notification sent to GTM Engineer via Zapier');
      } else {
        console.warn('⚠️ Zapier webhook URL not configured - no notification sent');
      }
    } catch (emailError) {
      console.error('Error sending approval notification:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      execution: {
        id: execution.id,
        status: 'approved'
      }
    });

  } catch (error: any) {
    console.error('❌ Error approving execution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve execution', details: error.message },
      { status: 500 }
    );
  }
}
