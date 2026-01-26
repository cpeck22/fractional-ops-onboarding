import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { highlightOutput } from '@/lib/output-highlighting';
import { hasHighlights } from '@/lib/render-highlights';

export const dynamic = 'force-dynamic';

// Admin emails that can impersonate clients
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

/**
 * POST - Manually trigger highlighting for an execution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const executionId = params.id;
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');

    console.log(`🎨 Manual highlighting request for execution: ${executionId}`);

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

    // Check for impersonation
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
          name
        )
      `)
      .eq('id', executionId)
      .eq('user_id', effectiveUserId)
      .single();

    if (executionError || !execution) {
      console.error(`❌ Execution not found: ${executionId}`, executionError);
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    const playCode = execution.claire_plays?.code || null;
    const runtimeContext = execution.runtime_context || {};
    const rawOutputContent = execution.output?.content || '';

    console.log(`📋 Execution found: ${executionId}`);
    console.log(`   Play code: ${playCode || 'UNKNOWN'}`);
    console.log(`   Output length: ${rawOutputContent.length} characters`);
    console.log(`   Runtime context: ${runtimeContext.personas?.length || 0} personas, ${runtimeContext.useCases?.length || 0} use cases`);

    if (!rawOutputContent) {
      console.error(`❌ No output content to highlight`);
      return NextResponse.json(
        { success: false, error: 'No output content found to highlight' },
        { status: 400 }
      );
    }

    // Update status to "highlighting"
    await supabaseAdmin
      .from('play_executions')
      .update({
        output: {
          ...execution.output,
          highlighting_status: 'in_progress',
          highlighting_error: null
        }
      })
      .eq('id', executionId);

    // Fetch full workspace data
    console.log(`📋 Fetching workspace data for highlighting (user: ${effectiveUserId})...`);
    const { data: fullWorkspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('personas, use_cases, client_references')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (workspaceError) {
      console.error(`❌ Error fetching workspace data:`, workspaceError);
      await supabaseAdmin
        .from('play_executions')
        .update({
          output: {
            ...execution.output,
            highlighting_status: 'failed',
            highlighting_error: `Failed to fetch workspace data: ${workspaceError.message}`
          }
        })
        .eq('id', executionId);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch workspace data', details: workspaceError.message },
        { status: 500 }
      );
    }

    console.log(`📊 Workspace data loaded: ${fullWorkspaceData?.personas?.length || 0} personas, ${fullWorkspaceData?.use_cases?.length || 0} use cases, ${fullWorkspaceData?.client_references?.length || 0} references`);

    // Map runtime context to full details for highlighting
    const highlightingContext = {
      personas: runtimeContext.personas?.map((p: any) => {
        const fullPersona = fullWorkspaceData?.personas?.find((wp: any) => wp.oId === p.oId);
        return fullPersona || p;
      }) || [],
      useCases: runtimeContext.useCases?.map((uc: any) => {
        const fullUseCase = fullWorkspaceData?.use_cases?.find((wuc: any) => wuc.oId === uc.oId);
        return fullUseCase || uc;
      }) || [],
      clientReferences: runtimeContext.clientReferences?.map((r: any) => {
        const fullRef = fullWorkspaceData?.client_references?.find((wr: any) => wr.oId === r.oId);
        return fullRef || r;
      }) || []
    };

    console.log(`🎯 Highlighting context: ${highlightingContext.personas.length} personas, ${highlightingContext.useCases.length} use cases, ${highlightingContext.clientReferences.length} references`);
    console.log(`🔍 Starting highlighting with play code: ${playCode || 'GENERIC'}`);

    try {
      const highlightedHtml = await highlightOutput(rawOutputContent, highlightingContext, playCode || undefined);

      console.log(`✅ Highlighting completed, result length: ${highlightedHtml.length} characters`);
      const hasHighlightsResult = hasHighlights(highlightedHtml);
      console.log(`🔍 Highlights detected: ${hasHighlightsResult ? 'YES' : 'NO'}`);

      // Update execution with highlighted version
      const { error: updateError } = await supabaseAdmin
        .from('play_executions')
        .update({
          output: {
            ...execution.output,
            highlighted_html: highlightedHtml,
            highlighting_status: hasHighlightsResult ? 'completed' : 'completed_no_highlights',
            highlighting_error: null
          }
        })
        .eq('id', executionId);

      if (updateError) {
        console.error(`❌ Error updating execution with highlighted HTML:`, updateError);
        throw updateError;
      }

      console.log(`✅ Highlighting saved successfully for execution ${executionId}`);

      return NextResponse.json({
        success: true,
        message: 'Highlighting completed successfully',
        hasHighlights: hasHighlightsResult
      });

    } catch (highlightError: any) {
      console.error(`❌ Error during highlighting:`, highlightError.message);
      console.error(`   Stack:`, highlightError.stack);

      // Update execution with error status
      await supabaseAdmin
        .from('play_executions')
        .update({
          output: {
            ...execution.output,
            highlighting_status: 'failed',
            highlighting_error: highlightError.message
          }
        })
        .eq('id', executionId);

      return NextResponse.json(
        { 
          success: false, 
          error: 'Highlighting failed', 
          details: highlightError.message 
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error(`❌ Error in highlight endpoint:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger highlighting', details: error.message },
      { status: 500 }
    );
  }
}
