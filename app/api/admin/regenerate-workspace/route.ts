import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadQuestionnaireDataForUser } from '@/lib/questionnaire-utils';
import axios from 'axios';
import { QuestionnaireData, OctaveWorkspaceRequest } from '@/types';
import { getWorkspaceAgentIds } from '@/lib/workspace-agents';

// Admin emails that can use this endpoint
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

const OCTAVE_API_URL = 'https://app.octavehq.com/api/v2/agents/workspace/build';

export const maxDuration = 300; // 5 minutes timeout

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('🔄 ===== ADMIN REGENERATE WORKSPACE REQUEST =====');
    console.log('👤 User ID:', userId);

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // STEP 1: Get user email
    // ============================================
    console.log('🔍 Looking up user...');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      return NextResponse.json({ error: 'Failed to lookup user' }, { status: 500 });
    }

    const user = users?.find(u => u.id === userId);
    
    if (!user) {
      console.error('❌ User not found:', userId);
      return NextResponse.json({ 
        error: `No user found with ID: ${userId}` 
      }, { status: 404 });
    }

    const userEmail = user.email || 'noemail@example.com';
    console.log('✅ Found user:', userEmail);

    // ============================================
    // STEP 2: Load questionnaire data
    // ============================================
    console.log('📋 Loading questionnaire data...');
    let questionnaireData: QuestionnaireData;
    try {
      questionnaireData = await loadQuestionnaireDataForUser(userId);
      console.log('✅ Questionnaire data loaded');
      console.log(`   Company: ${questionnaireData.companyInfo?.companyName || 'Unknown'}`);
      console.log(`   Domain: ${questionnaireData.companyInfo?.companyDomain || 'Unknown'}`);
    } catch (error: any) {
      console.error('❌ Failed to load questionnaire data:', error.message);
      return NextResponse.json({ 
        error: `Failed to load questionnaire data: ${error.message}` 
      }, { status: 400 });
    }

    // ============================================
    // STEP 3: Generate workspace using Octave API
    // ============================================
    const apiKey = process.env.OCTAVE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Octave API key not configured' },
        { status: 500 }
      );
    }

    const companyName = questionnaireData.companyInfo?.companyName || 'Client Company';
    const companyDomain = questionnaireData.companyInfo?.companyDomain || 'client.com';
    const workspaceName = `${companyName} - Fractional Ops Workspace`;
    const workspaceUrl = `https://${companyDomain}`;

    // Generate dynamic offering based on client's business
    const generateOffering = (data: QuestionnaireData) => {
      const companyName = data.companyInfo?.companyName || 'Client Company';
      const industry = data.whatYouDo?.industry || 'B2B services';
      const keyResponsibilities = data.yourBuyers?.decisionMakerResponsibilities || 'business operations';
      const differentiatedValue = data.howYouDoIt?.uniqueValue || 'unique value proposition';
      const statusQuoQuestion = "Why should they move away from the status quo? Sometimes, your biggest competitor is inaction. The prospect understands your benefits at a high level, but it can't answer the 'what's in it for them.' How would you paint a picture of the future in a way that makes it impossible for your prospect to avoid learning more? What's in it for them?";
      const statusQuoAnswer = data.creatingDesire?.whyMoveAway || 'operational challenges';
      const statusQuo = `${statusQuoQuestion}\n\nAnswer: ${statusQuoAnswer}`;
      const serviceDescription = data.whatYouDeliver?.mainService || 'revenue growth services';
      
      return {
        type: "SERVICE",
        name: `${companyName} - ${serviceDescription}`,
        differentiatedValue: differentiatedValue,
        statusQuo: statusQuo
      };
    };

    // Prepare runtime context
    let runtimeContextString: string;
    try {
      runtimeContextString = JSON.stringify(questionnaireData);
    } catch (error) {
      console.error('❌ Failed to stringify questionnaireData:', error);
      return NextResponse.json(
        { error: 'Invalid questionnaire data - cannot convert to JSON' },
        { status: 400 }
      );
    }

    const workspaceRequest: OctaveWorkspaceRequest = {
      workspace: {
        name: workspaceName,
        url: workspaceUrl,
        addExistingUsers: true,
        agentOIds: getWorkspaceAgentIds()
      },
      offering: generateOffering(questionnaireData),
      runtimeContext: runtimeContextString,
      brandVoiceOId: "bv_fractional_ops",
      createDefaultAgents: true
    };

    console.log('🚀 Calling Octave API to create workspace...');
    console.log(`   Workspace Name: ${workspaceName}`);
    console.log(`   Workspace URL: ${workspaceUrl}`);

    const response = await axios.post(OCTAVE_API_URL, workspaceRequest, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey
      }
    });

    console.log('✅ Octave API response received');
    console.log('   Status:', response.status);

    // Check for existing workspace error
    if (!response.data.found && response.data.message?.includes('already exists')) {
      console.log('⚠️ Workspace already exists');
      return NextResponse.json({ 
        success: false, 
        error: 'A workspace for this domain already exists. Please delete it in Octave first, then try again.',
        workspaceUrl: workspaceUrl,
        isExisting: true
      }, { status: 409 });
    }

    // Extract workspace information
    const workspaceOId = response.data?.workspace?.oId 
      || response.data?.data?.workspace?.oId 
      || response.data?.oId;
    
    const productOId = response.data?.offering?.oId 
      || response.data?.product?.oId 
      || response.data?.data?.offering?.oId 
      || response.data?.data?.product?.oId
      || response.data?.primaryOffering?.oId;
    
    const workspaceApiKey = response.data?.apiKey 
      || response.data?.workspace?.apiKey 
      || response.data?.data?.apiKey
      || response.data?.data?.workspace?.apiKey;

    console.log('✅ Workspace created successfully');
    console.log(`   Workspace OID: ${workspaceOId || 'Not found'}`);
    console.log(`   Product OID: ${productOId || 'Not found'}`);
    console.log(`   API Key: ${workspaceApiKey ? 'Present' : 'Missing'}`);

    // ============================================
    // SUCCESS
    // ============================================
    console.log('🎉 ===== WORKSPACE REGENERATION COMPLETE =====');
    console.log(`   User: ${userEmail} (${userId})`);
    console.log(`   Company: ${companyName}`);
    console.log(`   Workspace: ${workspaceName}`);

    return NextResponse.json({
      success: true,
      message: `Workspace successfully regenerated for ${companyName}`,
      userEmail,
      userId,
      companyName,
      companyDomain,
      workspaceOId,
      productOId,
      workspaceName,
      workspaceUrl
    });

  } catch (error: any) {
    console.error('❌ Regenerate workspace error:', error);
    
    // Handle Axios errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 409 || errorData?.message?.includes('already exists')) {
        return NextResponse.json({ 
          success: false,
          error: 'A workspace for this domain already exists. Please delete it in Octave first, then try again.',
          details: errorData
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        success: false,
        error: errorData?.message || errorData?.error || 'Failed to create workspace',
        details: errorData
      }, { status });
    }
    
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
