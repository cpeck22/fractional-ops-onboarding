import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { highlightOutput } from '@/lib/output-highlighting';
import axios from 'axios';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// LinkedIn profile to use for SEQUENCE agents (requires real profile for Octave to scrape)
const FALLBACK_LINKEDIN = 'https://www.linkedin.com/in/coreypeck/';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

// POST - Execute play agent with campaign context and generate copy
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
      effectiveUserId = impersonateUserId;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', effectiveUserId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Validate intermediary outputs exist
    const intermediary = campaign.intermediary_outputs || {};
    if (!intermediary.hook || !intermediary.attraction_offer) {
      return NextResponse.json(
        { success: false, error: 'Intermediary outputs not generated. Please generate intermediary outputs first.' },
        { status: 400 }
      );
    }

    // Get workspace API key
    const workspaceApiKey = campaign.workspace_api_key;
    if (!workspaceApiKey) {
      return NextResponse.json(
        { success: false, error: 'Workspace API key not found' },
        { status: 404 }
      );
    }

    console.log(`🤖 Generating copy for campaign: ${campaign.campaign_name} (Play: ${campaign.play_code})`);

    // Use stored agent metadata if available (set during campaign creation)
    let agentOId = campaign.agent_oid || null;
    let agentName = null;
    let agentType = campaign.agent_type || null;

    // Only lookup agent if not already stored
    if (!agentOId || !agentType) {
      console.log('🔍 Agent metadata not stored, looking up in Octave...');
      try {
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
      const codePattern = campaign.play_code.toLowerCase();

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
        agentType = matchedAgent.type; // EMAIL, CONTENT, etc.
        console.log(`✅ Found agent: ${agentName} (${agentOId}) - Type: ${agentType} for play ${campaign.play_code}`);
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `No agent found matching play code "${campaign.play_code}" in your workspace. Please contact Fractional Ops to set up this play.`
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
    } else {
      console.log(`✅ Using stored agent metadata: ${agentOId} (Type: ${agentType})`);
    }

    // Build comprehensive runtime context for Octave Content Agent
    const campaignBrief = campaign.campaign_brief || {};
    const runtimeContextData = campaign.runtime_context || {};
    const isConferenceCampaign = isConferencePlay(campaign.play_code);
    
    // For conference plays, add special instructions
    let conferenceInstructions = '';
    if (isConferenceCampaign) {
      conferenceInstructions = `
CRITICAL CONFERENCE PLAY REQUIREMENTS:
- This is a ${campaign.play_code === '2009' ? 'PRE-conference' : 'POST-conference'} outreach campaign
- Copy MUST tie to event context (why attendees are there)
- First line MUST reference the conference and shared context
- Identify buyer vs solution partner dynamic
- Include conference-specific hook from intermediary outputs
- CTA should be for 15-20 minute on-site meeting (pre-conference) or follow-up (post-conference)
- Use social proof from case studies that attended similar events
- Make it about the conference topic/problem, not just "we're both going"

Example structure for pre-conference (2009):
- Subject: [Event Name] - [Primary Problem Area]
- Line 1: Conference hook ("I saw you're also attending [event]")
- Line 2-3: Buyer dynamic ("Most [job titles] I meet there are trying to [outcome] but facing [problem]")
- Line 4-5: Solution + proof ("We helped [case study] achieve [result]")
- CTA: "Would you be open to 15-20 minutes on-site to discuss [specific outcome]?"

Example structure for post-conference (2010):
- Subject: Following up from [Event Name]
- Line 1: Conference reference + key takeaway
- Line 2-3: Turn what they learned into action plan
- Line 4-5: How you can help + proof
- CTA: "Let's turn those insights into a concrete plan"
`;
    }
    
    const octaveRuntimeContext = {
      // Campaign brief context
      campaignBrief: {
        meetingTranscript: campaignBrief.meeting_transcript || '',
        writtenStrategy: campaignBrief.written_strategy || '',
        documents: campaignBrief.documents || [],
        blogPosts: campaignBrief.blog_posts || [],
        additionalBrief: campaign.additional_brief || '',
        campaignType: campaign.campaign_type || '',
        campaignName: campaign.campaign_name,
        conferenceInstructions: conferenceInstructions
      },
      // Intermediary outputs
      intermediaryOutputs: {
        listBuildingInstructions: intermediary.list_building_instructions || '',
        hook: intermediary.hook || '',
        attractionOffer: intermediary.attraction_offer || {},
        asset: intermediary.asset || {},
        caseStudies: intermediary.case_studies || [],
        clientReferences: intermediary.client_references || []
      },
      // Octave workspace elements
      selectedPersonas: runtimeContextData.personas || [],
      selectedUseCases: runtimeContextData.use_cases || [],
      selectedReferences: intermediary.client_references || [],
      // Play config
      playConfig: {
        playCode: campaign.play_code,
        sequenceLength: getSequenceLengthForPlay(campaign.play_code),
        channel: 'email',
        tone: 'professional',
        requiresConferenceContext: isConferencePlay(campaign.play_code)
      },
      // Additional constraints from optional briefing
      constraints: campaign.additional_constraints || {}
    };

    // Determine agent type and call appropriate API
    const isSequenceAgent = agentType === 'EMAIL';
    
    console.log(`🚀 Executing ${isSequenceAgent ? 'SEQUENCE' : 'CONTENT'} agent ${agentOId} with comprehensive runtime context...`);

    let agentResponse;
    let rawOutputContent = '';
    let jsonContent: any = {};

    try {
      if (isSequenceAgent) {
        // ===== SEQUENCE AGENT (EMAIL) =====
        console.log('📧 Using Sequence Agent API (/sequence/run)');
        
        // CRITICAL: SEQUENCE agents REQUIRE a LinkedIn profile
        // Using Corey's LinkedIn as sample prospect
        const sampleLinkedInUrl = FALLBACK_LINKEDIN;
        console.log('🔗 [LinkedIn Profile] Using fallback:', sampleLinkedInUrl);
        
        // EMAIL agents expect runtimeContext with "all" key containing ALL context as one string
        // Based on API docs example: runtimeContext: { "all": "" }
        const allContextParts = [];
        
        // Campaign Brief
        if (campaignBrief.meeting_transcript) {
          allContextParts.push(`=== MEETING TRANSCRIPT ===\n${campaignBrief.meeting_transcript}`);
        }
        if (campaignBrief.written_strategy) {
          allContextParts.push(`=== WRITTEN STRATEGY ===\n${campaignBrief.written_strategy}`);
        }
        if (campaign.additional_brief) {
          allContextParts.push(`=== ADDITIONAL CONTEXT ===\n${campaign.additional_brief}`);
        }
        
        // Campaign Metadata
        allContextParts.push(`=== CAMPAIGN INFO ===`);
        allContextParts.push(`Campaign Name: ${campaign.campaign_name}`);
        allContextParts.push(`Campaign Type: ${campaign.campaign_type}`);
        allContextParts.push(`Play Code: ${campaign.play_code}`);
        allContextParts.push(`Sequence Length: ${getSequenceLengthForPlay(campaign.play_code)} emails`);
        
        // Intermediary Outputs
        if (intermediary.hook) {
          allContextParts.push(`\n=== HOOK (SHARED TOUCHPOINT) ===\n${intermediary.hook}`);
        }
        if (intermediary.list_building_instructions) {
          allContextParts.push(`\n=== LIST BUILDING INSTRUCTIONS ===\n${intermediary.list_building_instructions}`);
        }
        if (intermediary.attraction_offer?.headline) {
          allContextParts.push(`\n=== ATTRACTION OFFER ===`);
          allContextParts.push(`Headline: ${intermediary.attraction_offer.headline}`);
          if (intermediary.attraction_offer.valueBullets?.length > 0) {
            allContextParts.push(`Value:\n- ${intermediary.attraction_offer.valueBullets.join('\n- ')}`);
          }
          if (intermediary.attraction_offer.easeBullets?.length > 0) {
            allContextParts.push(`Ease:\n- ${intermediary.attraction_offer.easeBullets.join('\n- ')}`);
          }
        }
        if (intermediary.asset?.type) {
          allContextParts.push(`\n=== CAMPAIGN ASSET ===`);
          allContextParts.push(`Type: ${intermediary.asset.type}`);
          if (intermediary.asset.url) allContextParts.push(`URL: ${intermediary.asset.url}`);
          if (intermediary.asset.content) allContextParts.push(`Description: ${intermediary.asset.content}`);
        }
        
        // Case Studies
        if (intermediary.case_studies?.length > 0) {
          allContextParts.push(`\n=== CASE STUDIES ===`);
          intermediary.case_studies.forEach((cs: any, idx: number) => {
            allContextParts.push(`${idx + 1}. ${cs.clientName || cs.client_name}: ${cs.description || cs.result}`);
          });
        }
        
        // Workspace Elements
        if (runtimeContextData.personas?.length > 0) {
          allContextParts.push(`\n=== TARGET PERSONAS ===`);
          runtimeContextData.personas.forEach((p: any) => {
            allContextParts.push(`- ${p.name}`);
          });
        }
        if (runtimeContextData.use_cases?.length > 0) {
          allContextParts.push(`\n=== USE CASES ===`);
          runtimeContextData.use_cases.forEach((uc: any) => {
            allContextParts.push(`- ${uc.name}`);
          });
        }
        
        // Conference Instructions
        if (conferenceInstructions) {
          allContextParts.push(`\n${conferenceInstructions}`);
        }
        
        const allContextString = allContextParts.join('\n\n');
        
        console.log('📊 [Sequence Agent] Combined context length:', allContextString.length, 'characters');
        
        // If context is too large (>10K chars), use GPT to intelligently summarize
        let finalContextString = allContextString;
        
        if (allContextString.length > 10000) {
          console.log('⚠️ [Sequence Agent] Context too large, using GPT-4o to extract key points...');
          
          try {
            const summarizationPrompt = `You are a campaign strategist. Extract ONLY the key information needed to write compelling cold emails for this campaign.

CAMPAIGN NAME: "${campaign.campaign_name}"

FULL CONTEXT:
${allContextString}

TASK: Extract the most important campaign-relevant information in under 1000 characters. Focus on:
1. Campaign objective/goal
2. Target audience (who we're reaching)
3. Main hook/shared context
4. Key value proposition/offer
5. Proof points (case studies, results)
6. Call to action

Format as a concise brief. Remove redundant information, filler words, and irrelevant details.`;

            const completion = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at extracting key campaign information. Be concise and focus only on what matters for writing personalized cold emails.'
                },
                {
                  role: 'user',
                  content: summarizationPrompt
                }
              ],
              temperature: 0.3,
              max_tokens: 500
            });

            const summarizedContext = completion.choices[0].message.content || allContextString;
            finalContextString = summarizedContext;
            
            console.log('✅ [Sequence Agent] Context summarized from', allContextString.length, 'to', finalContextString.length, 'characters');
            
          } catch (summarizeError: any) {
            console.error('❌ [Sequence Agent] Summarization failed, using original context:', summarizeError.message);
            // Fall back to original if summarization fails
            finalContextString = allContextString.substring(0, 15000); // At least truncate it
          }
        }
        
        const sequenceAgentRequest = {
          agentOId: agentOId,
          runtimeContext: {
            all: finalContextString  // Summarized or original context
          },
          email: null,
          companyDomain: null,
          companyName: null,
          firstName: null,
          jobTitle: null,
          linkedInProfile: sampleLinkedInUrl,  // Corey's LinkedIn for sample prospect data
          outputFormat: 'text',
          customContext: {}
        };

        const response = await axios.post(
          'https://app.octavehq.com/api/v2/agents/sequence/run',
          sequenceAgentRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            },
            timeout: 180000 // 3 minute timeout
          }
        );

        agentResponse = response.data;

        // EXPLICIT LOGGING - OUTPUT EVERYTHING ABOUT THE RESPONSE
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 [SEQUENCE AGENT RESPONSE - FULL DIAGNOSTIC]');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📦 Response Status:', response.status);
        console.log('📦 Response Status Text:', response.statusText);
        console.log('📦 Response Keys:', Object.keys(agentResponse || {}));
        console.log('📦 Full Response Object:', JSON.stringify(agentResponse, null, 2));
        console.log('');
        console.log('🔎 Checking specific fields:');
        console.log('  - agentResponse.found:', agentResponse?.found, '(type:', typeof agentResponse?.found, ')');
        console.log('  - agentResponse.data:', agentResponse?.data ? 'EXISTS' : 'MISSING', '(type:', typeof agentResponse?.data, ')');
        console.log('  - agentResponse.data keys:', agentResponse?.data ? Object.keys(agentResponse.data) : 'N/A');
        console.log('  - agentResponse.data.emails:', agentResponse?.data?.emails ? `ARRAY with ${agentResponse.data.emails.length} items` : 'MISSING');
        console.log('  - agentResponse.error:', agentResponse?.error || 'NONE');
        console.log('  - agentResponse.message:', agentResponse?.message || 'NONE');
        console.log('');
        
        if (agentResponse?.data?.emails && agentResponse.data.emails.length > 0) {
          console.log('📧 First Email Sample:');
          console.log('  - Subject:', agentResponse.data.emails[0].subject);
          console.log('  - Sections:', Object.keys(agentResponse.data.emails[0].sections || {}));
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (!agentResponse.found || !agentResponse.data) {
          console.error('❌ [SEQUENCE AGENT] Validation failed:');
          console.error('   - found check:', !agentResponse.found ? 'FAILED ❌' : 'PASSED ✅');
          console.error('   - data check:', !agentResponse.data ? 'FAILED ❌' : 'PASSED ✅');
          throw new Error('Sequence agent execution failed or returned no data');
        }

        // Parse SEQUENCE agent output
        const emails = agentResponse.data?.emails || [];
        
        console.log('📧 [EMAIL PARSING] Extracted emails array:', {
          length: emails.length,
          isArray: Array.isArray(emails),
          firstEmailKeys: emails[0] ? Object.keys(emails[0]) : 'N/A'
        });
        
        if (emails.length === 0) {
          console.error('❌ [EMAIL PARSING] No emails found in response!');
          throw new Error('Sequence agent returned no emails');
        }

        console.log(`✅ Sequence agent generated ${emails.length} emails`);
        
        // LOG FULL EMAIL CONTENT FOR DEBUGGING
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 [EMAIL CONTENT - FULL DIAGNOSTIC]');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        emails.forEach((email: any, index: number) => {
          console.log(`\n📨 EMAIL ${index + 1}:`);
          console.log('  Subject:', email.subject || 'MISSING');
          console.log('  Sections keys:', email.sections ? Object.keys(email.sections) : 'NO SECTIONS');
          if (email.sections) {
            Object.entries(email.sections).forEach(([key, value]) => {
              const content = String(value || '').substring(0, 100);
              console.log(`  - ${key}: ${content ? `"${content}..."` : 'EMPTY'}`);
            });
          }
          console.log('  Full email object:', JSON.stringify(email, null, 2));
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Format emails for display and storage
        jsonContent = { emails }; // Store structured email data
        
        // Concatenate all emails into raw text for highlighting
        rawOutputContent = emails.map((email: any, index: number) => {
          const sections = email.sections || {};
          const emailText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMAIL ${index + 1} OF ${emails.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBJECT: ${email.subject || 'No subject'}

${sections.greeting || ''}

${sections.opening || ''}

${sections.body || ''}

${sections.closing || ''}

${sections.cta || ''}

${sections.ps || ''}

${sections.signature || '%signature%'}
`.trim();
          return emailText;
        }).join('\n\n');

      } else {
        // ===== CONTENT AGENT =====
        console.log('📄 Using Content Agent API (/generate-content/run)');
        
        const contentAgentRequest = {
          agentOId: agentOId,
          runtimeContext: JSON.stringify(octaveRuntimeContext), // Octave expects stringified JSON for content agents
          email: null,
          companyDomain: null,
          companyName: null,
          firstName: null,
          jobTitle: null,
          linkedInProfile: null,
          customContext: {}
        };

        const response = await axios.post(
          `${OCTAVE_BASE_URL}/generate-content/run`,
          contentAgentRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            },
            timeout: 180000 // 3 minute timeout
          }
        );

        agentResponse = response.data;

        if (!agentResponse.found || !agentResponse.data) {
          throw new Error('Content agent execution failed or returned no data');
        }

        console.log('✅ Content agent execution successful');

        // Parse CONTENT agent output
        rawOutputContent = agentResponse.data?.content || '';
        jsonContent = agentResponse.data?.jsonContent || {};
      }

    } catch (agentExecError: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [AGENT EXECUTION ERROR - FULL DIAGNOSTIC]');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🔥 Error Type:', agentExecError.constructor.name);
      console.error('🔥 Error Message:', agentExecError.message);
      console.error('🔥 Error Stack:', agentExecError.stack);
      
      if (agentExecError.response) {
        // Axios error with response
        console.error('📡 HTTP Response Error:');
        console.error('  - Status:', agentExecError.response.status);
        console.error('  - Status Text:', agentExecError.response.statusText);
        console.error('  - Response Data:', JSON.stringify(agentExecError.response.data, null, 2));
        console.error('  - Response Headers:', agentExecError.response.headers);
      } else if (agentExecError.request) {
        // Axios error with request but no response
        console.error('📡 HTTP Request Error (No Response):');
        console.error('  - Request:', agentExecError.request);
      } else {
        // Other error
        console.error('🔥 Non-HTTP Error:', agentExecError);
      }
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return NextResponse.json(
        {
          success: false,
          error: `Failed to execute ${isSequenceAgent ? 'sequence' : 'content'} agent`,
          details: agentExecError.response?.data?.message || agentExecError.message
        },
        { status: 500 }
      );
    }

    console.log(`📝 Raw output length: ${rawOutputContent.length} characters`);

    // Immediately highlight the copy using existing highlighting function
    console.log('🎨 Highlighting campaign copy...');
    
    // Build highlighting context
    const highlightingContext = {
      personas: runtimeContextData.personas || [],
      useCases: runtimeContextData.use_cases || [],
      clientReferences: intermediary.client_references || []
    };

    let highlightedHtml = rawOutputContent;
    try {
      highlightedHtml = await highlightOutput(rawOutputContent, highlightingContext, campaign.play_code);
      console.log('✅ Highlighting completed successfully');
    } catch (highlightError: any) {
      console.error('❌ Highlighting error:', highlightError);
      // Don't fail the request, just log and use raw content
      highlightedHtml = rawOutputContent;
    }

    // Save final outputs to campaign
    const finalOutputs = {
      campaign_copy: jsonContent, // Structured email sequence
      raw_content: rawOutputContent,
      highlighted_html: highlightedHtml,
      validation_report: {
        hasPlaceholders: checkForPlaceholders(rawOutputContent),
        hasCTA: rawOutputContent.toLowerCase().includes('meeting') || rawOutputContent.toLowerCase().includes('call'),
        hasConferenceTieIn: campaign.campaign_type?.toLowerCase().includes('conference') ? 
          (rawOutputContent.toLowerCase().includes('conference') || rawOutputContent.toLowerCase().includes('event')) : 
          true
      },
      agent_o_id: agentOId,
      agent_name: agentName
    };

    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        final_outputs: finalOutputs,
        status: 'assets_generated',
        // Set approval status based on list requirements
        approval_status: campaign.list_status === 'not_required' ? 'pending_copy' : 'pending_list'
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('❌ Error updating campaign with final outputs:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save campaign copy' },
        { status: 500 }
      );
    }

    console.log('✅ Campaign copy generated and saved');

    return NextResponse.json({
      success: true,
      finalOutputs: {
        rawContent: rawOutputContent,
        highlightedHtml: highlightedHtml,
        campaignCopy: jsonContent,
        validationReport: finalOutputs.validation_report
      }
    });

  } catch (error: any) {
    console.error('❌ Error in POST /api/client/campaigns/[id]/generate-copy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate campaign copy', details: error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function getSequenceLengthForPlay(playCode: string): number {
  // Conference plays typically have 3-4 email sequence
  if (playCode.startsWith('2009') || playCode.startsWith('2010')) {
    return 4;
  }
  // Most outbound plays have 3-email sequence
  if (playCode.startsWith('2')) {
    return 3;
  }
  // Nurture plays vary
  if (playCode.startsWith('1')) {
    return 3;
  }
  // Allbound plays are typically single messages
  return 1;
}

function isConferencePlay(playCode: string): boolean {
  // Conference plays: 2009 (pre-conference), 2010 (post-conference)
  return playCode === '2009' || playCode === '2010';
}

function checkForPlaceholders(content: string): boolean {
  // Check for common placeholder patterns
  const placeholderPatterns = [
    /\{\{[^}]+\}\}/g, // {{first_name}}, {{company_name}}
    /%[a-z_]+%/gi, // %signature%, %first_name%
    /\$\{[^}]+\}/g, // ${first_name}
    /\[INSERT [^\]]+\]/gi // [INSERT COMPANY NAME]
  ];

  return placeholderPatterns.some(pattern => pattern.test(content));
}
