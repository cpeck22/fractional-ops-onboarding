import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { highlightOutput } from '@/lib/output-highlighting';
import axios from 'axios';

export const dynamic = 'force-dynamic';

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

    // Find agent matching play code
    let agentOId = null;
    let agentName = null;
    let agentType = null;

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
        
        const sequenceAgentRequest = {
          agentOId: agentOId,
          runtimeContext: octaveRuntimeContext, // Pass as object for sequence agents
          email: null,
          companyDomain: null,
          companyName: null,
          firstName: null,
          jobTitle: null,
          linkedInProfile: null,
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

        if (!agentResponse.found || !agentResponse.data) {
          throw new Error('Sequence agent execution failed or returned no data');
        }

        // Parse SEQUENCE agent output
        const emails = agentResponse.data?.emails || [];
        
        if (emails.length === 0) {
          throw new Error('Sequence agent returned no emails');
        }

        console.log(`✅ Sequence agent generated ${emails.length} emails`);

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
      console.error('❌ Agent execution error:', agentExecError.response?.data || agentExecError.message);

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
