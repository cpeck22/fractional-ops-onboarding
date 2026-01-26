import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { highlightOutput } from '@/lib/output-highlighting';
import { generateCampaignContent, parseJsonResponse, createCleanedCampaignBrief } from '@/lib/campaign-generation';

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

    // Create cleaned campaign brief from meeting_transcript, written_strategy, and additional_brief
    console.log('🧹 Creating cleaned campaign brief...');
    const cleanedCampaignBrief = await createCleanedCampaignBrief(
      campaign.campaign_name,
      campaign.meeting_transcript,
      campaign.written_strategy,
      campaign.additional_brief
    );
    console.log('✅ Cleaned campaign brief:', {
      length: cleanedCampaignBrief.length,
      hasContent: cleanedCampaignBrief.length > 0,
      preview: cleanedCampaignBrief.substring(0, 200)
    });

    // ✅ COMPREHENSIVE VALIDATION AND LOGGING
    console.log('🚀 Starting asset generation for campaign:', campaign.campaign_name);
    console.log('🔍 Campaign validation:', {
      campaignId: campaign.id,
      hasWorkspaceApiKey: !!campaign.workspace_api_key,
      hasIntermediaryOutputs: !!campaign.intermediary_outputs,
      intermediaryKeys: Object.keys(intermediary),
      hasCleanedBrief: cleanedCampaignBrief.length > 0
    });

    // Validate intermediary data
    console.log('🔍 Intermediary outputs validation:', {
      hasHook: !!intermediary.hook,
      hasAttractionOffer: !!intermediary.attractionOffer,
      hasListBuildingStrategy: !!intermediary.listBuildingStrategy,
      hasAsset: !!intermediary.asset,
      hookPreview: intermediary.hook?.substring(0, 50),
      attractionOfferHeadline: intermediary.attractionOffer?.headline?.substring(0, 50)
    });

    if (!intermediary.hook || !intermediary.attractionOffer?.headline) {
      console.error('❌ Missing required intermediary data');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required intermediary outputs. Please generate intermediary assets first.',
          details: {
            hasHook: !!intermediary.hook,
            hasAttractionOffer: !!intermediary.attractionOffer?.headline,
            intermediaryKeys: Object.keys(intermediary)
          }
        },
        { status: 400 }
      );
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    console.log('✅ OpenAI API key configured');

    // Check workspace API key
    if (!campaign.workspace_api_key) {
      console.error('❌ Campaign missing workspace_api_key');
      return NextResponse.json(
        { success: false, error: 'Campaign missing workspace API key' },
        { status: 400 }
      );
    }
    console.log('✅ Workspace API key present');

    // Get workspace data with proper error handling
    let workspaceData: any = null;
    const { data: workspaceDataResult, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('personas, use_cases, client_references, company_domain, company_name')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // Workspace data is optional (only needed for highlighting), so we don't fail if it's missing
    if (workspaceError) {
      console.warn('⚠️ Workspace data query failed (non-critical for generation):', workspaceError.message);
      console.warn('⚠️ Highlighting may be limited, but generation will continue');
    } else {
      workspaceData = workspaceDataResult;
      console.log('✅ Workspace data loaded:', {
        hasPersonas: !!workspaceData?.personas,
        hasUseCases: !!workspaceData?.use_cases,
        hasReferences: !!workspaceData?.client_references
      });
    }

    // 1. Generate Campaign Copy (3 email sequence) using OpenAI
    const assetUrl = intermediary.asset?.url || intermediary.asset?.content || 'Not specified';
    const businessTopic = intermediary.attractionOffer?.headline || campaign.campaign_name;
    
    const emailPrompt = `
You are generating a 3-email outbound campaign sequence. You MUST return ONLY valid JSON (no markdown, no code blocks, no explanations).

Generate a 3-email outbound campaign sequence based on the following campaign details. Use the SHARED HOOK and ATTRACTION OFFER from the intermediary outputs.

CAMPAIGN DETAILS:
- Campaign Name: ${campaign.campaign_name}
- Hook (Shared Touchpoint): ${intermediary.hook || 'Not specified'}
- Attraction Offer Headline: ${intermediary.attractionOffer?.headline || 'Not specified'}
- Attraction Offer Value Bullets: ${intermediary.attractionOffer?.valueBullets?.join('\n- ') || 'Not specified'}
- Attraction Offer Ease Bullets: ${intermediary.attractionOffer?.easeBullets?.join('\n- ') || 'Not specified'}
- Asset Link: ${assetUrl}
${cleanedCampaignBrief ? `\n---\n\nCLEANED CAMPAIGN BRIEF (Additional Context):\n${cleanedCampaignBrief}\n---` : ''}

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

CRITICAL OUTPUT REQUIREMENTS:
- You MUST return ONLY valid JSON (no markdown, no code blocks, no explanations)
- The JSON must match this EXACT structure:
{
  "email1A": { "subject": "...", "body": "..." },
  "email1B": { "subject": "...", "body": "..." },
  "email1C": { "subject": "...", "body": "..." },
  "email2": { "subject": "...", "body": "..." },
  "email3": { "subject": "...", "body": "..." }
}

Return ONLY the JSON object, nothing else.
`;

    // 1. Generate Campaign Copy (3 email sequence) using OpenAI
    console.log('📧 STEP 1: Generating campaign copy using OpenAI...');
    console.log('📋 Campaign details:', {
      campaignName: campaign.campaign_name,
      hook: intermediary.hook,
      attractionOffer: intermediary.attractionOffer?.headline,
      assetUrl,
      promptLength: emailPrompt.length
    });
    
    let campaignCopy: any = {};
    try {
      console.log('⏳ Calling OpenAI API for email generation...');
      const startTime = Date.now();
      const emailResponse = await generateCampaignContent(emailPrompt, {
        model: 'gpt-4o-mini',
        temperature: 0.4,
        maxTokens: 4000,
        responseFormat: { type: 'json_object' } // Request JSON format explicitly
      });
      const elapsedTime = Date.now() - startTime;
      console.log(`✅ OpenAI API call completed in ${elapsedTime}ms`);
      
      console.log('✅ OpenAI response received, length:', emailResponse.length);
      console.log('📄 Response preview (first 1000 chars):', emailResponse.substring(0, 1000));
      
      try {
        campaignCopy = parseJsonResponse(emailResponse);
        console.log('✅ Parsed campaign copy successfully');
        console.log('📊 Parsed keys:', Object.keys(campaignCopy));
        
        // Validate structure
        if (!campaignCopy.email1A || !campaignCopy.email1B || !campaignCopy.email1C) {
          console.warn('⚠️ Missing email variations in response');
          console.warn('Available keys:', Object.keys(campaignCopy));
          console.warn('Full response:', JSON.stringify(campaignCopy, null, 2));
        }
      } catch (parseError: any) {
        console.error('❌ JSON parsing failed:', parseError);
        console.error('Raw response:', emailResponse);
        throw parseError;
      }
    } catch (e: any) {
      console.error('❌ Failed to generate campaign copy:', e);
      console.error('Error details:', {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
      // Fallback structure
      campaignCopy = {
        email1A: { subject: 'Subject 1A', body: 'Failed to generate email 1A. Please try again.' },
        email1B: { subject: 'Subject 1B', body: 'Failed to generate email 1B. Please try again.' },
        email1C: { subject: 'Subject 1C', body: 'Failed to generate email 1C. Please try again.' },
        email2: { subject: 'Follow-up', body: 'Failed to generate email 2. Please try again.' },
        email3: { subject: 'Can you help?', body: `If you're not the right person to connect with in regards to ${businessTopic}, I'd really appreciate it if you could point me in the right direction.\n\nWho on your team would you recommend I reach out to?\n\nWarm regards,\n\n%signature%` }
      };
    }
    
    // Ensure all required emails exist with proper structure
    if (!campaignCopy.email1A || typeof campaignCopy.email1A !== 'object') {
      campaignCopy.email1A = { subject: '', body: '' };
    }
    if (!campaignCopy.email1B || typeof campaignCopy.email1B !== 'object') {
      campaignCopy.email1B = { subject: '', body: '' };
    }
    if (!campaignCopy.email1C || typeof campaignCopy.email1C !== 'object') {
      campaignCopy.email1C = { subject: '', body: '' };
    }
    if (!campaignCopy.email2 || typeof campaignCopy.email2 !== 'object') {
      campaignCopy.email2 = { subject: '', body: '' };
    }
    if (!campaignCopy.email3 || typeof campaignCopy.email3 !== 'object') {
      campaignCopy.email3 = { subject: '', body: '' };
    }
    
    console.log('📊 Final campaignCopy structure:', {
      email1A: { hasSubject: !!campaignCopy.email1A?.subject, hasBody: !!campaignCopy.email1A?.body },
      email1B: { hasSubject: !!campaignCopy.email1B?.subject, hasBody: !!campaignCopy.email1B?.body },
      email1C: { hasSubject: !!campaignCopy.email1C?.subject, hasBody: !!campaignCopy.email1C?.body },
      email2: { hasSubject: !!campaignCopy.email2?.subject, hasBody: !!campaignCopy.email2?.body },
      email3: { hasSubject: !!campaignCopy.email3?.subject, hasBody: !!campaignCopy.email3?.body }
    });

    // Validate that we have actual email content (not just empty strings)
    const hasValidEmails = 
      campaignCopy.email1A?.subject && campaignCopy.email1A?.body &&
      campaignCopy.email1B?.subject && campaignCopy.email1B?.body &&
      campaignCopy.email1C?.subject && campaignCopy.email1C?.body &&
      campaignCopy.email2?.subject && campaignCopy.email2?.body &&
      campaignCopy.email3?.subject && campaignCopy.email3?.body;

    if (!hasValidEmails) {
      console.error('❌ Generated emails are missing required content');
      console.error('Email validation:', {
        email1A: { subject: !!campaignCopy.email1A?.subject, body: !!campaignCopy.email1A?.body },
        email1B: { subject: !!campaignCopy.email1B?.subject, body: !!campaignCopy.email1B?.body },
        email1C: { subject: !!campaignCopy.email1C?.subject, body: !!campaignCopy.email1C?.body },
        email2: { subject: !!campaignCopy.email2?.subject, body: !!campaignCopy.email2?.body },
        email3: { subject: !!campaignCopy.email3?.subject, body: !!campaignCopy.email3?.body }
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate complete email content. Please check logs and try again.',
          details: 'One or more emails are missing subject or body content'
        },
        { status: 500 }
      );
    }
    console.log('✅ All emails validated successfully');

    // 2. List Building Instructions (use intermediary list strategy)
    console.log('📋 STEP 2: Getting list building instructions from intermediary outputs...');
    const listBuildingInstructions = intermediary.listBuildingStrategy || 'List building strategy not generated.';
    console.log('✅ List building instructions:', {
      length: listBuildingInstructions.length,
      preview: listBuildingInstructions.substring(0, 100)
    });

    // 3. Nurture Sequence (using agent 1009)
    console.log('🌱 STEP 3: Generating nurture sequence...');
    let nurtureSequence = '';
    try {
      console.log('🔍 Searching for agent 1009 in Octave workspace...');
      // Find agent 1009 by name pattern (same pattern as execute-play route)
      const allAgents = [];
      let offset = 0;
      const limit = 50;
      let hasNext = true;

      while (hasNext) {
        console.log(`📡 Fetching agents page (offset: ${offset}, limit: ${limit})...`);
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
      console.log(`🔍 Searched ${allAgents.length} agents for pattern "1009"...`);
      const codePattern = '1009';
      let nurtureAgent = allAgents.find((agent: any) => {
        const agentName = (agent.name || '').toLowerCase();
        return agentName.startsWith(codePattern + '_') || 
               agentName.startsWith(codePattern + ' ') ||
               agentName.includes(codePattern);
      });

      if (nurtureAgent) {
        console.log('✅ Found agent 1009:', {
          oId: nurtureAgent.oId,
          name: nurtureAgent.name
        });
        console.log('⏳ Calling Octave agent 1009 for nurture sequence generation...');
        const startTime = Date.now();
        const nurtureContext = `
Generate a 30-day nurture sequence for leads that reply to our outbound campaign but don't book a meeting.

CAMPAIGN CONTEXT:
- Campaign Name: ${campaign.campaign_name}
- Hook: ${intermediary.hook || ''}
- Attraction Offer: ${intermediary.attractionOffer?.headline || ''}
- Attraction Offer Value: ${intermediary.attractionOffer?.valueBullets?.join(', ') || ''}
- Asset: ${intermediary.asset?.url || intermediary.asset?.content || ''}
- List Building Strategy: ${intermediary.listBuildingStrategy || ''}
${cleanedCampaignBrief ? `\n---\n\nCLEANED CAMPAIGN BRIEF (Additional Context):\n${cleanedCampaignBrief}\n---` : ''}

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

        const elapsedTime = Date.now() - startTime;
        console.log(`✅ Octave agent 1009 completed in ${elapsedTime}ms`);
        nurtureSequence = nurtureResponse.data?.data?.content || nurtureResponse.data?.output || '';
        console.log('✅ Nurture sequence generated:', {
          length: nurtureSequence.length,
          preview: nurtureSequence.substring(0, 100)
        });
      } else {
        console.warn('⚠️ Agent 1009 not found, using OpenAI as fallback');
        console.log('⏳ Calling OpenAI for nurture sequence generation (fallback)...');
        const startTime = Date.now();
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
${cleanedCampaignBrief ? `\n---\n\nCLEANED CAMPAIGN BRIEF (Additional Context):\n${cleanedCampaignBrief}\n---` : ''}

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
          const elapsedTime = Date.now() - startTime;
          console.log(`✅ OpenAI fallback completed in ${elapsedTime}ms`);
          console.log('✅ Nurture sequence generated (OpenAI fallback):', {
            length: nurtureSequence.length,
            preview: nurtureSequence.substring(0, 100)
          });
        } catch (fallbackError: any) {
          console.error('❌ OpenAI fallback failed:', fallbackError);
          console.error('Error details:', {
            message: fallbackError.message,
            stack: fallbackError.stack
          });
          nurtureSequence = 'Failed to generate nurture sequence. Please try again or contact support.';
        }
      }
    } catch (nurtureError: any) {
      console.error('⚠️ Error generating nurture sequence:', nurtureError);
      console.error('Error details:', {
        message: nurtureError.message,
        stack: nurtureError.stack,
        response: nurtureError.response?.data
      });
      nurtureSequence = 'Failed to generate nurture sequence. Please try again or contact support.';
    }

    // 4. Asset (use from intermediary)
    console.log('📎 STEP 4: Getting asset from intermediary outputs...');
    const asset = intermediary.asset || { type: 'description', content: 'No asset provided' };
    console.log('✅ Asset:', {
      type: asset.type,
      hasUrl: !!asset.url,
      hasContent: !!asset.content
    });

    // Highlight campaign copy and nurture sequence
    console.log('🎨 STEP 5: Highlighting campaign copy and nurture sequence...');
    const highlightingContext = {
      personas: workspaceData?.personas?.slice(0, 5) || [],
      useCases: workspaceData?.use_cases?.slice(0, 5) || [],
      clientReferences: workspaceData?.client_references?.slice(0, 5) || []
    };
    console.log('📋 Highlighting context:', {
      personasCount: highlightingContext.personas.length,
      useCasesCount: highlightingContext.useCases.length,
      referencesCount: highlightingContext.clientReferences.length
    });

    // Highlight emails
    console.log('⏳ Highlighting emails...');
    const highlightedCampaignCopy: any = {};
    for (const [key, email] of Object.entries(campaignCopy)) {
      if (email && typeof email === 'object' && 'body' in email) {
        const emailBody = typeof email.body === 'string' ? email.body : '';
        console.log(`  Highlighting ${key}...`);
        const highlighted = await highlightOutput(emailBody, highlightingContext);
        highlightedCampaignCopy[key] = {
          ...email,
          highlightedBody: highlighted
        };
      }
    }
    console.log('✅ Email highlighting completed');

    // Highlight nurture sequence
    console.log('⏳ Highlighting nurture sequence...');
    const highlightedNurtureSequence = await highlightOutput(nurtureSequence, highlightingContext);
    console.log('✅ Nurture sequence highlighting completed');

    const finalAssets = {
      campaignCopy: highlightedCampaignCopy,
      listBuildingInstructions,
      nurtureSequence: {
        content: nurtureSequence,
        highlightedContent: highlightedNurtureSequence
      },
      asset
    };

    console.log('📦 STEP 6: Finalizing assets structure...');
    console.log('📦 Final assets structure:', {
      campaignCopyKeys: Object.keys(highlightedCampaignCopy),
      email1A: { hasSubject: !!highlightedCampaignCopy.email1A?.subject, hasBody: !!highlightedCampaignCopy.email1A?.body },
      email1B: { hasSubject: !!highlightedCampaignCopy.email1B?.subject, hasBody: !!highlightedCampaignCopy.email1B?.body },
      email1C: { hasSubject: !!highlightedCampaignCopy.email1C?.subject, hasBody: !!highlightedCampaignCopy.email1C?.body },
      email2: { hasSubject: !!highlightedCampaignCopy.email2?.subject, hasBody: !!highlightedCampaignCopy.email2?.body },
      email3: { hasSubject: !!highlightedCampaignCopy.email3?.subject, hasBody: !!highlightedCampaignCopy.email3?.body },
      listBuildingInstructionsLength: listBuildingInstructions.length,
      nurtureSequenceLength: nurtureSequence.length,
      assetType: asset.type
    });

    // Update campaign
    console.log('TESTING LOGS BELOW');
    console.log('💾 STEP 7: Saving final assets to database...');
    console.log('📋 BEFORE SAVE - finalAssets structure:', {
      campaignId: params.id,
      hasCampaignCopy: !!finalAssets.campaignCopy,
      campaignCopyKeys: finalAssets.campaignCopy ? Object.keys(finalAssets.campaignCopy) : [],
      campaignCopyEmail1A: finalAssets.campaignCopy?.email1A ? {
        hasSubject: !!finalAssets.campaignCopy.email1A.subject,
        subjectLength: finalAssets.campaignCopy.email1A.subject?.length || 0,
        hasBody: !!finalAssets.campaignCopy.email1A.body,
        bodyLength: finalAssets.campaignCopy.email1A.body?.length || 0
      } : null,
      campaignCopyEmail1B: finalAssets.campaignCopy?.email1B ? {
        hasSubject: !!finalAssets.campaignCopy.email1B.subject,
        subjectLength: finalAssets.campaignCopy.email1B.subject?.length || 0,
        hasBody: !!finalAssets.campaignCopy.email1B.body,
        bodyLength: finalAssets.campaignCopy.email1B.body?.length || 0
      } : null,
      campaignCopyEmail1C: finalAssets.campaignCopy?.email1C ? {
        hasSubject: !!finalAssets.campaignCopy.email1C.subject,
        subjectLength: finalAssets.campaignCopy.email1C.subject?.length || 0,
        hasBody: !!finalAssets.campaignCopy.email1C.body,
        bodyLength: finalAssets.campaignCopy.email1C.body?.length || 0
      } : null,
      campaignCopyEmail2: finalAssets.campaignCopy?.email2 ? {
        hasSubject: !!finalAssets.campaignCopy.email2.subject,
        subjectLength: finalAssets.campaignCopy.email2.subject?.length || 0,
        hasBody: !!finalAssets.campaignCopy.email2.body,
        bodyLength: finalAssets.campaignCopy.email2.body?.length || 0
      } : null,
      campaignCopyEmail3: finalAssets.campaignCopy?.email3 ? {
        hasSubject: !!finalAssets.campaignCopy.email3.subject,
        subjectLength: finalAssets.campaignCopy.email3.subject?.length || 0,
        hasBody: !!finalAssets.campaignCopy.email3.body,
        bodyLength: finalAssets.campaignCopy.email3.body?.length || 0
      } : null,
      hasListBuildingInstructions: !!finalAssets.listBuildingInstructions,
      listBuildingInstructionsLength: finalAssets.listBuildingInstructions?.length || 0,
      hasNurtureSequence: !!finalAssets.nurtureSequence,
      hasNurtureSequenceContent: !!finalAssets.nurtureSequence?.content,
      nurtureSequenceContentLength: finalAssets.nurtureSequence?.content?.length || 0,
      hasAsset: !!finalAssets.asset,
      assetType: finalAssets.asset?.type || null,
      finalAssetsStringified: JSON.stringify(finalAssets).substring(0, 500)
    });
    
    const { error: updateError, data: updateData } = await supabaseAdmin
      .from('outbound_campaigns')
      .update({
        final_assets: finalAssets,
        status: 'assets_generated'
      })
      .eq('id', params.id)
      .select();

    console.log('💾 AFTER UPDATE QUERY:', {
      updateError: updateError ? {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      } : null,
      updateDataRows: updateData?.length || 0,
      updateDataFirstRow: updateData?.[0] ? {
        id: updateData[0].id,
        hasFinalAssets: !!updateData[0].final_assets,
        finalAssetsKeys: updateData[0].final_assets ? Object.keys(updateData[0].final_assets) : [],
        status: updateData[0].status
      } : null
    });

    if (updateError) {
      console.error('❌ Error updating campaign:', updateError);
      console.error('Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      return NextResponse.json(
        { success: false, error: 'Failed to save final assets', details: updateError.message },
        { status: 500 }
      );
    }

    // Verify the save by reading back from database
    console.log('🔍 VERIFICATION: Reading back from database to verify save...');
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('outbound_campaigns')
      .select('id, final_assets, status')
      .eq('id', params.id)
      .single();

    console.log('🔍 VERIFICATION RESULT:', {
      verifyError: verifyError ? {
        message: verifyError.message,
        details: verifyError.details,
        hint: verifyError.hint,
        code: verifyError.code
      } : null,
      verifyData: verifyData ? {
        id: verifyData.id,
        status: verifyData.status,
        hasFinalAssets: !!verifyData.final_assets,
        finalAssetsType: typeof verifyData.final_assets,
        finalAssetsIsNull: verifyData.final_assets === null,
        finalAssetsKeys: verifyData.final_assets ? Object.keys(verifyData.final_assets) : [],
        finalAssetsCampaignCopyKeys: verifyData.final_assets?.campaignCopy ? Object.keys(verifyData.final_assets.campaignCopy) : [],
        finalAssetsEmail1A: verifyData.final_assets?.campaignCopy?.email1A ? {
          hasSubject: !!verifyData.final_assets.campaignCopy.email1A.subject,
          subjectLength: verifyData.final_assets.campaignCopy.email1A.subject?.length || 0,
          hasBody: !!verifyData.final_assets.campaignCopy.email1A.body,
          bodyLength: verifyData.final_assets.campaignCopy.email1A.body?.length || 0
        } : null,
        finalAssetsStringified: JSON.stringify(verifyData.final_assets).substring(0, 500)
      } : null
    });

    console.log('✅ Campaign assets saved successfully');
    console.log('🎉 Asset generation completed successfully!');
    console.log('📊 Summary:', {
      campaignId: params.id,
      campaignName: campaign.campaign_name,
      emailsGenerated: Object.keys(highlightedCampaignCopy).length,
      hasListBuilding: listBuildingInstructions.length > 0,
      hasNurtureSequence: nurtureSequence.length > 0,
      hasAsset: !!asset,
      verifySuccess: !!verifyData && !!verifyData.final_assets
    });

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
