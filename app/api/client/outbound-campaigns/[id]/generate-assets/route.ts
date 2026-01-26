import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { highlightOutput } from '@/lib/output-highlighting';
import { generateCampaignContent, parseJsonResponse } from '@/lib/campaign-generation';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

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

    // Get workspace data
    const { data: workspaceData } = await supabaseAdmin
      .from('octave_outputs')
      .select('personas, use_cases, client_references, company_domain, company_name')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 1. Generate Campaign Copy (3 email sequence) using OpenAI
    const assetUrl = intermediary.asset?.url || intermediary.asset?.content || 'Not specified';
    const businessTopic = intermediary.attractionOffer?.headline || campaign.campaign_name;
    
    const emailPrompt = `
Generate a 3-email outbound campaign sequence based on the following campaign details. Use the SHARED HOOK and ATTRACTION OFFER from the intermediary outputs.

CAMPAIGN DETAILS:
- Campaign Name: ${campaign.campaign_name}
- Hook (Shared Touchpoint): ${intermediary.hook || 'Not specified'}
- Attraction Offer Headline: ${intermediary.attractionOffer?.headline || 'Not specified'}
- Attraction Offer Value Bullets: ${intermediary.attractionOffer?.valueBullets?.join('\n- ') || 'Not specified'}
- Attraction Offer Ease Bullets: ${intermediary.attractionOffer?.easeBullets?.join('\n- ') || 'Not specified'}
- Asset Link: ${assetUrl}

CRITICAL: You MUST use the SHARED HOOK in the FIRST LINE of each Email 1A, 1B, and 1C. The hook builds trust immediately.

EMAIL TEMPLATES FOR STRUCTURE AND TONE INSPIRATION:

=== EMAIL 1A, 1B, 1C (Three Variations) ===

EXAMPLE 1A TEMPLATE:
SUBJECT LINE: {{company_name}} – {{Posted_Job_Title}}

{Hi {{first_name}},|Hey {{first_name}},|Hello {{first_name}},|Good {{sl_time_of_day}} {{first_name}}, }

I just saw you're hiring a {{Posted_Job_Title}} role.

This usually means the company wants to improve qualified pipeline, long-term lead nurturing, or low-value CRM admin tasks.

Instead of waiting months for a new hire to ramp, we install an AI‑powered Sales system plus three fractional experts that do 80–90% of that role in under 90 days for $10–50M B2B service companies.

In practice, it often costs less than the fully loaded salary of the role you're posting for.

I put together a 2‑minute walkthrough of how this works in companies like yours.

Would it be worth it to compare "hire a {{Posted Job Title}}" vs "deploy a system + fractional team" on a 15‑minute call next week?

If you're open to it, I'll send over a couple times.

{Corey Peck | Corey | Corey P}
CEO, Fractional Ops

---

EXAMPLE 1B TEMPLATE (Conference-based):
Subject Line: {CES Booth-Side - Innovation Assessment|CES - {{company_name}}'s Innovation Assessment|CES - {{company_name}} x NLPatent}

{Hi {{first_name}},|Hey {{first_name}},|Hello {{first_name}},|Good {{sl_time_of_day}} {{first_name}}, }

I saw {{company_name}} exhibit at CES – we were offering free Innovation Assessments booth-side, and I'd be happy to run one for you.

Other IP leaders have used this to identify white space, guide FTO/strategy, and gain a comprehensive understanding of competitive portfolios.

You can:

- Uncover blocking patents in adjacent tech (missed by keywords)
- Map portfolio gaps for novel innovations
- Compress analysis from weeks to days
- Avoid R&D surprises with confident market entry

{Would you like to conduct a free Innovation Assessment for {{company_name}}? Let me know a few dates/times that work for you, and I'll make myself available.|Are any of those a priority for you at {{company_name}}?|Would you like to conduct a free Innovation Assessment for {{company_name}}?}

Regards,

%signature%

---

EXAMPLE 1C TEMPLATE (Location/Community-based):
Subject Line: YC Growth Familiarity

{Hi {{first_name}},|Hello {{first_name}},|Good {{sl_time_of_day}} {{first_name}},}

We're a Bay Area–based commercial brokerage firm and have been tracking {{company_name}}'s trajectory with interest.

Our team at Faller Real Estate is tenant rep exclusive with undivided fiduciary duty, no landlord ties. We curate and vet spaces personally, aligning leases to volatile growth.

We've helped YC peers like LetterAI and Polymath Robotics scale flexibly.

Are you interested in chatting, or if it's helpful, we can send our "Real Estate Planning Guide"?

Regards,

%signature%

---

=== EMAIL 2 (Asset-Based Follow-up) ===

EXAMPLE EMAIL 2 TEMPLATE 1:
{Hi {{first_name}},|Hey {{first_name}},|Hello {{first_name}},|Good {{sl_time_of_day}} {{first_name}}, }

I wanted to follow up - I'd value your input post-CES.

Our Free Innovation Assessment uses NLPatent Visualize - helping IP leaders spot white space, competitive shifts, and data missed in raw results.

If that's helpful, you can start your Free Innovation Assessment here: <Visualize Trends. Uncover Opportunities>. <THIS IS HYPER LINKED WITH LINK>

When would be a good time this week for you to take the Innovation Assessment?

{Regards|Best},

%signature%

---

EXAMPLE EMAIL 2 TEMPLATE 2:
{Hi {{first_name}},|Hello {{first_name}},|Good {{sl_time_of_day}} {{first_name}},}

This is how we helped YC-graduate LetterAI: They outgrew their initial SF office in 4 months, but we expanded them in the same building via built-in flexible terms - allowing them to keep momentum (with zero penalties).

If it's helpful, I'm happy to pass along options in the Bay Area market that would suit you, or feel free to check out our <Real Estate Planning Guide>. <THIS IS HYPER LINKED, ASSET OF CAMPAIGN>

Best,

%signature%

---

=== EMAIL 3 (Simple Template - ALWAYS THE SAME) ===

CRITICAL: Email 3 is ALWAYS the same template for every campaign with ONLY the BUSINESS_TOPIC changing.

Template:
{Hi {{first_name}},|Hey {{first_name}},|Hello {{first_name}},|Good {{sl_time_of_day}} {{first_name}}, }

If you're not the right person to connect with in regards to [BUSINESS_TOPIC], I'd really appreciate it if you could point me in the right direction.

Who on your team would you recommend I reach out to?

Warm regards,

%signature%

BUSINESS_TOPIC for this campaign: ${businessTopic}

---

INSTRUCTIONS:
1. For Email 1A, 1B, 1C: Use the SHARED HOOK in the FIRST LINE. Create three distinct variations that use the hook creatively with the attraction offer.
2. For Email 2: Reference the asset/offer and include a hyperlinked CTA. Use format: <Link Text>. <THIS IS HYPER LINKED WITH LINK>
3. For Email 3: Use the exact template above, replacing [BUSINESS_TOPIC] with: ${businessTopic}
4. Use %signature% placeholder for signatures
5. Use {{variable}} format for personalization variables (company_name, first_name, etc.)

OUTPUT FORMAT: Return JSON with this EXACT structure (no markdown, pure JSON):
{
  "email1A": { "subject": "...", "body": "..." },
  "email1B": { "subject": "...", "body": "..." },
  "email1C": { "subject": "...", "body": "..." },
  "email2": { "subject": "...", "body": "..." },
  "email3": { "subject": "...", "body": "..." }
}
`;

    console.log('📧 Generating campaign copy using OpenAI...');
    let campaignCopy: any = {};
    try {
      const emailResponse = await generateCampaignContent(emailPrompt, {
        model: 'gpt-4o-mini',
        temperature: 0.4,
        maxTokens: 4000
      });
      campaignCopy = parseJsonResponse(emailResponse);
    } catch (e: any) {
      console.error('❌ Failed to generate campaign copy:', e);
      // Fallback structure
      campaignCopy = {
        email1A: { subject: 'Subject 1A', body: 'Failed to generate email 1A. Please try again.' },
        email1B: { subject: 'Subject 1B', body: 'Failed to generate email 1B. Please try again.' },
        email1C: { subject: 'Subject 1C', body: 'Failed to generate email 1C. Please try again.' },
        email2: { subject: 'Follow-up', body: 'Failed to generate email 2. Please try again.' },
        email3: { subject: 'Can you help?', body: `If you're not the right person to connect with in regards to ${businessTopic}, I'd really appreciate it if you could point me in the right direction.\n\nWho on your team would you recommend I reach out to?\n\nWarm regards,\n\n%signature%` }
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
        console.warn('⚠️ Agent 1009 not found, using OpenAI as fallback');
        // Fallback to OpenAI
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

        try {
          nurtureSequence = await generateCampaignContent(nurtureContext, {
            model: 'gpt-4o-mini',
            temperature: 0.4,
            maxTokens: 4000
          });
        } catch (fallbackError: any) {
          console.error('❌ OpenAI fallback failed:', fallbackError);
          nurtureSequence = 'Failed to generate nurture sequence. Please try again or contact support.';
        }
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
