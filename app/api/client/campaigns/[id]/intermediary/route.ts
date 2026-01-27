import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// POST - Generate intermediary outputs for campaign
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

    // Get workspace data for Octave strategic elements
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (workspaceError || !workspaceData) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Build comprehensive prompt based on strategic requirements
    const campaignBrief = campaign.campaign_brief || {};
    const campaignBriefText = `
CAMPAIGN BRIEF FOR ${campaign.campaign_name}

Campaign Type: ${campaign.campaign_type || 'Not specified'}
Play Code: ${campaign.play_code}

Meeting Transcript:
${campaignBrief.meeting_transcript || 'None provided'}

Written Strategy (Emails, Slack, Teams messages):
${campaignBrief.written_strategy || 'None provided'}

Documents/Blog Posts:
${campaignBrief.documents?.join('\n') || 'None provided'}
${campaignBrief.blog_posts?.join('\n') || ''}

Additional Campaign Brief:
${campaign.additional_brief || 'None provided'}

---

CRITICAL INSTRUCTIONS:
99.99% of the intermediary outputs MUST be generated from the campaign brief above. Only use Octave Strategic Elements if specific information is missing from the brief.

YOUR TASK: Generate the following intermediary campaign elements based EXCLUSIVELY on the campaign brief above:

1. LIST BUILDING STRATEGY (2-10 sentences):
   Describe the accounts and prospects we're reaching out to. Include:
   - Account criteria: industry, size, location, revenue, etc.
   - Prospect criteria: job titles, decision makers, personas
   - Specific instructions from brief: conference attendees, buildings, addresses, websites to scrape, communities, groups
   - Use personas from Octave Strategic Elements ONLY if not specified in brief
   The list building strategy should be tailored and specific, relying heavily on personas from Octave Strategic Elements if needed, but primarily driven by the campaign brief.

2. HOOK (Shared Touchpoint) - 1-2 sentences:
   The hook is 99% of the time a shared touchpoint that builds trust immediately. CRITICAL: Identify the shared touchpoint from the brief:
   - Location-based (city, region) - e.g., "I saw you're based in Chicago"
   - Conference-based (trade show, event) - e.g., "I saw you exhibit at CES", "Both attending [event name]"
   - Community-based (groups, associations) - e.g., "I noticed you're part of the EOS community"
   - Industry-based (specific language only people in that industry understand) - e.g., "IP law partners", "CVIP compliance"
   - Technology-based (specific tech stack, tools) - e.g., "NLPatent Visualize"
   - Company description-based (very specific language from the brief)
   The hook MUST call out this shared touchpoint in the FIRST LINE. This is critical for building trust in cold outbound.
   
   FOR CONFERENCE PLAYS (2009, 2010): The hook MUST tie to WHY attendees are there (buyer vs solution partner dynamic), the conference-specific context, and the primary pain point. Example: "I saw you're attending [Conference Name] - most [job titles] I meet there are trying to improve [outcome] but keep running into [problem]."

3. ATTRACTION OFFER:
   A high-value, low-friction offer. Structure:
   - Headline: Name of the offer (e.g., "Free Innovation Assessment", "Claire AICRO", "20-Minute On-Site Meeting")
   - Value Bullets: 3-5 bullet points of amazing outcomes:
     * Saves time
     * Makes money
     * Saves money
     * Increases status
   - Ease Bullets: 1-2 bullet points showing how easy it is to get:
     * "5 minutes at your convenience"
     * "30-minute call where you leave with [tangible deliverable]"
     * "15-20 minute on-site meeting at [conference]"
   If offer isn't explicitly described in brief, you may reference previous offers, but prioritize what's in the brief.

4. ASSET:
   The landing page, blog post, white paper, tool, or link associated with the campaign.
   - If link provided in brief: Output the URL
   - If described but no link: Description of where to find it (e.g., "This asset already exists. You can find it at [location]")
   - If no asset mentioned: Generate a Lovable prompt to create the landing page
   
   LOVABLE PROMPT FORMAT (if no asset found):
   "No asset provided in campaign brief. Lovable prompt provided below.
   
   We are building an outbound campaign landing page asset for the following campaign: [5 sentence description of who we're targeting, what the attraction offer is, and why it is a successful campaign. Include case studies if relevant.]
   
   Use the brand guidelines from ${workspaceData?.company_domain || '[company domain]'} and make sure the micro-deliverable asset is easily readable."

5. CASE STUDIES (Optional):
   List relevant case studies from Octave Strategic Elements Library or extracted from the campaign brief. For each:
   - Client name (or "Able to be named" / "Not allowed to be name-dropped")
   - Description with: results, statistics, testimonials, timelines, transformations, revenue/profit/EBITDA/valuation details
   - Industry-specific language and high-trust details
   Only include case studies that are relevant to the campaign brief.

6. PERSONAS & USE CASES (Auto-filled from Octave):
   - Extract personas from workspace strategic elements
   - Extract use cases from workspace strategic elements
   - Map them to the campaign based on the brief context

AVAILABLE OCTAVE STRATEGIC ELEMENTS (use ONLY if information missing from brief):

PERSONAS:
${workspaceData.personas?.map((p: any) => `- ${p.name}: ${p.description || ''}`).join('\n') || 'None'}

USE CASES:
${workspaceData.use_cases?.map((uc: any) => `- ${uc.name}: Desired Outcome: ${uc.desired_outcome || ''}, Blocker: ${uc.blocker || ''}`).join('\n') || 'None'}

CLIENT REFERENCES:
${workspaceData.client_references?.map((ref: any) => `- ${ref.name}: ${ref.description || ''}`).join('\n') || 'None'}

COMPANY CONTEXT:
- Company Name: ${workspaceData.company_name || ''}
- Company Domain: ${workspaceData.company_domain || ''}

---

OUTPUT FORMAT (JSON):
{
  "listBuildingInstructions": "...",
  "hook": "...",
  "attractionOffer": {
    "headline": "...",
    "valueBullets": ["...", "...", "..."],
    "easeBullets": ["...", "..."]
  },
  "asset": {
    "type": "landing_page|blog_post|white_paper|tool|lovable_prompt",
    "content": "...",
    "url": "..."
  },
  "caseStudies": [
    {
      "clientName": "...",
      "description": "..."
    }
  ],
  "personas": [
    {
      "oId": "...",
      "name": "...",
      "description": "..."
    }
  ],
  "useCases": [
    {
      "oId": "...",
      "name": "...",
      "desiredOutcome": "...",
      "blocker": "..."
    }
  ]
}
`;

    // Call OpenAI to generate intermediary outputs
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    console.log('🤖 Generating intermediary outputs with OpenAI...');
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a campaign strategist helping to extract structured intermediary outputs from campaign briefs. Always return valid JSON matching the specified format.'
          },
          {
            role: 'user',
            content: campaignBriefText
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const intermediaryOutputs = JSON.parse(openaiResponse.data.choices[0].message.content);
    console.log('✅ Intermediary outputs generated');

    // Update campaign with intermediary outputs
    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        intermediary_outputs: {
          list_building_instructions: intermediaryOutputs.listBuildingInstructions,
          hook: intermediaryOutputs.hook,
          attraction_offer: intermediaryOutputs.attractionOffer,
          asset: intermediaryOutputs.asset,
          case_studies: intermediaryOutputs.caseStudies || [],
          client_references: intermediaryOutputs.clientReferences || []
        },
        runtime_context: {
          personas: intermediaryOutputs.personas || [],
          use_cases: intermediaryOutputs.useCases || [],
          problems: [] // Can be extracted later
        },
        status: 'intermediary_generated'
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('❌ Error updating campaign:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to save intermediary outputs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      intermediaryOutputs: {
        listBuildingInstructions: intermediaryOutputs.listBuildingInstructions,
        hook: intermediaryOutputs.hook,
        attractionOffer: intermediaryOutputs.attractionOffer,
        asset: intermediaryOutputs.asset,
        caseStudies: intermediaryOutputs.caseStudies || [],
        personas: intermediaryOutputs.personas || [],
        useCases: intermediaryOutputs.useCases || []
      }
    });

  } catch (error: any) {
    console.error('❌ Error generating intermediary outputs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate intermediary outputs',
        details: error.response?.data || error.message 
      },
      { status: 500 }
    );
  }
}
