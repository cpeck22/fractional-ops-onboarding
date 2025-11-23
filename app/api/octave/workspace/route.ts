import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { QuestionnaireData, OctaveWorkspaceRequest } from '@/types';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const OCTAVE_API_URL = 'https://app.octavehq.com/api/v2/agents/workspace/build';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const questionnaireData: QuestionnaireData = body.questionnaireData || body;
    const userEmail: string = body.email || 'noemail@example.com';
    const userId: string | undefined = body.userId;
    
    console.log('📥 Received submission from:', userEmail);
    console.log('📥 User ID from client:', userId || 'not provided');
    
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
      
      // Use the new 10-step questionnaire structure
      const industry = data.whatYouDo?.industry || 'B2B services';
      const keyResponsibilities = data.yourBuyers?.decisionMakerResponsibilities || 'business operations';
      
      // Question 6: What makes your company unique or different from competitors?
      const differentiatedValue = data.howYouDoIt?.uniqueValue || 'unique value proposition';
      
      // Question 11: Why should they move away from the status quo? (with full context)
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

    // Prepare runtime context - ensure it's valid JSON
    let runtimeContextString: string;
    try {
      runtimeContextString = JSON.stringify(questionnaireData);
    } catch (error) {
      console.error('❌ Failed to stringify questionnaireData:', error);
      throw new Error('Invalid questionnaire data - cannot convert to JSON');
    }

    const workspaceRequest: OctaveWorkspaceRequest = {
      workspace: {
        name: workspaceName,
        url: workspaceUrl,
        addExistingUsers: true,
        agentOIds: [
          // Prospector Agent (keep this one)
          'ca_0EQ3oCpNpE8VubFBIUmYm',
          
          // Cold Email Sequence Agents (5)
          'ca_6ghm6GTyTCtQjUibRJYBn', // COLD EMAIL - 3 Personalized Solutions
          'ca_70c4EJDSrPykuWgMGJreP', // COLD EMAIL - Lead Magnet Focus (Short)
          'ca_6E1kFGKeALMz64F7SMB0c', // COLD EMAIL - Local/Same City In Common Focus
          'ca_NJM0OZjyBbMn1cDTDIoVl', // COLD EMAIL - Problem/Solution Focus
          'ca_MaQ3TezxYsMJvkpGnDMDS', // COLD EMAIL - Lead Magnet Focus (Long)
          
          // Call Prep Agent (1)
          'ca_BLZTE6PKlqVEAK1ZFarmR', // Call Prep Agent (1st Meeting)
          
          // LinkedIn Post Agents (3)
          'ca_B6JBf44OqaZA5cdhJ1z6P', // LINKEDIN POST: Inspiring Post
          'ca_KdG0WncyW45oRqFZcdngQ', // LINKEDIN POST: Promotional Posts (Lead-Magnet)
          'ca_xfNTga6wQNUqfH45KM0Ka', // LINKEDIN POST: Actionable Post
          
          // LinkedIn DM Agents (2)
          'ca_b4p8wuI4rntQdhoxK2hF7', // LINKEDIN CONNECTION DM - Newsletter CTA
          'ca_Ea41BbpWV2HPlvLQiyyT4', // LINKEDIN CONNECTION DM - Lead Magnet CTA
          
          // Newsletter Agents (2)
          'ca_e4UYXGTMitLjwZEgzsNc1', // NEWSLETTER - Tactical Writing Agent
          'ca_gilixBObzhALpK7LO7Nr9'  // NEWSLETTER - Leadership Writing Agent
        ]
      },
      offering: generateOffering(questionnaireData),
      runtimeContext: runtimeContextString,
      brandVoiceOId: "bv_fractional_ops",
      createDefaultAgents: false // ✅ Changed to false to allow custom agents from agentOIds to be cloned
    };

    console.log('=== OCTAVE API CALL DETAILS ===');
    console.log('API URL:', OCTAVE_API_URL);
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT FOUND');
    console.log('Request Headers:', {
      'Content-Type': 'application/json',
      'api_key': apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT FOUND'
    });
    
    // Log workspace request WITHOUT the full runtimeContext to avoid huge logs
    const { runtimeContext, ...workspaceRequestWithoutContext } = workspaceRequest;
    console.log('Workspace Request (without runtimeContext):', JSON.stringify(workspaceRequestWithoutContext, null, 2));
    console.log('Runtime Context size:', runtimeContext.length, 'characters');
    
    // Validate required fields
    if (!workspaceRequest.workspace.name) {
      throw new Error('Workspace name is required');
    }
    if (!workspaceRequest.offering.name) {
      throw new Error('Offering name is required');
    }
    
    console.log('✅ Validation passed. Making request to Octave API...');
    
    const response = await axios.post(OCTAVE_API_URL, workspaceRequest, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey
      }
    });

    console.log('=== OCTAVE API RESPONSE ===');
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    // Extract workspace and product information from response
    // Try multiple possible locations for the IDs
    const workspaceOId = response.data?.workspace?.oId 
      || response.data?.data?.workspace?.oId 
      || response.data?.oId;
    
    const productOId = response.data?.offering?.oId 
      || response.data?.product?.oId 
      || response.data?.data?.offering?.oId 
      || response.data?.data?.product?.oId
      || response.data?.primaryOffering?.oId;
    
    console.log('🆔 Workspace OId:', workspaceOId);
    console.log('🆔 Product OId:', productOId);
    console.log('🔍 Full response.data keys:', Object.keys(response.data || {}));
    
    if (response.data?.data) {
      console.log('🔍 response.data.data keys:', Object.keys(response.data.data || {}));
    }

    // Extract the workspace API key from response (CRITICAL for generating references)
    const workspaceApiKey = response.data?.apiKey 
      || response.data?.workspace?.apiKey 
      || response.data?.data?.apiKey
      || response.data?.data?.workspace?.apiKey;

    console.log('🔑 Workspace API Key:', workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...` : 'NOT FOUND');

    if (!workspaceApiKey) {
      console.error('❌ WARNING: Could not extract workspace API key from response!');
      console.error('This API key is REQUIRED for generating client references.');
    }

    // List agents in the new workspace to get their NEW IDs (copied from template)
    let newAgentIds: any = {
      prospector: null,
      coldEmails: {},
      callPrep: null,
      linkedinPosts: {},
      linkedinDMs: {},
      newsletters: {}
    };
    
    if (workspaceApiKey) {
      console.log('🔍 Listing agents in new workspace to get copied agent IDs...');
      console.log('🔑 Using workspace API key:', workspaceApiKey?.substring(0, 15) + '...');
      try {
        const agentListResponse = await axios.get('https://app.octavehq.com/api/v2/agents/list', {
          headers: {
            'Content-Type': 'application/json',
            'api_key': workspaceApiKey
          }
        });

        console.log('📋 Raw agent list response structure:', JSON.stringify({
          hasData: !!agentListResponse.data,
          dataKeys: agentListResponse.data ? Object.keys(agentListResponse.data) : [],
          total: agentListResponse.data?.total,
          dataIsArray: Array.isArray(agentListResponse.data?.data)
        }, null, 2));
        
        const agents = agentListResponse.data?.data || [];
        console.log(`📋 Found ${agents.length} agents in new workspace`);

        if (!Array.isArray(agents)) {
          console.error('❌ ERROR: agents is not an array!', typeof agents);
          console.error('Full response:', JSON.stringify(agentListResponse.data, null, 2));
        }

        // Map agents by type and name to get their new IDs
        agents.forEach((agent: any, index: number) => {
          const agentType = agent.type || agent.agentType || '';
          const agentName = agent.name?.toLowerCase() || '';
          const agentOId = agent.oId || agent.agentOId;

          console.log(`  [${index + 1}/${agents.length}] Processing Agent:`);
          console.log(`    Name: "${agent.name}"`);
          console.log(`    Type: "${agentType}"`);
          console.log(`    OID: "${agentOId}"`);

          // Match by TYPE and specific name patterns
          if (agentType === 'PROSPECTOR') {
            newAgentIds.prospector = agentOId;
            console.log(`    ✅ MAPPED as PROSPECTOR`);
          } else if (agentType === 'EMAIL' || agentType === 'SEQUENCE') {
            // Map multiple cold email agents
            if (agentName.includes('3 personalized') || agentName.includes('personalized solutions')) {
              newAgentIds.coldEmails.personalizedSolutions = agentOId;
              console.log(`    ✅ MAPPED as COLD_EMAIL: Personalized Solutions`);
            } else if (agentName.includes('lead magnet') && agentName.includes('short')) {
              newAgentIds.coldEmails.leadMagnetShort = agentOId;
              console.log(`    ✅ MAPPED as COLD_EMAIL: Lead Magnet Short`);
            } else if (agentName.includes('local') || agentName.includes('same city')) {
              newAgentIds.coldEmails.localCity = agentOId;
              console.log(`    ✅ MAPPED as COLD_EMAIL: Local/Same City`);
            } else if (agentName.includes('problem') && agentName.includes('solution')) {
              newAgentIds.coldEmails.problemSolution = agentOId;
              console.log(`    ✅ MAPPED as COLD_EMAIL: Problem/Solution`);
            } else if (agentName.includes('lead magnet') && agentName.includes('long')) {
              newAgentIds.coldEmails.leadMagnetLong = agentOId;
              console.log(`    ✅ MAPPED as COLD_EMAIL: Lead Magnet Long`);
            } else {
              // FALLBACK: Use any EMAIL agent for missing variants
              console.log(`    ⚠️  Found EMAIL agent "${agent.name}" but doesn't match specific criteria`);
              console.log(`    🔄 FALLBACK: Using as generic email agent for missing variants`);
              
              // Fill in missing slots with this generic agent
              if (!newAgentIds.coldEmails.personalizedSolutions) {
                newAgentIds.coldEmails.personalizedSolutions = agentOId;
                console.log(`    ✅ FALLBACK MAPPED as COLD_EMAIL: Personalized Solutions`);
              } else if (!newAgentIds.coldEmails.leadMagnetShort) {
                newAgentIds.coldEmails.leadMagnetShort = agentOId;
                console.log(`    ✅ FALLBACK MAPPED as COLD_EMAIL: Lead Magnet Short`);
              } else if (!newAgentIds.coldEmails.localCity) {
                newAgentIds.coldEmails.localCity = agentOId;
                console.log(`    ✅ FALLBACK MAPPED as COLD_EMAIL: Local/Same City`);
              } else if (!newAgentIds.coldEmails.problemSolution) {
                newAgentIds.coldEmails.problemSolution = agentOId;
                console.log(`    ✅ FALLBACK MAPPED as COLD_EMAIL: Problem/Solution`);
              } else if (!newAgentIds.coldEmails.leadMagnetLong) {
                newAgentIds.coldEmails.leadMagnetLong = agentOId;
                console.log(`    ✅ FALLBACK MAPPED as COLD_EMAIL: Lead Magnet Long`);
              }
            }
          } else if (agentType === 'CALL_PREP') {
            newAgentIds.callPrep = agentOId;
            console.log(`    ✅ MAPPED as CALL_PREP`);
          } else if (agentType === 'CONTENT') {
            // Differentiate content agents by name
            if (agentName.includes('linkedin') && agentName.includes('post')) {
              if (agentName.includes('inspiring') || agentName.includes('challenges overcome')) {
                newAgentIds.linkedinPosts.inspiring = agentOId;
                console.log(`    ✅ MAPPED as LINKEDIN_POST: Inspiring`);
              } else if (agentName.includes('promotional') || agentName.includes('lead-magnet') || agentName.includes('lead magnet')) {
                newAgentIds.linkedinPosts.promotional = agentOId;
                console.log(`    ✅ MAPPED as LINKEDIN_POST: Promotional`);
              } else if (agentName.includes('actionable') || agentName.includes('explanation') || agentName.includes('analysis')) {
                newAgentIds.linkedinPosts.actionable = agentOId;
                console.log(`    ✅ MAPPED as LINKEDIN_POST: Actionable`);
              } else {
                // FALLBACK: Use generic LinkedIn post for missing variants
                console.log(`    ⚠️  Found LinkedIn Post "${agent.name}" but doesn't match specific criteria`);
                if (!newAgentIds.linkedinPosts.inspiring) {
                  newAgentIds.linkedinPosts.inspiring = agentOId;
                  console.log(`    ✅ FALLBACK MAPPED as LINKEDIN_POST: Inspiring`);
                } else if (!newAgentIds.linkedinPosts.promotional) {
                  newAgentIds.linkedinPosts.promotional = agentOId;
                  console.log(`    ✅ FALLBACK MAPPED as LINKEDIN_POST: Promotional`);
                } else if (!newAgentIds.linkedinPosts.actionable) {
                  newAgentIds.linkedinPosts.actionable = agentOId;
                  console.log(`    ✅ FALLBACK MAPPED as LINKEDIN_POST: Actionable`);
                }
              }
            } else if (agentName.includes('newsletter')) {
              if (agentName.includes('tactical')) {
                newAgentIds.newsletters.tactical = agentOId;
                console.log(`    ✅ MAPPED as NEWSLETTER: Tactical`);
              } else if (agentName.includes('leadership')) {
                newAgentIds.newsletters.leadership = agentOId;
                console.log(`    ✅ MAPPED as NEWSLETTER: Leadership`);
              } else {
                // FALLBACK: Use generic newsletter for missing variants
                console.log(`    ⚠️  Found Newsletter "${agent.name}" but doesn't match specific criteria`);
                if (!newAgentIds.newsletters.tactical) {
                  newAgentIds.newsletters.tactical = agentOId;
                  console.log(`    ✅ FALLBACK MAPPED as NEWSLETTER: Tactical`);
                } else if (!newAgentIds.newsletters.leadership) {
                  newAgentIds.newsletters.leadership = agentOId;
                  console.log(`    ✅ FALLBACK MAPPED as NEWSLETTER: Leadership`);
                }
              }
            } else if (agentName.includes('linkedin') && (agentName.includes('connection') || agentName.includes('dm'))) {
              if (agentName.includes('newsletter')) {
                newAgentIds.linkedinDMs.newsletter = agentOId;
                console.log(`    ✅ MAPPED as LINKEDIN_DM: Newsletter CTA`);
              } else if (agentName.includes('lead magnet') || agentName.includes('lead-magnet')) {
                newAgentIds.linkedinDMs.leadMagnet = agentOId;
                console.log(`    ✅ MAPPED as LINKEDIN_DM: Lead Magnet CTA`);
              } else {
                // FALLBACK: Use generic LinkedIn DM for missing variants
                console.log(`    ⚠️  Found LinkedIn DM "${agent.name}" but doesn't match specific criteria`);
                if (!newAgentIds.linkedinDMs.newsletter) {
                  newAgentIds.linkedinDMs.newsletter = agentOId;
                  console.log(`    ✅ FALLBACK MAPPED as LINKEDIN_DM: Newsletter CTA`);
                } else if (!newAgentIds.linkedinDMs.leadMagnet) {
                  newAgentIds.linkedinDMs.leadMagnet = agentOId;
                  console.log(`    ✅ FALLBACK MAPPED as LINKEDIN_DM: Lead Magnet CTA`);
                }
              }
            } else {
              console.log(`    ⏭️  Skipped (CONTENT agent, but doesn't match our criteria)`);
            }
          } else {
            console.log(`    ⏭️  Skipped (type: ${agentType})`);
          }
        });

        console.log('');
        console.log('🎯 ===== FINAL AGENT MAPPING =====');
        console.log('✅ Prospector:', newAgentIds.prospector || '❌ NOT FOUND');
        console.log('✅ Cold Emails:');
        console.log('   - Personalized Solutions:', newAgentIds.coldEmails.personalizedSolutions || '❌');
        console.log('   - Lead Magnet Short:', newAgentIds.coldEmails.leadMagnetShort || '❌');
        console.log('   - Local/Same City:', newAgentIds.coldEmails.localCity || '❌');
        console.log('   - Problem/Solution:', newAgentIds.coldEmails.problemSolution || '❌');
        console.log('   - Lead Magnet Long:', newAgentIds.coldEmails.leadMagnetLong || '❌');
        console.log('✅ Call Prep:', newAgentIds.callPrep || '❌ NOT FOUND');
        console.log('✅ LinkedIn Posts:');
        console.log('   - Inspiring:', newAgentIds.linkedinPosts.inspiring || '❌');
        console.log('   - Promotional:', newAgentIds.linkedinPosts.promotional || '❌');
        console.log('   - Actionable:', newAgentIds.linkedinPosts.actionable || '❌');
        console.log('✅ LinkedIn DMs:');
        console.log('   - Newsletter CTA:', newAgentIds.linkedinDMs.newsletter || '❌');
        console.log('   - Lead Magnet CTA:', newAgentIds.linkedinDMs.leadMagnet || '❌');
        console.log('✅ Newsletters:');
        console.log('   - Tactical:', newAgentIds.newsletters.tactical || '❌');
        console.log('   - Leadership:', newAgentIds.newsletters.leadership || '❌');
        console.log('================================');
        
        // Count missing agents
        const missingAgents = [];
        if (!newAgentIds.prospector) missingAgents.push('Prospector');
        if (!newAgentIds.coldEmails.personalizedSolutions) missingAgents.push('Cold Email: Personalized Solutions');
        if (!newAgentIds.coldEmails.leadMagnetShort) missingAgents.push('Cold Email: Lead Magnet Short');
        if (!newAgentIds.coldEmails.localCity) missingAgents.push('Cold Email: Local/Same City');
        if (!newAgentIds.coldEmails.problemSolution) missingAgents.push('Cold Email: Problem/Solution');
        if (!newAgentIds.coldEmails.leadMagnetLong) missingAgents.push('Cold Email: Lead Magnet Long');
        if (!newAgentIds.callPrep) missingAgents.push('Call Prep');
        if (!newAgentIds.linkedinPosts.inspiring) missingAgents.push('LinkedIn Post: Inspiring');
        if (!newAgentIds.linkedinPosts.promotional) missingAgents.push('LinkedIn Post: Promotional');
        if (!newAgentIds.linkedinPosts.actionable) missingAgents.push('LinkedIn Post: Actionable');
        if (!newAgentIds.linkedinDMs.newsletter) missingAgents.push('LinkedIn DM: Newsletter');
        if (!newAgentIds.linkedinDMs.leadMagnet) missingAgents.push('LinkedIn DM: Lead Magnet');
        if (!newAgentIds.newsletters.tactical) missingAgents.push('Newsletter: Tactical');
        if (!newAgentIds.newsletters.leadership) missingAgents.push('Newsletter: Leadership');
        
        if (missingAgents.length > 0) {
          console.warn('');
          console.warn('⚠️  ===== MISSING AGENTS WARNING =====');
          console.warn(`⚠️  ${missingAgents.length} specialized agents were not found in the new workspace:`);
          missingAgents.forEach(name => console.warn(`   ❌ ${name}`));
          console.warn('');
          console.warn('🔍 TROUBLESHOOTING:');
          console.warn('   1. Verify the agent IDs in workspace/route.ts lines 82-100 exist in your SKELETON workspace');
          console.warn('   2. Check that OCTAVE_API_KEY is from the workspace containing these specific agents');
          console.warn('   3. The workspace builder can only copy agents that exist in the source workspace');
          console.warn('   4. Agents will use fallback (generic agents) if available, or skip if not found');
          console.warn('================================');
        }
        console.log('');
      } catch (agentListError: any) {
        console.error('❌ Failed to list agents in new workspace:', agentListError.message);
        if (agentListError.response) {
          console.error('Response status:', agentListError.response.status);
          console.error('Response data:', JSON.stringify(agentListError.response.data, null, 2));
        }
        console.error('⚠️  Will proceed without new agent IDs (agents will likely fail)');
      }
    }

    // If productOId is still undefined, log warning
    if (!productOId) {
      console.error('❌ WARNING: Could not extract productOId from response!');
      console.error('Available response structure:', JSON.stringify(response.data, null, 2));
    }

    // Extract personas and use cases from workspace builder response
    const personas = response.data?.data?.personas || [];
    const useCases = response.data?.data?.useCases || [];
    
    console.log('👥 Extracted personas:', personas.length);
    console.log('🎯 Extracted use cases:', useCases.length);

    // Determine effective user ID for database operations
    let effectiveUserId = userId;
    
    if (!effectiveUserId) {
      console.log('⚠️ No userId from client, attempting to get from cookies...');
      const cookieStore = await cookies();
      const supabaseForAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              cookie: cookieStore.toString()
            }
          }
        }
      );
      
      const { data: { user } } = await supabaseForAuth.auth.getUser();
      effectiveUserId = user?.id;
      console.log('👤 User ID from cookies:', effectiveUserId || 'null');
    } else {
      console.log('✅ Using userId from client:', effectiveUserId);
    }

    // Step 2: Create Client References in Octave (if we have client references)
    const clientReferences = questionnaireData.socialProof?.clientReferences || [];
    let createdReferences: any[] = [];
    let createdSegments: any[] = [];
    
    if (Array.isArray(clientReferences) && clientReferences.length > 0) {
      if (!productOId) {
        console.error('❌ Cannot create client references: productOId is missing');
      } else {
        console.log('📝 Creating client references in Octave...');
        try {
          const referenceResponse = await fetch(`${request.nextUrl.origin}/api/octave/reference`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientReferences,
              productOId: productOId,
              workspaceOId: workspaceOId,
              workspaceApiKey: workspaceApiKey
            }),
          });

        const referenceResult = await referenceResponse.json();
        
        if (referenceResponse.ok && referenceResult.success) {
          console.log(`✅ Created ${referenceResult.created}/${referenceResult.total} client references`);
          createdReferences = referenceResult.references || [];
          if (referenceResult.errors) {
            console.warn('⚠️ Some references failed:', referenceResult.errors);
          }
        } else {
          console.error('⚠️ Client reference creation failed (non-critical):', referenceResult);
        }
        } catch (referenceError) {
          console.error('⚠️ Client reference creation error (non-critical):', referenceError);
        }
      }

      // Step 3: Create Segments in Octave based on industries from client references
      if (!productOId) {
        console.error('❌ Cannot create segments: productOId is missing');
      } else {
        console.log('📊 Creating segments in Octave from industries...');
      try {
        const segmentResponse = await fetch(`${request.nextUrl.origin}/api/octave/segment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientReferences,
            primaryOfferingOId: productOId,
            workspaceOId: workspaceOId,
            workspaceApiKey: workspaceApiKey
          }),
        });

        const segmentResult = await segmentResponse.json();
        
        if (segmentResponse.ok && segmentResult.success) {
          console.log(`✅ Created ${segmentResult.created}/${segmentResult.total} segments`);
          createdSegments = segmentResult.segments || [];
          if (segmentResult.errors) {
            console.warn('⚠️ Some segments failed:', segmentResult.errors);
          }
        } else {
          console.error('⚠️ Segment creation failed (non-critical):', segmentResult);
        }
      } catch (segmentError) {
        console.error('⚠️ Segment creation error (non-critical):', segmentError);
      }
      }

      // Step 4: Create Playbooks (one per segment)
      if (createdSegments.length > 0 && personas.length > 0 && useCases.length > 0) {
        console.log('📚 Creating playbooks in Octave...');
        try {
          const playbookResponse = await fetch(`${request.nextUrl.origin}/api/octave/playbook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              segments: createdSegments,
              references: createdReferences,
              personas: personas,
              useCases: useCases,
              productOId: productOId,
              workspaceApiKey: workspaceApiKey
            }),
          });

          const playbookResult = await playbookResponse.json();
          
          if (playbookResponse.ok && playbookResult.success) {
            console.log(`✅ Created ${playbookResult.created}/${playbookResult.total} playbooks`);
            if (playbookResult.errors) {
              console.warn('⚠️ Some playbooks failed:', playbookResult.errors);
            }
          } else {
            console.error('⚠️ Playbook creation failed (non-critical):', playbookResult);
          }
        } catch (playbookError) {
          console.error('⚠️ Playbook creation error (non-critical):', playbookError);
        }
      } else {
        console.log('ℹ️ Skipping playbook creation - missing required data');
        console.log(`  Segments: ${createdSegments.length}, Personas: ${personas.length}, Use Cases: ${useCases.length}`);
      }
    } else {
      console.log('ℹ️ No client references provided, skipping reference, segment, and playbook creation');
    }

    // ============================================
    // STEP 5: RUN AGENTS TO GENERATE STRATEGY
    // ============================================
    
    let agentResults = {
      campaignIdeas: [] as any[],
      prospectList: [] as any[],
      coldEmails: {
        personalizedSolutions: [] as any[],
        leadMagnetShort: [] as any[],
        localCity: [] as any[],
        problemSolution: [] as any[],
        leadMagnetLong: [] as any[]
      },
      linkedinPosts: {
        inspiring: '',
        promotional: '',
        actionable: ''
      },
      linkedinDMs: {
        newsletter: '',
        leadMagnet: ''
      },
      newsletters: {
        tactical: '',
        leadership: ''
      },
      callPrep: null as any
    };

    // Generate campaign ideas from playbooks (if any)
    if (createdSegments.length > 0) {
      agentResults.campaignIdeas = createdSegments.map((segment: any, index: number) => ({
        id: index + 1,
        title: `${segment.name} Campaign`,
        description: `Targeted outreach campaign for ${segment.name} companies`,
        segmentName: segment.name,
        segmentOId: segment.oId
      }));
      console.log(`💡 Generated ${agentResults.campaignIdeas.length} campaign ideas from segments`);
    }

    // Only run agents if we have workspace API key
    if (workspaceApiKey && companyDomain) {
      
      // STEP 6: LIST PERSONAS TO GET JOB TITLES FOR PROSPECTOR
      let fuzzyTitles: string[] = [];
      if (personas.length > 0) {
        console.log('📋 Listing personas to extract job titles for Prospector...');
        try {
          const listPersonasResponse = await axios.get(
            'https://app.octavehq.com/api/v2/persona/list',
            {
              headers: { 'api_key': workspaceApiKey },
              params: {
                limit: 50 // Get all personas
              }
            }
          );

          if (listPersonasResponse.data?.data) {
            const personaList = listPersonasResponse.data.data;
            console.log(`📋 Found ${personaList.length} personas in workspace`);
            
            // Extract all commonJobTitles from all personas
            personaList.forEach((persona: any) => {
              const jobTitles = persona.data?.commonJobTitles || [];
              fuzzyTitles.push(...jobTitles);
            });
            
            // Remove duplicates
            fuzzyTitles = Array.from(new Set(fuzzyTitles));
            console.log(`✅ Extracted ${fuzzyTitles.length} unique job titles from personas`);
            console.log(`   Sample titles:`, fuzzyTitles.slice(0, 5).join(', '), fuzzyTitles.length > 5 ? '...' : '');
          }
        } catch (listPersonasError: any) {
          console.error('⚠️ Error listing personas (non-critical):', listPersonasError.message);
          // Fallback to basic titles if persona list fails
          fuzzyTitles = [
            'Chief Digital Officer',
            'VP of E-Commerce',
            'Director of Marketing',
            'VP of Sales'
          ];
          console.log('⚠️ Using fallback job titles:', fuzzyTitles.join(', '));
        }
      }

      console.log('🎯 ===== STARTING AGENT EXECUTION =====');
      
      // STEP 7: PREPARE LOOKALIKE SEARCH FOR PROSPECTOR
      // Use reference customer domains for lookalike prospecting (find prospects AT companies like their successful clients)
      let lookalikeSource = '';
      const referenceCustomers = createdReferences.map((ref: any) => ref.companyDomain).filter(Boolean);
      
      if (referenceCustomers.length > 0) {
        lookalikeSource = referenceCustomers[0]; // Use first reference customer as lookalike template
        console.log(`🎯 Using lookalike search with reference customer: ${lookalikeSource}`);
      } else {
        console.warn('⚠️ No reference customers found. Prospector will use client domain as fallback.');
        lookalikeSource = companyDomain;
      }
      
      // Agent 1: Prospector Agent (Find prospects at companies LIKE the reference customers)
      if (newAgentIds.prospector) {
        console.log('👥 Running Prospector Agent...');
        console.log(`🎯 Searching for ${personas.length} personas: ${personas.slice(0, 3).map((p: any) => p.name).join(', ')}${personas.length > 3 ? '...' : ''}`);
        console.log(`🎯 Using ${fuzzyTitles.length} job titles for search`);
        console.log(`🎯 Lookalike source domain: ${lookalikeSource}`);
      }
      try {
        const prospectorResponse = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType: 'prospector',
            workspaceApiKey: workspaceApiKey,
            companyDomain: lookalikeSource, // Use reference customer domain for lookalike search
            agentOId: newAgentIds.prospector, // Pass the NEW agent ID
            searchContext: {
              personaOIds: personas.map((p: any) => p.oId),
              fuzzyTitles: fuzzyTitles
            }
          })
        });

        const prospectorResult = await prospectorResponse.json();
        
        console.log('📋 Prospector result structure:', JSON.stringify({
          success: prospectorResult.success,
          hasData: !!prospectorResult.data,
          dataKeys: prospectorResult.data ? Object.keys(prospectorResult.data) : [],
          found: prospectorResult.data?.found,
          hasDataData: !!prospectorResult.data?.data,
          dataDataKeys: prospectorResult.data?.data ? Object.keys(prospectorResult.data.data) : [],
          contactsCount: prospectorResult.data?.data?.contacts?.length || 0
        }, null, 2));
        
        // API returns: { success: true, data: { found: true, data: { contacts: [...] } } }
        if (prospectorResult.success && prospectorResult.data?.data?.contacts) {
          agentResults.prospectList = prospectorResult.data.data.contacts.map((c: any) => ({
            name: `${c.contact?.firstName || ''} ${c.contact?.lastName || ''}`.trim(),
            title: c.contact?.title || '',
            company: c.contact?.companyName || '',
            email: c.contact?.email || '',
            linkedIn: c.contact?.profileUrl || ''
          }));
          console.log(`✅ Prospector found ${agentResults.prospectList.length} prospects`);
        } else {
          console.warn('⚠️ Prospector agent returned no results:', prospectorResult.error || 'Unknown error');
          console.warn('Full prospector response:', JSON.stringify(prospectorResult, null, 2));
        }
      } catch (prospectorError: any) {
        console.error('⚠️ Prospector agent error (non-critical):', prospectorError.message);
      }

      // STEP 8: PREPARE DIFFERENT PROSPECTS FOR VARIETY
      // Use different prospects for different agent types for more variety
      const prospects = {
        coldEmail1: agentResults.prospectList[0],  // For Personalized Solutions
        coldEmail2: agentResults.prospectList[1] || agentResults.prospectList[0],  // For Lead Magnet Short
        coldEmail3: agentResults.prospectList[2] || agentResults.prospectList[0],  // For Local/Same City
        coldEmail4: agentResults.prospectList[3] || agentResults.prospectList[0],  // For Problem/Solution
        coldEmail5: agentResults.prospectList[4] || agentResults.prospectList[0],  // For Lead Magnet Long
        linkedinDM1: agentResults.prospectList[5] || agentResults.prospectList[0],  // For Newsletter CTA
        linkedinDM2: agentResults.prospectList[6] || agentResults.prospectList[0],  // For Lead Magnet CTA
        callPrep: agentResults.prospectList[7] || agentResults.prospectList[0]     // For Call Prep
      };

      console.log(`🎯 Using ${agentResults.prospectList.length} prospects for varied agent outputs`);

      // ============================================
      // COLD EMAIL SEQUENCE AGENTS (5 Variants)
      // ============================================
      
      // Cold Email #1: Personalized Solutions
      if (prospects.coldEmail1 && newAgentIds.coldEmails.personalizedSolutions) {
        console.log('📧 Running Cold Email Agent: Personalized Solutions...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'sequence',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: prospects.coldEmail1.email,
              firstName: prospects.coldEmail1.name?.split(' ')[0] || '',
              jobTitle: prospects.coldEmail1.title,
              agentOId: newAgentIds.coldEmails.personalizedSolutions
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.emails) {
            agentResults.coldEmails.personalizedSolutions = result.data.data.emails.map((email: any, index: number) => ({
              emailNumber: index + 1,
              subject: email.subject || '',
              body: email.email || '',
              sections: email.sections || {}
            }));
            console.log(`✅ Generated ${agentResults.coldEmails.personalizedSolutions.length} emails (Personalized Solutions)`);
          }
        } catch (error: any) {
          console.error('⚠️ Cold Email (Personalized Solutions) error:', error.message);
        }
      }

      // Cold Email #2: Lead Magnet Focus (Short)
      if (prospects.coldEmail2 && newAgentIds.coldEmails.leadMagnetShort) {
        console.log('📧 Running Cold Email Agent: Lead Magnet (Short)...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'sequence',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: prospects.coldEmail2.email,
              firstName: prospects.coldEmail2.name?.split(' ')[0] || '',
              jobTitle: prospects.coldEmail2.title,
              agentOId: newAgentIds.coldEmails.leadMagnetShort
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.emails) {
            agentResults.coldEmails.leadMagnetShort = result.data.data.emails.map((email: any, index: number) => ({
              emailNumber: index + 1,
              subject: email.subject || '',
              body: email.email || '',
              sections: email.sections || {}
            }));
            console.log(`✅ Generated ${agentResults.coldEmails.leadMagnetShort.length} emails (Lead Magnet Short)`);
          }
        } catch (error: any) {
          console.error('⚠️ Cold Email (Lead Magnet Short) error:', error.message);
        }
      }

      // Cold Email #3: Local/Same City Focus
      if (prospects.coldEmail3 && newAgentIds.coldEmails.localCity) {
        console.log('📧 Running Cold Email Agent: Local/Same City...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'sequence',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: prospects.coldEmail3.email,
              firstName: prospects.coldEmail3.name?.split(' ')[0] || '',
              jobTitle: prospects.coldEmail3.title,
              agentOId: newAgentIds.coldEmails.localCity
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.emails) {
            agentResults.coldEmails.localCity = result.data.data.emails.map((email: any, index: number) => ({
              emailNumber: index + 1,
              subject: email.subject || '',
              body: email.email || '',
              sections: email.sections || {}
            }));
            console.log(`✅ Generated ${agentResults.coldEmails.localCity.length} emails (Local/Same City)`);
          }
        } catch (error: any) {
          console.error('⚠️ Cold Email (Local/Same City) error:', error.message);
        }
      }

      // Cold Email #4: Problem/Solution Focus
      if (prospects.coldEmail4 && newAgentIds.coldEmails.problemSolution) {
        console.log('📧 Running Cold Email Agent: Problem/Solution...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'sequence',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: prospects.coldEmail4.email,
              firstName: prospects.coldEmail4.name?.split(' ')[0] || '',
              jobTitle: prospects.coldEmail4.title,
              agentOId: newAgentIds.coldEmails.problemSolution
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.emails) {
            agentResults.coldEmails.problemSolution = result.data.data.emails.map((email: any, index: number) => ({
              emailNumber: index + 1,
              subject: email.subject || '',
              body: email.email || '',
              sections: email.sections || {}
            }));
            console.log(`✅ Generated ${agentResults.coldEmails.problemSolution.length} emails (Problem/Solution)`);
          }
        } catch (error: any) {
          console.error('⚠️ Cold Email (Problem/Solution) error:', error.message);
        }
      }

      // Cold Email #5: Lead Magnet Focus (Long)
      if (prospects.coldEmail5 && newAgentIds.coldEmails.leadMagnetLong) {
        console.log('📧 Running Cold Email Agent: Lead Magnet (Long)...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'sequence',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: prospects.coldEmail5.email,
              firstName: prospects.coldEmail5.name?.split(' ')[0] || '',
              jobTitle: prospects.coldEmail5.title,
              agentOId: newAgentIds.coldEmails.leadMagnetLong
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.emails) {
            agentResults.coldEmails.leadMagnetLong = result.data.data.emails.map((email: any, index: number) => ({
              emailNumber: index + 1,
              subject: email.subject || '',
              body: email.email || '',
              sections: email.sections || {}
            }));
            console.log(`✅ Generated ${agentResults.coldEmails.leadMagnetLong.length} emails (Lead Magnet Long)`);
          }
        } catch (error: any) {
          console.error('⚠️ Cold Email (Lead Magnet Long) error:', error.message);
        }
      }

      // ============================================
      // LINKEDIN POST AGENTS (3 Variants)
      // ============================================
      
      // LinkedIn Post #1: Inspiring Post
      if (newAgentIds.linkedinPosts.inspiring) {
        console.log('📱 Running LinkedIn Post Agent: Inspiring...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'linkedinPost',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              agentOId: newAgentIds.linkedinPosts.inspiring,
              runtimeContext: {
                topic: agentResults.campaignIdeas[0]?.title || 'Industry insights and challenges'
              }
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.content) {
            agentResults.linkedinPosts.inspiring = result.data.data.content;
            console.log(`✅ Generated LinkedIn Post (Inspiring) - ${agentResults.linkedinPosts.inspiring.length} chars`);
          }
        } catch (error: any) {
          console.error('⚠️ LinkedIn Post (Inspiring) error:', error.message);
        }
      }

      // LinkedIn Post #2: Promotional Post
      if (newAgentIds.linkedinPosts.promotional) {
        console.log('📱 Running LinkedIn Post Agent: Promotional...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'linkedinPost',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              agentOId: newAgentIds.linkedinPosts.promotional,
              runtimeContext: {
                topic: 'Lead magnet promotion'
              }
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.content) {
            agentResults.linkedinPosts.promotional = result.data.data.content;
            console.log(`✅ Generated LinkedIn Post (Promotional) - ${agentResults.linkedinPosts.promotional.length} chars`);
          }
        } catch (error: any) {
          console.error('⚠️ LinkedIn Post (Promotional) error:', error.message);
        }
      }

      // LinkedIn Post #3: Actionable Post
      if (newAgentIds.linkedinPosts.actionable) {
        console.log('📱 Running LinkedIn Post Agent: Actionable...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'linkedinPost',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              agentOId: newAgentIds.linkedinPosts.actionable,
              runtimeContext: {
                topic: agentResults.campaignIdeas[1]?.title || 'Actionable industry insights'
              }
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.content) {
            agentResults.linkedinPosts.actionable = result.data.data.content;
            console.log(`✅ Generated LinkedIn Post (Actionable) - ${agentResults.linkedinPosts.actionable.length} chars`);
          }
        } catch (error: any) {
          console.error('⚠️ LinkedIn Post (Actionable) error:', error.message);
        }
      }

      // ============================================
      // NEWSLETTER AGENTS (2 Variants)
      // ============================================
      
      // Newsletter #1: Tactical Writing
      if (newAgentIds.newsletters.tactical) {
        console.log('📰 Running Newsletter Agent: Tactical...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'newsletter',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              agentOId: newAgentIds.newsletters.tactical,
              runtimeContext: {
                topic: `${companyName} - Tactical Industry Insights`
              }
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.content) {
            agentResults.newsletters.tactical = result.data.data.content;
            console.log(`✅ Generated Newsletter (Tactical) - ${agentResults.newsletters.tactical.length} chars`);
          }
        } catch (error: any) {
          console.error('⚠️ Newsletter (Tactical) error:', error.message);
        }
      }

      // Newsletter #2: Leadership Writing
      if (newAgentIds.newsletters.leadership) {
        console.log('📰 Running Newsletter Agent: Leadership...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'newsletter',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              agentOId: newAgentIds.newsletters.leadership,
              runtimeContext: {
                topic: `${companyName} - Leadership and Strategy Updates`
              }
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.content) {
            agentResults.newsletters.leadership = result.data.data.content;
            console.log(`✅ Generated Newsletter (Leadership) - ${agentResults.newsletters.leadership.length} chars`);
          }
        } catch (error: any) {
          console.error('⚠️ Newsletter (Leadership) error:', error.message);
        }
      }

      // ============================================
      // LINKEDIN DM AGENTS (2 Variants)
      // ============================================
      
      // LinkedIn DM #1: Newsletter CTA
      if (prospects.linkedinDM1 && newAgentIds.linkedinDMs.newsletter) {
        console.log('💬 Running LinkedIn DM Agent: Newsletter CTA...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'linkedinDM',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              firstName: prospects.linkedinDM1.name?.split(' ')[0] || '',
              jobTitle: prospects.linkedinDM1.title,
              agentOId: newAgentIds.linkedinDMs.newsletter
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.content) {
            agentResults.linkedinDMs.newsletter = result.data.data.content;
            console.log(`✅ Generated LinkedIn DM (Newsletter CTA) - ${agentResults.linkedinDMs.newsletter.length} chars`);
          }
        } catch (error: any) {
          console.error('⚠️ LinkedIn DM (Newsletter CTA) error:', error.message);
        }
      }

      // LinkedIn DM #2: Lead Magnet CTA
      if (prospects.linkedinDM2 && newAgentIds.linkedinDMs.leadMagnet) {
        console.log('💬 Running LinkedIn DM Agent: Lead Magnet CTA...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'linkedinDM',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              firstName: prospects.linkedinDM2.name?.split(' ')[0] || '',
              jobTitle: prospects.linkedinDM2.title,
              agentOId: newAgentIds.linkedinDMs.leadMagnet
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data?.content) {
            agentResults.linkedinDMs.leadMagnet = result.data.data.content;
            console.log(`✅ Generated LinkedIn DM (Lead Magnet CTA) - ${agentResults.linkedinDMs.leadMagnet.length} chars`);
          }
        } catch (error: any) {
          console.error('⚠️ LinkedIn DM (Lead Magnet CTA) error:', error.message);
        }
      }

      // ============================================
      // CALL PREP AGENT
      // ============================================
      
      if (prospects.callPrep && newAgentIds.callPrep) {
        console.log('📞 Running Call Prep Agent...');
        try {
          const response = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'callPrep',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: prospects.callPrep.email,
              firstName: prospects.callPrep.name?.split(' ')[0] || '',
              jobTitle: prospects.callPrep.title,
              agentOId: newAgentIds.callPrep
            })
          });
          const result = await response.json();
          if (result.success && result.data?.data) {
            agentResults.callPrep = result.data.data;
            console.log(`✅ Generated Call Prep example`);
          }
        } catch (error: any) {
          console.error('⚠️ Call Prep error:', error.message);
        }
      }

      console.log('🎯 ===== AGENT EXECUTION COMPLETE =====');
      console.log(`📊 Results Summary:`);
      console.log(`  - Campaign Ideas: ${agentResults.campaignIdeas.length}`);
      console.log(`  - Prospects: ${agentResults.prospectList.length}`);
      console.log(`  - Cold Emails:`);
      console.log(`    • Personalized Solutions: ${agentResults.coldEmails.personalizedSolutions.length} emails`);
      console.log(`    • Lead Magnet Short: ${agentResults.coldEmails.leadMagnetShort.length} emails`);
      console.log(`    • Local/Same City: ${agentResults.coldEmails.localCity.length} emails`);
      console.log(`    • Problem/Solution: ${agentResults.coldEmails.problemSolution.length} emails`);
      console.log(`    • Lead Magnet Long: ${agentResults.coldEmails.leadMagnetLong.length} emails`);
      console.log(`  - LinkedIn Posts:`);
      console.log(`    • Inspiring: ${agentResults.linkedinPosts.inspiring ? 'Generated' : 'Failed'}`);
      console.log(`    • Promotional: ${agentResults.linkedinPosts.promotional ? 'Generated' : 'Failed'}`);
      console.log(`    • Actionable: ${agentResults.linkedinPosts.actionable ? 'Generated' : 'Failed'}`);
      console.log(`  - LinkedIn DMs:`);
      console.log(`    • Newsletter CTA: ${agentResults.linkedinDMs.newsletter ? 'Generated' : 'Failed'}`);
      console.log(`    • Lead Magnet CTA: ${agentResults.linkedinDMs.leadMagnet ? 'Generated' : 'Failed'}`);
      console.log(`  - Newsletters:`);
      console.log(`    • Tactical: ${agentResults.newsletters.tactical ? 'Generated' : 'Failed'}`);
      console.log(`    • Leadership: ${agentResults.newsletters.leadership ? 'Generated' : 'Failed'}`);
      console.log(`  - Call Prep: ${agentResults.callPrep ? 'Generated' : 'Failed'}`);

    } else {
      console.warn('⚠️ Skipping agent execution - missing workspace API key or company domain');
    }

    // ============================================
    // STEP 6: SAVE RESULTS TO DATABASE
    // ============================================
    
    if (effectiveUserId) {
      console.log('💾 Saving agent outputs to database...');
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error: insertError } = await supabaseAdmin
          .from('octave_outputs')
          .insert({
            user_id: effectiveUserId,
            workspace_oid: workspaceOId,
            company_name: companyName,
            company_domain: companyDomain,
            campaign_ideas: agentResults.campaignIdeas,
            prospect_list: agentResults.prospectList,
            cold_emails: agentResults.coldEmails,
            linkedin_posts: agentResults.linkedinPosts,
            linkedin_dms: agentResults.linkedinDMs,
            newsletters: agentResults.newsletters,
            call_prep: agentResults.callPrep || null
          });

        if (insertError) {
          console.error('❌ Error saving outputs to database:', insertError);
        } else {
          console.log('✅ Agent outputs saved to database successfully');
        }
      } catch (dbError: any) {
        console.error('⚠️ Database save error (non-critical):', dbError.message);
      }
    } else {
      console.warn('⚠️ No user ID available, skipping database save');
    }

    // After successfully sending to Octave and creating references/segments, send to Zapier
    console.log('📤 Now sending PDF to Zapier...');
    try {
      const zapierResponse = await fetch(`${request.nextUrl.origin}/api/send-to-zapier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          questionnaireData,
          userId: effectiveUserId // Pass user ID from client or cookies
        }),
      });

      const zapierResult = await zapierResponse.json();
      
      if (zapierResponse.ok) {
        console.log('✅ Successfully sent to Zapier:', zapierResult);
      } else {
        console.error('⚠️ Zapier webhook failed (non-critical):', zapierResult);
        // Don't fail the whole request if Zapier fails
      }
    } catch (zapierError) {
      console.error('⚠️ Zapier webhook error (non-critical):', zapierError);
      // Don't fail the whole request if Zapier fails
    }

    return NextResponse.json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.log('=== OCTAVE API ERROR ===');
    console.log('Error Message:', error.message);
    console.log('Error Response Status:', error.response?.status);
    console.log('Error Response Headers:', error.response?.headers);
    console.log('Error Response Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Full Error Object:', error);
    
    console.error('Error creating Octave workspace:', error.response?.data || error.message);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create Octave workspace',
        details: error.response?.data || error.message,
        statusCode: error.response?.status,
        apiUrl: OCTAVE_API_URL,
        hasApiKey: !!process.env.OCTAVE_API_KEY
      },
      { status: 500 }
    );
  }
}
