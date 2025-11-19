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
          'ca_lSWcHq7U7KboGGaaESrQX', // Prospector Agent
          'ca_dobh4WdpkbFWQT8pJqJJg', // Sequence Agent
          'ca_1ikwfmH5JBxJbygNGlgoc', // Call Prep Agent
          'ca_LpMPulsXSRPkhO9T2fJo8', // LinkedIn Post Agent
          'ca_oztYMqaYywqjiCZLjKWTs', // Newsletter Agent
          'ca_R9tuDLXcizpmvV1ICjsyu'  // LinkedIn DM Agent
        ]
      },
      offering: generateOffering(questionnaireData),
      runtimeContext: runtimeContextString,
      brandVoiceOId: "bv_fractional_ops",
      createDefaultAgents: true
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
    let newAgentIds: any = {};
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
        
        // ✅ FIXED: The agents array is at data.data, NOT data.data.agents
        const agents = agentListResponse.data?.data || [];
        console.log(`📋 Found ${agents.length} agents in new workspace`);

        if (!Array.isArray(agents)) {
          console.error('❌ ERROR: agents is not an array!', typeof agents);
          console.error('Full response:', JSON.stringify(agentListResponse.data, null, 2));
        }

        // Map agents by type to get their new IDs
        agents.forEach((agent: any, index: number) => {
          // Keep original case for comparison (API returns UPPERCASE types)
          const agentType = agent.type || agent.agentType || '';
          const agentName = agent.name?.toLowerCase() || '';
          const agentOId = agent.oId || agent.agentOId;

          console.log(`  [${index + 1}/${agents.length}] Processing Agent:`);
          console.log(`    Name: "${agent.name}"`);
          console.log(`    Type: "${agentType}"`);
          console.log(`    OID: "${agentOId}"`);

          // Match by TYPE (uppercase from API) and name keywords
          if (agentType === 'PROSPECTOR' && !newAgentIds.prospector) {
            newAgentIds.prospector = agentOId;
            console.log(`    ✅ MAPPED as PROSPECTOR`);
          } else if (agentType === 'EMAIL' && agentName.includes('sequence') && !newAgentIds.sequence) {
            newAgentIds.sequence = agentOId;
            console.log(`    ✅ MAPPED as SEQUENCE`);
          } else if (agentType === 'CALL_PREP' && !newAgentIds.callPrep) {
            newAgentIds.callPrep = agentOId;
            console.log(`    ✅ MAPPED as CALL_PREP`);
          } else if (agentType === 'CONTENT') {
            // Differentiate content agents by name
            if (agentName.includes('linkedin') && agentName.includes('post') && !newAgentIds.linkedinPost) {
              newAgentIds.linkedinPost = agentOId;
              console.log(`    ✅ MAPPED as LINKEDIN_POST`);
            } else if (agentName.includes('newsletter') && !newAgentIds.newsletter) {
              newAgentIds.newsletter = agentOId;
              console.log(`    ✅ MAPPED as NEWSLETTER`);
            } else if (agentName.includes('linkedin') && (agentName.includes('message') || agentName.includes('outreach') || agentName.includes('dm')) && !newAgentIds.linkedinDM) {
              newAgentIds.linkedinDM = agentOId;
              console.log(`    ✅ MAPPED as LINKEDIN_DM`);
            } else {
              console.log(`    ⏭️  Skipped (content agent, but doesn't match our criteria)`);
            }
          } else {
            console.log(`    ⏭️  Skipped (type: ${agentType}, or already mapped)`);
          }
        });

        console.log('');
        console.log('🎯 ===== FINAL AGENT MAPPING =====');
        console.log('✅ Prospector:', newAgentIds.prospector || '❌ NOT FOUND');
        console.log('✅ Sequence:', newAgentIds.sequence || '❌ NOT FOUND');
        console.log('✅ Call Prep:', newAgentIds.callPrep || '❌ NOT FOUND');
        console.log('✅ LinkedIn Post:', newAgentIds.linkedinPost || '❌ NOT FOUND');
        console.log('✅ Newsletter:', newAgentIds.newsletter || '❌ NOT FOUND');
        console.log('✅ LinkedIn DM:', newAgentIds.linkedinDM || '❌ NOT FOUND');
        console.log('================================');
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
    
    console.log('🎯 ===== STARTING AGENT EXECUTION =====');
    
    let agentResults = {
      campaignIdeas: [] as any[],
      prospectList: [] as any[],
      emailSequences: [] as any[],
      linkedinPost: '',
      newsletter: '',
      linkedinDM: '',
      callPrepExample: null as any
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
      
      // Agent 1: Prospector Agent (Find prospects)
      console.log('👥 Running Prospector Agent...');
      try {
        const prospectorResponse = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType: 'prospector',
            workspaceApiKey: workspaceApiKey,
            companyDomain: companyDomain,
            agentOId: newAgentIds.prospector // Pass the NEW agent ID
          })
        });

        const prospectorResult = await prospectorResponse.json();
        
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
        }
      } catch (prospectorError: any) {
        console.error('⚠️ Prospector agent error (non-critical):', prospectorError.message);
      }

      // Agent 2: Sequence Agent (Generate cold email sequence)
      // Use first prospect if available
      const firstProspect = agentResults.prospectList[0];
      if (firstProspect) {
        console.log('📧 Running Sequence Agent...');
        try {
          const sequenceResponse = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'sequence',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: firstProspect.email,
              firstName: firstProspect.name?.split(' ')[0] || '',
              jobTitle: firstProspect.title,
              agentOId: newAgentIds.sequence, // Pass the NEW agent ID
              runtimeContext: {
                targetCompany: firstProspect.company
              }
            })
          });

          const sequenceResult = await sequenceResponse.json();
          
          if (sequenceResult.success && sequenceResult.data?.data?.emails) {
            agentResults.emailSequences = sequenceResult.data.data.emails.map((email: any, index: number) => ({
              emailNumber: index + 1,
              subject: email.subject || '',
              body: email.email || '',
              sections: email.sections || {}
            }));
            console.log(`✅ Generated ${agentResults.emailSequences.length} email sequences`);
          } else {
            console.warn('⚠️ Sequence agent returned no results:', sequenceResult.error || 'Unknown error');
          }
        } catch (sequenceError: any) {
          console.error('⚠️ Sequence agent error (non-critical):', sequenceError.message);
        }
      }

      // Agent 3: LinkedIn Post Agent
      console.log('📱 Running LinkedIn Post Agent...');
      try {
        const linkedinPostResponse = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType: 'linkedinPost',
            workspaceApiKey: workspaceApiKey,
            companyDomain: companyDomain,
            companyName: companyName,
            agentOId: newAgentIds.linkedinPost, // Pass the NEW agent ID
            runtimeContext: {
              topic: agentResults.campaignIdeas[0]?.title || 'Industry insights'
            }
          })
        });

        const linkedinPostResult = await linkedinPostResponse.json();
        
        if (linkedinPostResult.success && linkedinPostResult.data?.data?.content) {
          agentResults.linkedinPost = linkedinPostResult.data.data.content;
          console.log(`✅ Generated LinkedIn post (${agentResults.linkedinPost.length} chars)`);
        } else {
          console.warn('⚠️ LinkedIn post agent returned no results:', linkedinPostResult.error || 'Unknown error');
        }
      } catch (linkedinPostError: any) {
        console.error('⚠️ LinkedIn post agent error (non-critical):', linkedinPostError.message);
      }

      // Agent 4: Newsletter Agent
      console.log('📰 Running Newsletter Agent...');
      try {
        const newsletterResponse = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentType: 'newsletter',
            workspaceApiKey: workspaceApiKey,
            companyDomain: companyDomain,
            companyName: companyName,
            agentOId: newAgentIds.newsletter, // Pass the NEW agent ID
            runtimeContext: {
              topic: `${companyName} Industry Insights and Updates`
            }
          })
        });

        const newsletterResult = await newsletterResponse.json();
        
        if (newsletterResult.success && newsletterResult.data?.data?.content) {
          agentResults.newsletter = newsletterResult.data.data.content;
          console.log(`✅ Generated newsletter (${agentResults.newsletter.length} chars)`);
        } else {
          console.warn('⚠️ Newsletter agent returned no results:', newsletterResult.error || 'Unknown error');
        }
      } catch (newsletterError: any) {
        console.error('⚠️ Newsletter agent error (non-critical):', newsletterError.message);
      }

      // Agent 5: LinkedIn DM Agent
      if (firstProspect) {
        console.log('💬 Running LinkedIn DM Agent...');
        try {
          const linkedinDMResponse = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'linkedinDM',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              firstName: firstProspect.name?.split(' ')[0] || '',
              jobTitle: firstProspect.title,
              agentOId: newAgentIds.linkedinDM, // Pass the NEW agent ID
              runtimeContext: {
                prospectCompany: firstProspect.company
              }
            })
          });

          const linkedinDMResult = await linkedinDMResponse.json();
          
          if (linkedinDMResult.success && linkedinDMResult.data?.data?.content) {
            agentResults.linkedinDM = linkedinDMResult.data.data.content;
            console.log(`✅ Generated LinkedIn DM (${agentResults.linkedinDM.length} chars)`);
          } else {
            console.warn('⚠️ LinkedIn DM agent returned no results:', linkedinDMResult.error || 'Unknown error');
          }
        } catch (linkedinDMError: any) {
          console.error('⚠️ LinkedIn DM agent error (non-critical):', linkedinDMError.message);
        }
      }

      // Agent 6: Call Prep Agent
      if (firstProspect) {
        console.log('📞 Running Call Prep Agent...');
        try {
          const callPrepResponse = await fetch(`${request.nextUrl.origin}/api/octave/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentType: 'callPrep',
              workspaceApiKey: workspaceApiKey,
              companyDomain: companyDomain,
              companyName: companyName,
              email: firstProspect.email,
              firstName: firstProspect.name?.split(' ')[0] || '',
              jobTitle: firstProspect.title,
              agentOId: newAgentIds.callPrep, // Pass the NEW agent ID
              runtimeContext: {
                prospectCompany: firstProspect.company
              }
            })
          });

          const callPrepResult = await callPrepResponse.json();
          
          if (callPrepResult.success && callPrepResult.data?.data) {
            agentResults.callPrepExample = callPrepResult.data.data;
            console.log(`✅ Generated call prep example`);
          } else {
            console.warn('⚠️ Call prep agent returned no results:', callPrepResult.error || 'Unknown error');
          }
        } catch (callPrepError: any) {
          console.error('⚠️ Call prep agent error (non-critical):', callPrepError.message);
        }
      }

      console.log('🎯 ===== AGENT EXECUTION COMPLETE =====');
      console.log(`📊 Results Summary:`);
      console.log(`  - Campaign Ideas: ${agentResults.campaignIdeas.length}`);
      console.log(`  - Prospects: ${agentResults.prospectList.length}`);
      console.log(`  - Email Sequences: ${agentResults.emailSequences.length}`);
      console.log(`  - LinkedIn Post: ${agentResults.linkedinPost ? 'Generated' : 'Failed'}`);
      console.log(`  - Newsletter: ${agentResults.newsletter ? 'Generated' : 'Failed'}`);
      console.log(`  - LinkedIn DM: ${agentResults.linkedinDM ? 'Generated' : 'Failed'}`);
      console.log(`  - Call Prep: ${agentResults.callPrepExample ? 'Generated' : 'Failed'}`);

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
            email_sequences: agentResults.emailSequences,
            linkedin_post: agentResults.linkedinPost || null,
            newsletter: agentResults.newsletter || null,
            linkedin_dm: agentResults.linkedinDM || null,
            call_prep_example: agentResults.callPrepExample || null
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
