import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { generateCampaignContent, parseJsonResponse } from '@/lib/campaign-generation';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

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

    // Build comprehensive prompt based on strategic requirements
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

CRITICAL INSTRUCTIONS:
99.99% of the intermediary outputs MUST be generated from the campaign brief above. Only use Octave Strategic Elements if specific information is missing from the brief.

YOUR TASK: Generate the following intermediary campaign elements based EXCLUSIVELY on the campaign brief above:

1. LIST BUILDING STRATEGY (2-10 sentences):
   Describe the accounts and prospects we're reaching out to. Include:
   - Account criteria: industry, size, location, revenue, etc.
   - Prospect criteria: job titles, decision makers, personas
   - Specific instructions from brief: buildings, addresses, conference lists, websites to scrape, communities, groups
   - Use personas from Octave Strategic Elements ONLY if not specified in brief
   The list building strategy should be tailored and specific, relying heavily on personas from Octave Strategic Elements if needed, but primarily driven by the campaign brief.

2. HOOK (Shared Touchpoint) - 1-2 sentences:
   The hook is 99% of the time a shared touchpoint that builds trust immediately. CRITICAL: Identify the shared touchpoint from the brief:
   - Location-based (city, region) - e.g., "I saw you're based in Chicago"
   - Conference-based (trade show, event) - e.g., "I saw you exhibit at CES"
   - Community-based (groups, associations) - e.g., "I noticed you're part of the EOS community"
   - Industry-based (specific language only people in that industry understand) - e.g., "IP law partners", "CVIP compliance"
   - Technology-based (specific tech stack, tools) - e.g., "NLPatent Visualize"
   - Company description-based (very specific language from the brief)
   The hook MUST call out this shared touchpoint in the FIRST LINE. This is critical for building trust in cold outbound.

3. ATTRACTION OFFER:
   A high-value, low-friction offer. Structure:
   - Headline: Name of the offer (e.g., "Free Innovation Assessment", "Claire AICRO")
   - Value Bullets: 3-5 bullet points of amazing outcomes:
     * Saves time
     * Makes money
     * Saves money
     * Increases status
   - Ease Bullets: 1-2 bullet points showing how easy it is to get:
     * "5 minutes at your convenience"
     * "30-minute call where you leave with [tangible deliverable]"
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
   List relevant case studies from Octave Strategic Elements Library. For each:
   - Client name (or "Able to be named" / "Not allowed to be name-dropped")
   - Description with: results, statistics, testimonials, timelines, transformations, revenue/profit/EBITDA/valuation details
   - Industry-specific language and high-trust details
   Only include case studies that are relevant to the campaign brief.

AVAILABLE OCTAVE STRATEGIC ELEMENTS (use ONLY if information missing from brief):
${workspaceData?.personas ? `Personas: ${JSON.stringify(workspaceData.personas.slice(0, 10), null, 2)}` : 'No personas available'}
${workspaceData?.use_cases ? `Use Cases: ${JSON.stringify(workspaceData.use_cases.slice(0, 10), null, 2)}` : 'No use cases available'}
${workspaceData?.client_references ? `Client References: ${JSON.stringify(workspaceData.client_references.slice(0, 10), null, 2)}` : 'No client references available'}

OUTPUT FORMAT: Return a JSON object with this EXACT structure (no markdown, pure JSON):
{
  "listBuildingStrategy": "2-10 sentence description of accounts and prospects...",
  "hook": "1-2 sentences calling out shared touchpoint in first line",
  "attractionOffer": {
    "headline": "Name of the offer",
    "valueBullets": ["Outcome 1", "Outcome 2", "Outcome 3"],
    "easeBullets": ["How easy it is to get"]
  },
  "asset": {
    "type": "link" | "description" | "lovable_prompt",
    "content": "URL, description, or Lovable prompt",
    "url": "https://..." (only if type is "link")
  },
  "caseStudies": [
    {
      "clientName": "Company Name or 'Able to be named'",
      "canNameDrop": true,
      "description": "Description with results, statistics, testimonials...",
      "results": "Specific results, revenue, profit, EBITDA, valuation details"
    }
  ]
}
`;

    // Generate using OpenAI instead of Context Agent
    console.log('🎨 Generating intermediary outputs using OpenAI...');
    const response = await generateCampaignContent(campaignBrief, {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 4000
    });
    
    // Parse JSON response
    let intermediaryOutputs: any = {};
    try {
      intermediaryOutputs = parseJsonResponse(response);
    } catch (parseError: any) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.error('Raw response:', response.substring(0, 500));
      // Fallback: try to extract structured data from text
      intermediaryOutputs = {
        listBuildingStrategy: extractSection(response, 'LIST BUILDING STRATEGY', 'HOOK'),
        hook: extractSection(response, 'HOOK', 'ATTRACTION OFFER'),
        attractionOffer: {
          headline: extractSection(response, 'ATTRACTION OFFER', 'Value'),
          valueBullets: extractBullets(response, 'Value'),
          easeBullets: extractBullets(response, 'Ease')
        },
        asset: {
          type: 'description',
          content: extractSection(response, 'ASSET', 'CASE STUDIES')
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
