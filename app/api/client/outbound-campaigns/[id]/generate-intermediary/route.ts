import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

const CONTEXT_AGENT_ID = 'ca_z4M5gc4srgrZ4NrhOCBFA';
const OCTAVE_CONTEXT_AGENT_URL = 'https://app.octavehq.com/api/v2/agents/context/run';

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

    // Get workspace data for Octave elements
    const { data: workspaceData } = await supabaseAdmin
      .from('octave_outputs')
      .select('personas, use_cases, client_references, company_domain, company_name')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Build comprehensive prompt for Context Agent
    const campaignBrief = `
CAMPAIGN BRIEF FOR OUTBOUND CAMPAIGN CREATION

Campaign Name: ${campaign.campaign_name}

Meeting Transcript:
${campaign.meeting_transcript || 'None provided'}

Written Strategy (Emails, Slack, Teams messages):
${campaign.written_strategy || 'None provided'}

Additional Campaign Brief:
${campaign.additional_brief || 'None provided'}

---

YOUR TASK: Generate the following intermediary campaign elements based on the campaign brief above:

1. LIST BUILDING STRATEGY: A 2-10 sentence description of the accounts and prospects we're reaching out to. Include:
   - Account criteria (industry, size, location, revenue, etc.)
   - Prospect criteria (job titles, decision makers, personas)
   - Any specific instructions from the brief (buildings, addresses, conference lists, websites to scrape, communities, groups)

2. HOOK (Shared Touchpoint): The hook is 99% of the time a shared touchpoint that builds trust immediately. Identify:
   - Location-based (city, region)
   - Conference-based (trade show, event)
   - Community-based (groups, associations)
   - Industry-based (specific language only people in that industry understand)
   - Technology-based (specific tech stack, tools)
   - Company description-based (very specific language from the brief)
   The hook should be 1-2 sentences that call out this shared touchpoint in the first line.

3. ATTRACTION OFFER: A high-value, low-friction offer with:
   - Headline: Name of the offer (e.g., "Free Innovation Assessment", "Claire AICRO")
   - Value Bullets: 3-5 bullet points of amazing outcomes (saves time, makes money, saves money, increases status)
   - Ease Bullets: 1-2 bullet points showing how easy it is to get (e.g., "5 minutes at your convenience", "30-minute call where you leave with...")

4. ASSET: The landing page, blog post, white paper, tool, or link associated with the campaign. Output:
   - If link provided in brief: The URL
   - If described but no link: Description of where to find it
   - If no asset mentioned: Generate a Lovable prompt to create the landing page (include brand guidelines from ${workspaceData?.company_domain || 'company domain'} and campaign description)

5. CASE STUDIES (Optional): List relevant case studies from the strategic elements library. For each:
   - Client name (or "Able to be named" / "Not allowed to be name-dropped")
   - Description with results, statistics, testimonials, timelines, transformations, revenue/profit/EBITDA/valuation details
   - Industry-specific language and high-trust details

${workspaceData?.personas ? `Available Personas: ${JSON.stringify(workspaceData.personas.slice(0, 5))}` : ''}
${workspaceData?.use_cases ? `Available Use Cases: ${JSON.stringify(workspaceData.use_cases.slice(0, 5))}` : ''}
${workspaceData?.client_references ? `Available Client References: ${JSON.stringify(workspaceData.client_references.slice(0, 5))}` : ''}

OUTPUT FORMAT: Return a JSON object with this exact structure:
{
  "listBuildingStrategy": "...",
  "hook": "...",
  "attractionOffer": {
    "headline": "...",
    "valueBullets": ["...", "...", "..."],
    "easeBullets": ["...", "..."]
  },
  "asset": {
    "type": "link" | "description" | "lovable_prompt",
    "content": "...",
    "url": "..." (if type is "link")
  },
  "caseStudies": [
    {
      "clientName": "...",
      "canNameDrop": true,
      "description": "...",
      "results": "..."
    }
  ]
}
`;

    // Call Context Agent
    const response = await axios.post(
      OCTAVE_CONTEXT_AGENT_URL,
      {
        agentOId: CONTEXT_AGENT_ID,
        runtimeContext: campaignBrief,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api_key': campaign.workspace_api_key,
        },
        timeout: 120000 // 2 minute timeout
      }
    );

    const agentResponse = response.data?.output || response.data?.text || response.data?.message || '';
    
    // Try to parse JSON from response
    let intermediaryOutputs: any = {};
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = agentResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       agentResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, agentResponse];
      const jsonStr = jsonMatch[1] || agentResponse;
      intermediaryOutputs = JSON.parse(jsonStr);
    } catch (parseError) {
      // If JSON parsing fails, try to extract structured data from text
      console.warn('⚠️ Failed to parse JSON, attempting text extraction');
      intermediaryOutputs = {
        listBuildingStrategy: extractSection(agentResponse, 'LIST BUILDING STRATEGY', 'HOOK'),
        hook: extractSection(agentResponse, 'HOOK', 'ATTRACTION OFFER'),
        attractionOffer: {
          headline: extractSection(agentResponse, 'ATTRACTION OFFER', 'Value'),
          valueBullets: extractBullets(agentResponse, 'Value'),
          easeBullets: extractBullets(agentResponse, 'Ease')
        },
        asset: {
          type: 'description',
          content: extractSection(agentResponse, 'ASSET', 'CASE STUDIES')
        },
        caseStudies: []
      };
    }

    // Update campaign with intermediary outputs
    const { error: updateError } = await supabaseAdmin
      .from('outbound_campaigns')
      .update({
        intermediary_outputs: intermediaryOutputs,
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
      intermediaryOutputs
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

// Helper functions to extract sections from text if JSON parsing fails
function extractSection(text: string, startMarker: string, endMarker: string): string {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return '';
  const endIdx = text.indexOf(endMarker, startIdx + startMarker.length);
  if (endIdx === -1) return text.substring(startIdx + startMarker.length).trim();
  return text.substring(startIdx + startMarker.length, endIdx).trim();
}

function extractBullets(text: string, section: string): string[] {
  const sectionText = extractSection(text, section, '');
  const bulletRegex = /[-•*]\s*(.+)/g;
  const bullets: string[] = [];
  let match;
  while ((match = bulletRegex.exec(sectionText)) !== null) {
    bullets.push(match[1].trim());
  }
  return bullets;
}
