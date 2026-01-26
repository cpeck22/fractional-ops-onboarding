import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
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

const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

// Hardcoded play list - matches the requirements document (same as plays route)
const HARDCODED_PLAYS = [
  // Allbound Plays (0000 codes)
  { code: '0001', name: 'Activities_Post-Call → Email Draft', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0002', name: 'Activities_Website Visitor → Helpful Outreach', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'In Progress' },
  { code: '0003', name: 'Activities_New Decision-Maker → Help Their Change', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
  { code: '0004', name: 'Activities_Funding Event → Real Value Outreach (SKIPPED)', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Completed' },
  { code: '0005', name: "Competitor's Client Growing → Provide Alternative", category: 'allbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
  { code: '0006', name: 'Prospect Job Change → Help Their Change', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'In Progress' },
  { code: '0007', name: 'Pricing Page → Proactive Objection Handling', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  { code: '0008', name: 'Discovery Meeting → Full Call Prep', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'REQUIRED' },
  { code: '0009', name: 'Meeting Confirmation → VSL', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'In Progress' },
  { code: '0010', name: 'Post-Call → Email Draft', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0011', name: 'Call Prep → Follow-up Meeting', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'REQUIRED' },
  { code: '0012', name: 'No-Show → Recovery Message', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'In Progress' },
  { code: '0013', name: 'Call Finished → Recap In CRM', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0014', name: 'Objections In Email → Draft Response', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'REQUIRED' },
  { code: '0015', name: 'Meeting → Automatically Assigned CRM To-Dos', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0016', name: 'Competitor Client New Exec → Provide Alternative', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'In Progress' },
  { code: '0017', name: 'New Job Posting with Intent Trigger Key-Words -> Warm Outreach', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
  { code: '0018', name: 'Trigify Evergreen Campaign', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  { code: '0019', name: 'Trigify Competitor Campaign', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  { code: '0020', name: 'Trigify LinkedIn Search Campaign', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  { code: '0021', name: 'Claire Call Review for Meetings with Prospects/Clients', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  
  // Nurture Plays (1000 codes)
  { code: '1001', name: "Books a meeting but doesn't show", category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1002', name: 'Books a meeting and asks for a quote/proposal, but ghosts', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1003', name: 'Meeting completed but unresponsive for 30 days', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1004', name: 'Closed/Lost deal beyond 60 days old', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1005', name: 'Existing Client Cross sell', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1006', name: 'Reaching out to COIs about affiliate program', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1007', name: 'Organizing a local in-person client dinner', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1008', name: 'Beta testing a new service/product/software', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1009', name: 'Lead generated, no meeting booked, unresponsive for 3 days', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'In Progress' },
  { code: '1010', name: 'Completes outbound campaign sequence, unresponsive for 7 days', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1011', name: 'Warm Lead Bad Timing → Nurture', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1012', name: 'Leads Not Subscribers → Convert To Subscribers', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1013', name: 'End of Month → Personalized Special Offer', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1014', name: 'Mid-Funnel → Report and Reply', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1015', name: "Lead Heatmap → Auto-Prioritization Engine - Claire's Top 10", category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1018', name: 'Happy Client → Ask for Video Testimonial', category: 'nurture', documentation_status: 'Not Started', content_agent_status: 'In Progress' },
  
  // Outbound Plays (2000 codes)
  { code: '2001', name: 'Problem & Solution Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2002', name: 'Lead Magnet Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2003', name: 'Look-Alike Company Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2004', name: 'Look-Alike Role Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2005', name: 'Centres of Influence → Get Strategic or Referral Partners', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2007', name: 'Local/Same City In Common Focus', category: 'outbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      playCode,
      runtimeContext, // { personas: [], useCases: [], clientReferences: [] }
      refinementPrompt // Optional: if refining existing execution
    } = body;
    
    if (!playCode || !runtimeContext) {
      return NextResponse.json(
        { success: false, error: 'playCode and runtimeContext are required' },
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

    // Get workspace API key and play details
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid, company_name, company_domain')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (workspaceError || !workspaceData?.workspace_api_key) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Claire API key missing, please contact Fractional Ops to fix.'
        },
        { status: 404 }
      );
    }
    
    const workspaceApiKey = workspaceData.workspace_api_key;
    
    // Get play details
    const { data: playData } = await supabaseAdmin
      .from('claire_plays')
      .select('*')
      .eq('code', playCode)
      .eq('is_active', true)
      .single();
    
    // Find agent by code pattern
    let agentOId = null;
    let agentName = null;
    
    try {
      // List agents with pagination
      const allAgents = [];
      let offset = 0;
      const limit = 50;
      let hasNext = true;
      
      while (hasNext) {
        const response = await axios.get(
          'https://app.octavehq.com/api/v2/agents/list',
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            },
            params: {
              offset,
              limit,
              orderField: 'createdAt',
              orderDirection: 'DESC'
            }
          }
        );
        
        const pageAgents = response.data?.data || [];
        allAgents.push(...pageAgents);
        hasNext = response.data?.hasNext || false;
        offset += limit;
        
        if (!hasNext) break;
      }
      
      // Search for agent matching play code
      const codePattern = playCode.toLowerCase();
      
      // Try exact match at start first
      let matchedAgent = allAgents.find((agent: any) => {
        const agentName = (agent.name || '').toLowerCase();
        return agentName.startsWith(codePattern + '_') || agentName.startsWith(codePattern + ' ');
      });
      
      // Fallback: code anywhere in name
      if (!matchedAgent) {
        matchedAgent = allAgents.find((agent: any) => {
          const agentName = (agent.name || '').toLowerCase();
          return agentName.includes(codePattern);
        });
      }
      
      if (matchedAgent) {
        agentOId = matchedAgent.oId;
        agentName = matchedAgent.name;
        console.log(`✅ Found agent: ${agentName} (${agentOId}) for play ${playCode}`);
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: `No agent found matching play code "${playCode}" in your workspace. Please contact Fractional Ops to set up this play.`
          },
          { status: 404 }
        );
      }
    } catch (agentError: any) {
      console.error('❌ Error finding agent:', agentError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to find agent in workspace',
          details: agentError.message
        },
        { status: 500 }
      );
    }
    
    // Build runtime context for Octave Content Agent
    // The Content Agent API accepts runtimeContext as a JSON object
    const octaveRuntimeContext: any = {
      // Include selected personas, use cases, references
      selectedPersonas: runtimeContext.personas || [],
      selectedUseCases: runtimeContext.useCases || [],
      selectedReferences: runtimeContext.clientReferences || [],
      // Only include customInput if this is a refinement (refinementPrompt provided)
      // For initial execution, the agent uses personas/useCases/references to generate content
      ...(refinementPrompt && { customInput: refinementPrompt }),
      // Flag to indicate this is a refinement
      isRefinement: !!refinementPrompt
    };
    
    // Build customContext for Content Agent (if we have specific IDs)
    const customContext: any = {};
    
    if (runtimeContext.personas && runtimeContext.personas.length > 0) {
      // Use first persona if single select, or all if multi-select
      const personaIds = runtimeContext.personas.map((p: any) => p.oId).filter(Boolean);
      if (personaIds.length > 0) {
        // Note: Content Agent API expects persona in customContext, but structure may vary
        // We'll include it in runtimeContext for now
      }
    }
    
    // Call Octave Content Agent API
    console.log(`🚀 Executing play ${playCode} with agent ${agentOId}...`);
    
    const contentAgentRequest = {
      agentOId: agentOId,
      runtimeContext: JSON.stringify(octaveRuntimeContext), // Octave expects stringified JSON
      // Optional: include prospect/contact info if available
      email: null,
      companyDomain: workspaceData.company_domain || null,
      companyName: workspaceData.company_name || null,
      firstName: null,
      jobTitle: null,
      linkedInProfile: null,
      customContext: customContext
    };
    
    let agentResponse;
    try {
      const response = await axios.post(
        `${OCTAVE_BASE_URL}/generate-content/run`,
        contentAgentRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'api_key': workspaceApiKey
          },
          timeout: 120000 // 2 minute timeout for agent execution
        }
      );
      
      agentResponse = response.data;
      
      if (!agentResponse.found || !agentResponse.data) {
        throw new Error('Agent execution failed or returned no data');
      }
      
      console.log('✅ Agent execution successful');
      
    } catch (agentExecError: any) {
      console.error('❌ Agent execution error:', agentExecError.response?.data || agentExecError.message);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to execute agent',
          details: agentExecError.response?.data?.message || agentExecError.message
        },
        { status: 500 }
      );
    }
    
    // Extract output from agent response
    const rawOutputContent = agentResponse.data?.content || '';
    
    // Save execution immediately (without highlighting to avoid timeout)
    const output = {
      content: rawOutputContent,
      highlighted_html: rawOutputContent, // Initially same as content, will be updated async
      jsonContent: agentResponse.data?.jsonContent || {},
      // Include matched context for reference
      matchedPersona: agentResponse.data?.persona || null,
      matchedUseCases: agentResponse.data?.useCases || [],
      matchedReferences: agentResponse.data?.referenceCustomers || []
    };
    
    // Get or create play record
    let playId = null;
    if (playData) {
      playId = playData.id;
    } else {
      // Find hardcoded play data for this code
      const hardcodedPlay = HARDCODED_PLAYS.find(p => p.code === playCode);
      
      // Create play record if it doesn't exist in DB, using hardcoded data if available
      const { data: newPlay, error: createPlayError } = await supabaseAdmin
        .from('claire_plays')
        .insert({
          code: playCode,
          name: hardcodedPlay?.name || `Play ${playCode}`,
          category: hardcodedPlay?.category || (playCode.startsWith('0') ? 'allbound' : playCode.startsWith('1') ? 'nurture' : 'outbound'),
          agent_name_pattern: playCode,
          documentation_status: hardcodedPlay?.documentation_status || null,
          content_agent_status: hardcodedPlay?.content_agent_status || null,
          is_active: true
        })
        .select('id')
        .single();
      
      if (!createPlayError && newPlay) {
        playId = newPlay.id;
      }
    }
    
    // Save execution to database (use effectiveUserId for impersonation)
    const { data: execution, error: executionError } = await supabaseAdmin
      .from('play_executions')
      .insert({
        user_id: effectiveUserId, // Use impersonated user's ID if admin is impersonating
        play_id: playId,
        workspace_api_key: workspaceApiKey,
        workspace_oid: workspaceData.workspace_oid,
        runtime_context: runtimeContext,
        agent_o_id: agentOId,
        agent_name: agentName,
        output: output,
        status: 'draft',
        executed_at: new Date().toISOString()
      })
      .select('*')
      .single();
    
    if (executionError) {
      console.error('❌ Error saving execution:', executionError);
      // Don't fail the request, just log the error
    }
    
    // Trigger highlighting asynchronously (fire and forget) to avoid timeout
    // This runs in the background and updates the execution when complete
    if (execution?.id) {
      console.log(`🎨 Starting async highlighting for execution ${execution.id}, play ${playCode}`);
      // Don't await - let this run in background
      (async () => {
        try {
          console.log(`📋 Fetching workspace data for highlighting (user: ${effectiveUserId})...`);
          // Fetch full workspace data to get persona/use case details for highlighting
          const { data: fullWorkspaceData, error: workspaceError } = await supabaseAdmin
            .from('octave_outputs')
            .select('personas, use_cases, client_references')
            .eq('user_id', effectiveUserId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (workspaceError) {
            console.error(`❌ Error fetching workspace data for highlighting:`, workspaceError);
            throw workspaceError;
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
          console.log(`📝 Output content length: ${rawOutputContent.length} characters`);
          console.log(`🔍 Play code: ${playCode}`);
          
          const highlightedHtml = await highlightOutput(rawOutputContent, highlightingContext, playCode);
          
          console.log(`✅ Highlighting completed, result length: ${highlightedHtml.length} characters`);
          console.log(`🔍 Checking if highlights were applied: ${hasHighlights(highlightedHtml) ? 'YES' : 'NO'}`);
          
          // Update execution with highlighted version
          const { error: updateError } = await supabaseAdmin
            .from('play_executions')
            .update({
              output: {
                ...output,
                highlighted_html: highlightedHtml
              }
            })
            .eq('id', execution.id);
          
          if (updateError) {
            console.error(`❌ Error updating execution with highlighted HTML:`, updateError);
            throw updateError;
          }
          
          console.log(`✅ Output highlighted and saved asynchronously for execution ${execution.id}`);
        } catch (highlightError: any) {
          console.error(`❌ Error highlighting output in background for execution ${execution?.id}:`, highlightError.message);
          console.error(`   Stack:`, highlightError.stack);
          // Update execution with error status so frontend can show it
          try {
            await supabaseAdmin
              .from('play_executions')
              .update({
                output: {
                  ...output,
                  highlighting_error: highlightError.message,
                  highlighting_status: 'failed'
                }
              })
              .eq('id', execution.id);
            console.log(`⚠️ Saved highlighting error status to execution`);
          } catch (saveError: any) {
            console.error(`❌ Failed to save highlighting error status:`, saveError.message);
          }
        }
      })().catch(err => {
        console.error(`❌ Background highlighting task error for execution ${execution?.id}:`, err);
      });
    } else {
      console.warn(`⚠️ Cannot start highlighting: execution ID is missing`);
    }
    
    return NextResponse.json({
      success: true,
      execution: {
        id: execution?.id,
        output: output,
        agentName: agentName,
        executedAt: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error executing play:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute play', details: error.message },
      { status: 500 }
    );
  }
}

