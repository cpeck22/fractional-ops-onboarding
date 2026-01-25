import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { highlightOutput } from '@/lib/output-highlighting';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

const OCTAVE_CONTEXT_AGENT_URL = 'https://app.octavehq.com/api/v2/agents/context/run';
const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

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

    // Get campaign with intermediary outputs
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('outbound_campaigns')
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

    const intermediary = campaign.intermediary_outputs || {};

    // Get workspace data (including Context Agent ID)
    const { data: workspaceData } = await supabaseAdmin
      .from('octave_outputs')
      .select('personas, use_cases, client_references, company_domain, company_name, workspace_context_agent_id')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!workspaceData?.workspace_context_agent_id) {
      return NextResponse.json(
        { success: false, error: 'Context Agent not configured for your workspace. Please contact Fractional Ops to regenerate your workspace.' },
        { status: 404 }
      );
    }

    // 1. Generate Campaign Copy (3 email sequence)
    const emailPrompt = `
Generate a 3-email outbound campaign sequence based on the following campaign details:

CAMPAIGN DETAILS:
- Campaign Name: ${campaign.campaign_name}
- Hook (Shared Touchpoint): ${intermediary.hook || 'Not specified'}
- Attraction Offer: ${intermediary.attractionOffer?.headline || 'Not specified'}
- Attraction Offer Value: ${intermediary.attractionOffer?.valueBullets?.join(', ') || 'Not specified'}
- Asset Link: ${intermediary.asset?.url || intermediary.asset?.content || 'Not specified'}

EMAIL TEMPLATES FOR REFERENCE:

Email 1A, 1B, 1C (Three Variations):
SUBJECT LINE: Use the hook and attraction offer creatively

BODY STRUCTURE:
- Opening: Use the hook (shared touchpoint) in first line
- Context: Reference the shared touchpoint and why it matters
- Value Proposition: Introduce the attraction offer
- Value Bullets: List key benefits from attraction offer
- CTA: Soft ask for meeting or to access the offer
- Signature: Use %signature% placeholder

Email 2 (Asset-Based Follow-up):
SUBJECT LINE: Reference the asset/offer

BODY:
- Follow-up on previous email
- Reference the attraction offer and asset
- Include hyperlinked CTA to the asset
- Ask when they can access it

Email 3 (Simple Template):
SUBJECT LINE: Simple follow-up

BODY:
- If you're not the right person to connect with in regards to [BUSINESS_TOPIC based on campaign], I'd really appreciate it if you could point me in the right direction.
- Who on your team would you recommend I reach out to?
- Warm regards, %signature%

BUSINESS_TOPIC should be relevant to: ${intermediary.attractionOffer?.headline || campaign.campaign_name}

OUTPUT FORMAT: Return JSON with this structure:
{
  "email1A": { "subject": "...", "body": "..." },
  "email1B": { "subject": "...", "body": "..." },
  "email1C": { "subject": "...", "body": "..." },
  "email2": { "subject": "...", "body": "..." },
  "email3": { "subject": "...", "body": "..." }
}
`;

    const emailResponse = await axios.post(
      OCTAVE_CONTEXT_AGENT_URL,
      {
        agentOId: workspaceData.workspace_context_agent_id,
        runtimeContext: emailPrompt,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api_key': campaign.workspace_api_key,
        },
        timeout: 120000
      }
    );

    let campaignCopy: any = {};
    try {
      const emailText = emailResponse.data?.output || emailResponse.data?.text || '';
      const jsonMatch = emailText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       emailText.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, emailText];
      campaignCopy = JSON.parse(jsonMatch[1] || emailText);
    } catch (e) {
      console.warn('⚠️ Failed to parse email JSON, using fallback structure');
      campaignCopy = {
        email1A: { subject: 'Subject 1A', body: emailResponse.data?.output || '' },
        email1B: { subject: 'Subject 1B', body: '' },
        email1C: { subject: 'Subject 1C', body: '' },
        email2: { subject: 'Follow-up', body: '' },
        email3: { subject: 'Can you help?', body: '' }
      };
    }

    // 2. List Building Instructions (use intermediary list strategy)
    const listBuildingInstructions = intermediary.listBuildingStrategy || 'List building strategy not generated.';

    // 3. Nurture Sequence (using agent 1009)
    let nurtureSequence = '';
    try {
      // Find agent 1009 by name pattern (same pattern as execute-play route)
      const allAgents = [];
      let offset = 0;
      const limit = 50;
      let hasNext = true;

      while (hasNext) {
        const agentsResponse = await axios.get(
          `${OCTAVE_BASE_URL}/list`,
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': campaign.workspace_api_key
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

      // Search for agent matching "1009" pattern
      const codePattern = '1009';
      let nurtureAgent = allAgents.find((agent: any) => {
        const agentName = (agent.name || '').toLowerCase();
        return agentName.startsWith(codePattern + '_') || 
               agentName.startsWith(codePattern + ' ') ||
               agentName.includes(codePattern);
      });

      if (nurtureAgent) {
        const nurtureContext = `
Generate a 30-day nurture sequence for leads that reply to our outbound campaign but don't book a meeting.

CAMPAIGN CONTEXT:
- Campaign Name: ${campaign.campaign_name}
- Hook: ${intermediary.hook || ''}
- Attraction Offer: ${intermediary.attractionOffer?.headline || ''}
- Attraction Offer Value: ${intermediary.attractionOffer?.valueBullets?.join(', ') || ''}
- Asset: ${intermediary.asset?.url || intermediary.asset?.content || ''}
- List Building Strategy: ${intermediary.listBuildingStrategy || ''}

The sequence should:
- Continue until breakup email (if no response)
- Continue until booked meeting or new reply
- Provide value at each touchpoint
- Reference the campaign hook and offer
- Be personalized and relevant

Include instructions at the top: "Please add this as a sequence in your CRM or create a Word document that has this play so your team can use this to close a deal from the leads that are generated."
`;

        const nurtureResponse = await axios.post(
          `${OCTAVE_BASE_URL}/generate-content/run`,
          {
            agentOId: nurtureAgent.oId,
            runtimeContext: JSON.stringify({ 
              customInput: nurtureContext,
              selectedPersonas: [],
              selectedUseCases: [],
              selectedReferences: []
            })
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': campaign.workspace_api_key
            },
            timeout: 120000
          }
        );

        nurtureSequence = nurtureResponse.data?.data?.content || nurtureResponse.data?.output || '';
      } else {
        console.warn('⚠️ Agent 1009 not found, using Context Agent as fallback');
        // Fallback to Context Agent
        const nurtureContext = `
Generate a 30-day nurture sequence for leads that reply to our outbound campaign but don't book a meeting.

CAMPAIGN CONTEXT:
- Campaign Name: ${campaign.campaign_name}
- Hook: ${intermediary.hook || ''}
- Attraction Offer: ${intermediary.attractionOffer?.headline || ''}
- Attraction Offer Value: ${intermediary.attractionOffer?.valueBullets?.join(', ') || ''}
- Asset: ${intermediary.asset?.url || intermediary.asset?.content || ''}

The sequence should:
- Continue until breakup email (if no response)
- Continue until booked meeting or new reply
- Provide value at each touchpoint
- Reference the campaign hook and offer
- Be personalized and relevant

Include instructions at the top: "Please add this as a sequence in your CRM or create a Word document that has this play so your team can use this to close a deal from the leads that are generated."
`;

        const fallbackResponse = await axios.post(
          OCTAVE_CONTEXT_AGENT_URL,
          {
            agentOId: workspaceData.workspace_context_agent_id,
            runtimeContext: nurtureContext
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': campaign.workspace_api_key
            },
            timeout: 120000
          }
        );

        nurtureSequence = fallbackResponse.data?.output || fallbackResponse.data?.text || '';
      }
    } catch (nurtureError: any) {
      console.error('⚠️ Error generating nurture sequence:', nurtureError);
      nurtureSequence = 'Failed to generate nurture sequence. Please try again or contact support.';
    }

    // 4. Asset (use from intermediary)
    const asset = intermediary.asset || { type: 'description', content: 'No asset provided' };

    // Highlight campaign copy and nurture sequence
    const highlightingContext = {
      personas: workspaceData?.personas?.slice(0, 5) || [],
      useCases: workspaceData?.use_cases?.slice(0, 5) || [],
      clientReferences: workspaceData?.client_references?.slice(0, 5) || []
    };

    // Highlight emails
    const highlightedCampaignCopy: any = {};
    for (const [key, email] of Object.entries(campaignCopy)) {
      if (email && typeof email === 'object' && 'body' in email) {
        const emailBody = typeof email.body === 'string' ? email.body : '';
        const highlighted = await highlightOutput(emailBody, highlightingContext);
        highlightedCampaignCopy[key] = {
          ...email,
          highlightedBody: highlighted
        };
      }
    }

    // Highlight nurture sequence
    const highlightedNurtureSequence = await highlightOutput(nurtureSequence, highlightingContext);

    const finalAssets = {
      campaignCopy: highlightedCampaignCopy,
      listBuildingInstructions,
      nurtureSequence: {
        content: nurtureSequence,
        highlightedContent: highlightedNurtureSequence
      },
      asset
    };

    // Update campaign
    const { error: updateError } = await supabaseAdmin
      .from('outbound_campaigns')
      .update({
        final_assets: finalAssets,
        status: 'assets_generated'
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('❌ Error updating campaign:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save final assets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      finalAssets
    });
  } catch (error: any) {
    console.error('❌ Error generating final assets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate final assets', 
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}
