import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

const CONTEXT_AGENT_ID = 'ca_z4M5gc4srgrZ4NrhOCBFA';
const OCTAVE_CONTEXT_AGENT_URL = 'https://app.octavehq.com/api/v2/agents/context/run';

function formatConversationHistory(conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>, newMessage: string): string {
  let formatted = '';
  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      formatted += `workspace user: ${msg.content}\n\n`;
    } else {
      formatted += `context agent: ${msg.content}\n\n`;
    }
  }
  formatted += `workspace user: ${newMessage}\n\n`;
  formatted += '[this was the last message the user prompted. Please assist the user while taking into consideration the entire conversation thread.]';
  return formatted;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    let effectiveUserId = user.id;

    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required for impersonation' }, { status: 403 });
      }
      effectiveUserId = impersonateUserId;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (workspaceError) {
      console.error('❌ Error fetching workspace:', {
        error: workspaceError.message,
        effectiveUserId,
        impersonateUserId,
        isImpersonating: !!impersonateUserId
      });
      return NextResponse.json(
        { success: false, error: 'Failed to fetch workspace data', details: workspaceError.message },
        { status: 500 }
      );
    }

    if (!workspaceData?.workspace_api_key) {
      const errorMsg = impersonateUserId 
        ? `No workspace found for impersonated user ${impersonateUserId}. Please ensure the user has completed onboarding.`
        : 'Claire API key missing, please contact Fractional Ops to fix.';
      console.error('❌ No workspace API key found:', {
        effectiveUserId,
        impersonateUserId,
        hasWorkspaceData: !!workspaceData,
        isImpersonating: !!impersonateUserId
      });
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 404 }
      );
    }

    const workspaceApiKey = workspaceData.workspace_api_key;
    const query = formatConversationHistory(conversationHistory, message);

    // Find Context Agent in the workspace (it gets duplicated, so we need to find the workspace-specific ID)
    let contextAgentId = CONTEXT_AGENT_ID; // Fallback to template ID
    
    try {
      const agentsResponse = await axios.get(
        'https://app.octavehq.com/api/v2/agents/list',
        {
          headers: {
            'Content-Type': 'application/json',
            'api_key': workspaceApiKey
          },
          params: { limit: 100 }
        }
      );

      const allAgents = agentsResponse.data?.data || agentsResponse.data?.agents || [];
      
      // Look for Context Agent - it might be named with "context" or have the template ID pattern
      const contextAgent = allAgents.find((agent: any) => {
        const agentName = (agent.name || '').toLowerCase();
        const agentType = (agent.type || '').toLowerCase();
        return agentName.includes('context') || 
               agentType === 'context' ||
               agent.oId === CONTEXT_AGENT_ID;
      });

      if (contextAgent) {
        contextAgentId = contextAgent.oId;
        console.log(`✅ Found Context Agent in workspace: ${contextAgent.name} (${contextAgentId})`);
      } else {
        console.warn(`⚠️ Context Agent not found in workspace, using template ID: ${CONTEXT_AGENT_ID}`);
      }
    } catch (agentError: any) {
      console.warn('⚠️ Error finding Context Agent, using template ID:', agentError.message);
      // Continue with template ID as fallback
    }

    const response = await axios.post(
      OCTAVE_CONTEXT_AGENT_URL,
      {
        agentOId: contextAgentId,
        query: query,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api_key': workspaceApiKey,
        },
      }
    );

    const responseText = response.data?.output || response.data?.text || response.data?.message || JSON.stringify(response.data);

    return NextResponse.json({ success: true, response: responseText });
  } catch (error: any) {
    console.error('❌ Ask Claire API error:', error);
    if (error.response) {
      return NextResponse.json(
        { success: false, error: error.response.data?.message || error.response.data?.error || 'Failed to get response from Claire', details: error.response.data },
        { status: error.response.status || 500 }
      );
    }
    return NextResponse.json({ success: false, error: error.message || 'Unknown error occurred' }, { status: 500 });
  }
}
