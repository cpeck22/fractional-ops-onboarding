import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

// Agent IDs from template workspace
const AGENT_IDS = {
  prospector: 'ca_lSWcHq7U7KboGGaaESrQX',
  sequence: 'ca_dobh4WdpkbFWQT8pJqJJg',
  callPrep: 'ca_1ikwfmH5JBxJbygNGlgoc',
  linkedinPost: 'ca_LpMPulsXSRPkhO9T2fJo8',
  newsletter: 'ca_oztYMqaYywqjiCZLjKWTs',
  linkedinDM: 'ca_R9tuDLXcizpmvV1ICjsyu'
};

export async function POST(request: NextRequest) {
  let agentType: string = 'unknown';
  let requestBody: any = {};
  
  try {
    const body = await request.json();
    const { 
      agentType: bodyAgentType,  // 'prospector', 'sequence', 'callPrep', 'linkedinPost', 'newsletter', 'linkedinDM'
      workspaceApiKey,
      companyDomain,
      companyName,
      firstName = '',
      email = '',
      jobTitle = '',
      linkedInProfile = '',
      runtimeContext = {},
      searchContext = {}, // Search context for Prospector agent
      agentOId: providedAgentOId // Accept agent ID from caller (NEW workspace ID)
    } = body;
    
    agentType = bodyAgentType;

    console.log(`🤖 Running ${agentType} agent...`);
    console.log(`🔑 Using workspace API key: ${workspaceApiKey?.substring(0, 10)}...`);

    if (!workspaceApiKey) {
      return NextResponse.json(
        { success: false, error: 'Workspace API key is required' },
        { status: 400 }
      );
    }

    let endpoint = '';
    let requestBody: any = {};
    
    // Use provided agent ID (from new workspace) or fallback to template IDs
    const agentOId = providedAgentOId || AGENT_IDS[agentType as keyof typeof AGENT_IDS];

    console.log(`🆔 Using agent ID: ${agentOId} (${providedAgentOId ? 'from new workspace' : 'fallback to template'})`);

    if (!agentOId) {
      return NextResponse.json(
        { success: false, error: `Unknown agent type: ${agentType}` },
        { status: 400 }
      );
    }

    switch(agentType) {
      case 'prospector':
        endpoint = `${OCTAVE_BASE_URL}/prospector/run`;
        requestBody = {
          companyDomain: companyDomain, // MUST be first
          agentOId: agentOId,           // MUST be second per API docs
          limit: 25,                    // First 25 prospects
          minimal: true,
          searchContext: searchContext  // Pass search context with personaOIds and fuzzyTitles
        };
        break;

      case 'sequence':
        endpoint = `${OCTAVE_BASE_URL}/sequence/run`;
        requestBody = {
          agentOId: agentOId,
          email: email || null,
          companyDomain: companyDomain || null,
          companyName: companyName || null,
          firstName: firstName || null,
          jobTitle: jobTitle || null,
          linkedInProfile: linkedInProfile || null,
          outputFormat: 'text',
          runtimeContext: runtimeContext
        };
        break;

      case 'callPrep':
        endpoint = `${OCTAVE_BASE_URL}/call-prep/run`;
        requestBody = {
          agentOId: agentOId,
          email: email || null,
          companyDomain: companyDomain || null,
          companyName: companyName || null,
          firstName: firstName || null,
          jobTitle: jobTitle || null,
          linkedInProfile: linkedInProfile || null,
          runtimeContext: runtimeContext
        };
        break;

      case 'linkedinPost':
      case 'newsletter':
      case 'linkedinDM':
        endpoint = `${OCTAVE_BASE_URL}/generate-content/run`; // Fixed: was /content/run
        requestBody = {
          agentOId: agentOId,
          email: email || null,
          companyDomain: companyDomain || null,
          companyName: companyName || null,
          firstName: firstName || null,
          jobTitle: jobTitle || null,
          linkedInProfile: linkedInProfile || null,
          runtimeContext: runtimeContext
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown agent type: ${agentType}` },
          { status: 400 }
        );
    }

    console.log(`📤 Calling Octave ${agentType} agent:`, endpoint);
    console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));

    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': workspaceApiKey
      },
      timeout: 120000 // 2 minute timeout for agents
    });

    console.log(`✅ ${agentType} agent completed successfully`);
    console.log(`📊 Response status:`, response.status);
    console.log(`📊 Response data structure:`, JSON.stringify({
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      found: response.data?.found,
      message: response.data?.message,
      hasContacts: !!response.data?.data?.contacts,
      contactsCount: response.data?.data?.contacts?.length || 0
    }, null, 2));

    return NextResponse.json({
      success: true,
      agentType,
      data: response.data
    });

  } catch (error: any) {
    console.error(`❌ ${agentType} Agent Error Details:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Response Data:`, JSON.stringify(error.response?.data, null, 2));
    console.error(`   Request Body:`, JSON.stringify(requestBody, null, 2));
    
    // Return graceful error for display
    return NextResponse.json(
      { 
        success: false,
        error: error.response?.data?.message || error.message || 'Agent execution failed',
        details: error.response?.data
      },
      { status: 200 } // Return 200 so it doesn't break the flow
    );
  }
}

