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

    // Generate dynamic offering based on client's business
    const generateOffering = (data: QuestionnaireData) => {
      const companyName = data.companyInfo?.companyName || 'Client Company';
      
      // Use the new serviceInfo fields for more accurate data
      const industry = data.serviceInfo?.industry || data.icp?.locationIndustry || 'B2B services';
      const keyResponsibilities = data.serviceInfo?.keyResponsibilities || data.icp?.keyResponsibilities || 'business operations';
      const competitiveEdge = data.serviceInfo?.competitiveEdge || data.reasonsToBuy?.competitiveEdge || 'unique value proposition';
      const problems = data.serviceInfo?.commonProblems || data.problemsBarriers?.commonObjections || 'operational challenges';
      const serviceDescription = data.serviceInfo?.serviceDescription || 'revenue growth services';
      
      return {
        type: "SERVICE",
        name: `${companyName} - Revenue Growth Services`,
        differentiatedValue: `Customized revenue growth strategy for ${companyName} in the ${industry} sector. Our approach addresses ${keyResponsibilities} challenges with ${competitiveEdge}.`,
        statusQuo: `${companyName} currently faces ${problems} that limit their revenue growth potential.`
      };
    };

    const workspaceRequest: OctaveWorkspaceRequest = {
      workspace: {
        name: workspaceName,
        url: workspaceUrl,
        addExistingUsers: true,
        agentOIds: []
      },
      offering: generateOffering(questionnaireData),
      runtimeContext: JSON.stringify(questionnaireData),
      brandVoiceOId: "bv_fractional_ops",
      createDefaultAgents: true
    };

    console.log('Generated Offering:', JSON.stringify(workspaceRequest.offering, null, 2));

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
