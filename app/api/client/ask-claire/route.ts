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
      .select('workspace_api_key, workspace_context_agent_id, service_offering')
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
    const contextAgentId = workspaceData.workspace_context_agent_id;
    const query = formatConversationHistory(conversationHistory, message);

    // Use stored Context Agent ID from database (set during workspace creation)
    if (!contextAgentId) {
      console.error('❌ Context Agent ID not found in workspace data');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Context Agent not configured for your workspace. Please contact Fractional Ops to regenerate your workspace.'
        },
        { status: 404 }
      );
    }

    console.log(`✅ Using stored Context Agent ID: ${contextAgentId}`);
    
    // Build request body - Context Agent API needs serviceOId to link agent to service
    const requestBody: any = {
      agentOId: contextAgentId,
      query: query,
    };
    
    // Extract serviceOId from service_offering (we use Service, not Product)
    const serviceOId = workspaceData?.service_offering?.oId;
    if (serviceOId) {
      requestBody.serviceOId = serviceOId;
      console.log(`✅ Including serviceOId: ${serviceOId}`);
    } else {
      console.warn('⚠️ No serviceOId found in service_offering - Context Agent may not be linked to service');
    }

    // Log full request details
    console.log('📤 FULL OCTAVE API REQUEST:');
    console.log('URL:', OCTAVE_CONTEXT_AGENT_URL);
    console.log('Headers:', {
      'Content-Type': 'application/json',
      'api_key': workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...${workspaceApiKey.substring(workspaceApiKey.length - 4)}` : 'MISSING'
    });
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(
      OCTAVE_CONTEXT_AGENT_URL,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'api_key': workspaceApiKey,
        },
      }
    );

    // Log full response details
    console.log('📥 FULL OCTAVE API RESPONSE:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    // Extract Request ID from response (check headers and data)
    const requestId = response.headers['x-request-id'] 
      || response.headers['request-id'] 
      || response.headers['X-Request-ID']
      || response.headers['Request-ID']
      || response.data?.requestId 
      || response.data?.request_id 
      || response.data?.requestID
      || response.data?.data?.requestId
      || response.data?.metadata?.requestId
      || response.data?.metadata?.request_id
      || response.data?.metadata?.requestID
      || null;

    // Log Request ID for debugging/tracking
    console.log('🔍 REQUEST ID SEARCH:');
    console.log('  Checking headers:', {
      'x-request-id': response.headers['x-request-id'],
      'request-id': response.headers['request-id'],
      'X-Request-ID': response.headers['X-Request-ID'],
      'Request-ID': response.headers['Request-ID']
    });
    console.log('  Checking response.data:', {
      requestId: response.data?.requestId,
      request_id: response.data?.request_id,
      requestID: response.data?.requestID
    });
    if (response.data?.metadata) {
      console.log('  Checking response.data.metadata:', JSON.stringify(response.data.metadata, null, 2));
    }
    if (response.data?.data) {
      console.log('  Checking response.data.data:', {
        requestId: response.data.data.requestId,
        keys: Object.keys(response.data.data || {})
      });
    }
    
    if (requestId) {
      console.log(`✅ Octave Request ID Found: ${requestId}`);
    } else {
      console.log(`❌ Octave Request ID not found in response.`);
      console.log('  All Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('  All Response Data:', JSON.stringify(response.data, null, 2));
    }

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
