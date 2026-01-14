import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      playCode,
      runtimeContext, // { personas: [], useCases: [], clientReferences: [], customInput: "" }
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
    
    // Get workspace API key and play details
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid, company_name, company_domain')
      .eq('user_id', user.id)
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
      // If refining, use the refinement prompt, otherwise use customInput
      customInput: refinementPrompt || runtimeContext.customInput || '',
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
    const output = {
      content: agentResponse.data?.content || '',
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
      // Create play record if it doesn't exist in DB
      const { data: newPlay, error: createPlayError } = await supabaseAdmin
        .from('claire_plays')
        .insert({
          code: playCode,
          name: `Play ${playCode}`, // Will be updated by admin later
          category: playCode.startsWith('0') ? 'allbound' : playCode.startsWith('1') ? 'nurture' : 'outbound',
          agent_name_pattern: playCode,
          is_active: true
        })
        .select('id')
        .single();
      
      if (!createPlayError && newPlay) {
        playId = newPlay.id;
      }
    }
    
    // Save execution to database
    const { data: execution, error: executionError } = await supabaseAdmin
      .from('play_executions')
      .insert({
        user_id: user.id,
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

