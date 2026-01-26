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
    const { userId, email } = await request.json();

    if (!userId && !email) {
      return NextResponse.json({ error: 'User ID or email is required' }, { status: 400 });
    }

    console.log('🔄 ===== ADMIN REGENERATE WORKSPACE REQUEST =====');
    if (userId) {
      console.log('👤 User ID:', userId);
    } else {
      console.log('📧 Email:', email);
    }

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // STEP 1: Get user (by userId or email)
    // ============================================
    console.log('🔍 Looking up user...');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      return NextResponse.json({ error: 'Failed to lookup user' }, { status: 500 });
    }

    const user = userId 
      ? users?.find(u => u.id === userId)
      : users?.find(u => u.email?.toLowerCase() === email?.toLowerCase());
    
    if (!user) {
      const identifier = userId || email;
      console.error('❌ User not found:', identifier);
      return NextResponse.json({ 
        error: `No user found with ${userId ? 'ID' : 'email'}: ${identifier}` 
      }, { status: 404 });
    }

    const resolvedUserId = user.id;
    const userEmail = user.email || 'noemail@example.com';
    console.log('✅ Found user:', userEmail, `(${resolvedUserId})`);

    // ============================================
    // STEP 2: Load questionnaire data
    // ============================================
    console.log('📋 Loading questionnaire data...');
    let questionnaireData: QuestionnaireData;
    try {
      questionnaireData = await loadQuestionnaireDataForUser(resolvedUserId);
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

    if (!workspaceApiKey) {
      return NextResponse.json(
        { error: 'Workspace API key not found in response' },
        { status: 500 }
      );
    }

    // ============================================
    // STEP 4: Find Context Agent ID in new workspace
    // ============================================
    let contextAgentId = null;
    try {
      console.log('🔍 Finding Context Agent in new workspace...');
      const allAgents = [];
      let offset = 0;
      const limit = 50;
      let hasNext = true;
      
      while (hasNext) {
        const agentsResponse = await axios.get(
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
        
        const pageAgents = agentsResponse.data?.data || [];
        allAgents.push(...pageAgents);
        hasNext = agentsResponse.data?.hasNext || false;
        offset += limit;
        
        if (!hasNext) break;
      }

      // Look for Context Agent by type
      const contextAgent = allAgents.find((agent: any) => {
        const agentType = (agent.type || '').toUpperCase();
        return agentType === 'CONTEXT';
      });

      if (contextAgent) {
        contextAgentId = contextAgent.oId;
        console.log(`✅ Found Context Agent: ${contextAgent.name} (${contextAgentId})`);
      } else {
        console.warn(`⚠️ Context Agent not found in workspace. Searched ${allAgents.length} agents.`);
      }
    } catch (agentError: any) {
      console.error('❌ Error finding Context Agent:', agentError.message);
      // Continue anyway - we'll update what we can
    }

    // ============================================
    // STEP 5: Extract personas and use cases from response
    // ============================================
    const personas = response.data?.data?.personas || [];
    const useCases = response.data?.data?.useCases || [];
    
    console.log('👥 Extracted personas:', personas.length);
    console.log('🎯 Extracted use cases:', useCases.length);

    // ============================================
    // STEP 6: Fetch full service offering from Octave
    // ============================================
    let fullServiceOffering: any = generateOffering(questionnaireData); // Fallback
    
    if (productOId && workspaceApiKey) {
      console.log('🎯 Fetching full Service Offering from Octave...');
      try {
        const productResponse = await axios.get(
          `https://app.octavehq.com/api/v2/product/get?oId=${productOId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            }
          }
        );

        if (productResponse.data) {
          fullServiceOffering = productResponse.data;
          console.log('✅ Fetched full Service Offering');
        }
      } catch (productError: any) {
        console.warn('⚠️ Failed to fetch full product (non-critical):', productError.message);
      }
    }

    // ============================================
    // STEP 7: Update existing octave_outputs record in Supabase
    // ============================================
    console.log('💾 Updating Supabase with new workspace connection...');
    console.log(`🔑 New workspace_api_key: ${workspaceApiKey?.substring(0, 15)}...`);
    try {
      const updateData: any = {
        workspace_oid: workspaceOId,
        workspace_api_key: workspaceApiKey, // ✅ CRITICAL: Update API key to new workspace
        product_oid: productOId,
        personas: personas,
        use_cases: useCases,
        service_offering: fullServiceOffering,
        company_name: companyName,
        company_domain: companyDomain
      };

      // Add Context Agent ID if found
      if (contextAgentId) {
        updateData.workspace_context_agent_id = contextAgentId;
      }

      // Find the most recent octave_outputs record for this user and update it
      const { data: existingRecord, error: findError } = await supabaseAdmin
        .from('octave_outputs')
        .select('id, workspace_api_key')
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error finding existing record:', findError);
        return NextResponse.json(
          { 
            success: false,
            error: 'Failed to find existing workspace record',
            details: findError.message
          },
          { status: 500 }
        );
      }

      if (existingRecord) {
        const oldApiKey = existingRecord.workspace_api_key;
        console.log(`🔄 Updating API key: ${oldApiKey?.substring(0, 15)}... → ${workspaceApiKey?.substring(0, 15)}...`);
        console.log(`📝 Updating record ID: ${existingRecord.id}`);
        
        // Update existing record by ID
        const { error: updateError, data: updatedData } = await supabaseAdmin
          .from('octave_outputs')
          .update(updateData)
          .eq('id', existingRecord.id)
          .select('workspace_api_key')
          .single();

        if (updateError) {
          console.error('❌ Error updating workspace in Supabase:', updateError);
          return NextResponse.json(
            { 
              success: false,
              error: 'Failed to update workspace connection in database',
              details: updateError.message
            },
            { status: 500 }
          );
        }
        
        // Verify the update worked
        const updatedApiKey = updatedData?.workspace_api_key;
        if (updatedApiKey === workspaceApiKey) {
          console.log('✅ Successfully updated existing workspace connection in Supabase');
          console.log(`   ✅ API key verified in database: ${updatedApiKey?.substring(0, 15)}...`);
          console.log(`   ✅ Routes will now use new workspace`);
        } else {
          console.error('❌ API key update verification failed!');
          console.error(`   Expected: ${workspaceApiKey?.substring(0, 15)}...`);
          console.error(`   Got: ${updatedApiKey?.substring(0, 15)}...`);
        }
      } else {
        // Insert new record if none exists
        const { error: insertError } = await supabaseAdmin
          .from('octave_outputs')
          .insert({
            user_id: resolvedUserId,
            ...updateData,
            campaign_ideas: [],
            prospect_list: null,
            cold_emails: null,
            linkedin_posts: null,
            linkedin_dms: null,
            newsletters: null,
            call_prep: null,
            youtube_scripts: null,
            client_references: [],
            segments: [],
            competitors: []
          });

        if (insertError) {
          console.error('❌ Error inserting workspace in Supabase:', insertError);
          return NextResponse.json(
            { 
              success: false,
              error: 'Failed to save workspace connection in database',
              details: insertError.message
            },
            { status: 500 }
          );
        }
        console.log('✅ Successfully inserted new workspace connection in Supabase');
      }
    } catch (dbError: any) {
      console.error('❌ Database update error:', dbError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to update workspace connection',
          details: dbError.message
        },
        { status: 500 }
      );
    }

    // ============================================
    // SUCCESS
    // ============================================
    console.log('🎉 ===== WORKSPACE REGENERATION COMPLETE =====');
    console.log(`   User: ${userEmail} (${resolvedUserId})`);
    console.log(`   Company: ${companyName}`);
    console.log(`   Workspace: ${workspaceName}`);
    console.log(`   Context Agent ID: ${contextAgentId || 'Not found'}`);

    return NextResponse.json({
      success: true,
      message: `Workspace successfully regenerated and connected for ${companyName}`,
      userEmail,
      userId: resolvedUserId,
      companyName,
      companyDomain,
      workspaceOId,
      productOId,
      workspaceName,
      workspaceUrl,
      contextAgentId: contextAgentId || null,
      personasCount: personas.length,
      useCasesCount: useCases.length
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
