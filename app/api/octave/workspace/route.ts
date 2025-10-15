import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { QuestionnaireData, OctaveWorkspaceRequest } from '@/types';

const OCTAVE_API_URL = 'https://app.octavehq.com/api/v2/agents/workspace/build';

export async function POST(request: NextRequest) {
  try {
    const questionnaireData: QuestionnaireData = await request.json();
    
    // Get API key from server environment (not exposed to client)
    const apiKey = process.env.OCTAVE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Octave API key not configured' },
        { status: 500 }
      );
    }

    console.log('Server API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT FOUND');

    // Use company name and domain from questionnaire data
    const companyName = questionnaireData.companyInfo?.companyName || 'Client Company';
    const companyDomain = questionnaireData.companyInfo?.companyDomain || 'client.com';
    const workspaceName = `${companyName} - Fractional Ops Workspace`;
    const workspaceUrl = `https://${companyDomain}`;
    
    console.log('Company Name:', companyName);
    console.log('Company Domain:', companyDomain);
    console.log('Workspace Name:', workspaceName);
    console.log('Workspace URL:', workspaceUrl);

    const workspaceRequest: OctaveWorkspaceRequest = {
      workspace: {
        name: workspaceName,
        url: workspaceUrl,
        addExistingUsers: true,
        agentOIds: []
      },
      offering: {
        type: "SERVICE",
        name: "Fractional Revenue Officer Services",
        differentiatedValue: "Our unique approach to fractional revenue leadership combines strategic expertise with hands-on execution to drive measurable growth for B2B clients.",
        statusQuo: "Companies struggle with revenue growth due to lack of experienced revenue leadership and systematic go-to-market execution."
      },
      runtimeContext: JSON.stringify(questionnaireData),
      brandVoiceOId: "bv_fractional_ops",
      createDefaultAgents: true
    };

    console.log('Making request to Octave API...');
    
    const response = await axios.post(OCTAVE_API_URL, workspaceRequest, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey
      }
    });

    console.log('Octave API Response:', response.status, response.data);

    return NextResponse.json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.error('Error creating Octave workspace:', error.response?.data || error.message);
    
    return NextResponse.json(
      { 
        error: 'Failed to create Octave workspace',
        details: error.response?.data || error.message
      },
      { status: 500 }
    );
  }
}
