import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { enrichProspect } from '@/lib/leadmagic';
import OpenAI from 'openai';

// Octave API base URL
const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

// ============================================
// AI-POWERED ICP COMPANY GENERATION
// ============================================

/**
 * Generate ICP-matching company domains using OpenAI GPT-4
 * @param companySize - Target company size/revenue (from questionnaire Q6.3)
 * @param geographicMarkets - Target geographic markets (from questionnaire Q6.4)
 * @param industry - Client's industry (for context)
 * @param whatYouDo - Client's service description (for context)
 * @returns Array of company domains matching the ICP
 */
async function generateICPCompanies(
  companySize: string,
  geographicMarkets: string,
  industry: string,
  whatYouDo: string,
  competitorDomains: string[] = []
): Promise<string[]> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.warn('⚠️ OPENAI_API_KEY not configured, skipping AI company generation');
    return [];
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey
  });

  const excludeCompetitorsText = competitorDomains.length > 0 
    ? `\n7. **CRITICAL**: EXCLUDE these competitor domains from results:\n   ${competitorDomains.map(d => `- ${d}`).join('\n   ')}`
    : '';

  const prompt = `You are a B2B prospecting expert. Generate a list of 50 real company domains that match this Ideal Customer Profile (ICP):

**Target Company Profile:**
- Company Size/Revenue: ${companySize}
- Geographic Markets: ${geographicMarkets}
- Industry Context: ${industry}
- Service We Provide: ${whatYouDo}

**Requirements:**
1. Return ONLY real, established companies (not startups unless funding info provided)
2. Companies should be active and have public websites
3. Include a mix of well-known and mid-market companies
4. Domains should be clean (example.com, not www.example.com or https://)
5. Prioritize companies that would benefit from the service described
6. Ensure companies match the size, revenue, and geographic criteria${excludeCompetitorsText}

Return ONLY a JSON object with this structure:
{
  "companies": [
    {"domain": "company1.com", "reason": "Brief reason why good fit"},
    {"domain": "company2.com", "reason": "Brief reason why good fit"}
  ]
}`;

  try {
    console.log('🤖 Calling OpenAI to generate ICP-matching companies...');
    console.log('   ICP: Size:', companySize);
    console.log('   ICP: Geography:', geographicMarkets);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a B2B prospecting expert who finds real companies matching specific ICPs. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"companies":[]}');
    const domains = result.companies.map((c: any) => c.domain);
    
    console.log(`✅ AI Generated ${domains.length} ICP-matching companies:`);
    result.companies.forEach((c: any) => {
      console.log(`   ${c.domain} - ${c.reason}`);
    });
    
    return domains;
    
  } catch (error: any) {
    console.error('❌ AI company generation failed:', error.message);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, sendProgress } = body;
    
    console.log('🎯 ===== STARTING AGENT STRATEGY GENERATION =====');
    console.log('👤 User ID:', userId);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing workspace data from database
    console.log('📚 Fetching workspace data from database...');
    const { data: workspaceData, error: fetchError } = await supabase
      .from('octave_outputs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !workspaceData) {
      console.error('❌ Failed to fetch workspace data:', fetchError);
      return NextResponse.json(
        { error: 'No workspace found for user. Please complete questionnaire first.' },
        { status: 404 }
      );
    }

    const {
      workspace_oid: workspaceOId,
      workspace_api_key: workspaceApiKey,
      company_domain: companyDomain,
      company_name: companyName,
      client_references: clientReferences
    } = workspaceData;

    if (!workspaceApiKey) {
      return NextResponse.json(
        { error: 'Workspace API key not found. Please resubmit questionnaire.' },
        { status: 400 }
      );
    }

    console.log('✅ Workspace found:', workspaceOId);
    console.log('🔑 Using workspace API key:', workspaceApiKey.substring(0, 15) + '...');

    // Helper function to send progress updates (for future SSE implementation)
    const updateProgress = (step: string, current: number, total: number) => {
      console.log(`[${current}/${total}] ${step}`);
      // TODO: Implement Server-Sent Events for real-time progress
    };

    // ============================================
    // STEP 1: LIST ALL AGENTS IN WORKSPACE (WITH PAGINATION)
    // ============================================
    
    updateProgress('Listing agents in workspace...', 1, 15);
    
    const newAgentIds = {
      prospector: '',
      coldEmails: {
        personalizedSolutions: '',
        leadMagnetShort: '',
        localCity: '',
        problemSolution: '',
        leadMagnetLong: ''
      },
      callPrep: '',
      linkedinPosts: {
        inspiring: '',
        promotional: '',
        actionable: ''
      },
      linkedinDMs: {
        newsletter: '',
        leadMagnet: '',
        askQuestion: ''
      },
      newsletters: {
        tactical: '',
        leadership: ''
      },
      youtube: {
        longForm: ''
      }
    };

    try {
      console.log('🔍 Listing agents in workspace with pagination...');
      
      // Fetch all agents with pagination
      const allAgents = [];
      let offset = 0;
      const limit = 50;
      let hasNext = true;

      while (hasNext) {
        const agentListResponse = await axios.get(
          `https://app.octavehq.com/api/v2/agents/list?offset=${offset}&limit=${limit}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            }
          }
        );

        const pageAgents = agentListResponse.data?.data || [];
        allAgents.push(...pageAgents);
        hasNext = agentListResponse.data?.hasNext || false;
        offset += limit;
        
        console.log(`📋 Fetched ${pageAgents.length} agents (offset: ${offset - limit}, hasNext: ${hasNext})`);
      }
      
      console.log(`📋 Found ${allAgents.length} total agents in workspace`);

      // Map agents by type and name to get their IDs
      allAgents.forEach((agent: any, index: number) => {
        const agentType = agent.type || agent.agentType || '';
        const agentName = agent.name?.toLowerCase() || '';
        const agentOId = agent.oId || agent.agentOId;

        console.log(`[${index + 1}/${allAgents.length}] ${agent.name} (${agentType})`);

        // Match by TYPE and specific name patterns
        if (agentType === 'PROSPECTOR') {
          newAgentIds.prospector = agentOId;
          console.log(`  ✅ MAPPED as PROSPECTOR`);
        } else if (agentType === 'EMAIL' || agentType === 'SEQUENCE') {
          if (agentName.includes('3 personalized') || agentName.includes('personalized solutions')) {
            newAgentIds.coldEmails.personalizedSolutions = agentOId;
            console.log(`  ✅ MAPPED as COLD_EMAIL: Personalized Solutions`);
          } else if (agentName.includes('lead magnet') && agentName.includes('short')) {
            newAgentIds.coldEmails.leadMagnetShort = agentOId;
            console.log(`  ✅ MAPPED as COLD_EMAIL: Lead Magnet Short`);
          } else if (agentName.includes('local') || agentName.includes('same city')) {
            newAgentIds.coldEmails.localCity = agentOId;
            console.log(`  ✅ MAPPED as COLD_EMAIL: Local/Same City`);
          } else if (agentName.includes('problem') && agentName.includes('solution')) {
            newAgentIds.coldEmails.problemSolution = agentOId;
            console.log(`  ✅ MAPPED as COLD_EMAIL: Problem/Solution`);
          } else if (agentName.includes('lead magnet') && agentName.includes('long')) {
            newAgentIds.coldEmails.leadMagnetLong = agentOId;
            console.log(`  ✅ MAPPED as COLD_EMAIL: Lead Magnet Long`);
          }
        } else if (agentType === 'CALL_PREP') {
          newAgentIds.callPrep = agentOId;
          console.log(`  ✅ MAPPED as CALL_PREP`);
        } else if (agentType === 'CONTENT') {
          if (agentName.includes('linkedin post') || agentName.includes('linkedin:')) {
            if (agentName.includes('inspiring') || agentName.includes('challenges overcome')) {
              newAgentIds.linkedinPosts.inspiring = agentOId;
              console.log(`  ✅ MAPPED as LINKEDIN_POST: Inspiring`);
            } else if (agentName.includes('promotional') || agentName.includes('lead-magnet') || agentName.includes('lead magnet')) {
              newAgentIds.linkedinPosts.promotional = agentOId;
              console.log(`  ✅ MAPPED as LINKEDIN_POST: Promotional`);
            } else if (agentName.includes('actionable') || agentName.includes('explanation') || agentName.includes('analysis')) {
              newAgentIds.linkedinPosts.actionable = agentOId;
              console.log(`  ✅ MAPPED as LINKEDIN_POST: Actionable`);
            }
          } else if (agentName.includes('linkedin') && agentName.includes('dm')) {
            if (agentName.includes('newsletter')) {
              newAgentIds.linkedinDMs.newsletter = agentOId;
              console.log(`  ✅ MAPPED as LINKEDIN_DM: Newsletter CTA`);
            } else if (agentName.includes('lead magnet')) {
              newAgentIds.linkedinDMs.leadMagnet = agentOId;
              console.log(`  ✅ MAPPED as LINKEDIN_DM: Lead Magnet CTA`);
            } else if (agentName.includes('ask') && agentName.includes('question')) {
              newAgentIds.linkedinDMs.askQuestion = agentOId;
              console.log(`  ✅ MAPPED as LINKEDIN_DM: Ask A Question`);
            }
          } else if (agentName.includes('youtube') || (agentName.includes('script') && agentName.includes('long'))) {
            newAgentIds.youtube.longForm = agentOId;
            console.log(`  ✅ MAPPED as YOUTUBE: Long-Form Script`);
          } else if (agentName.includes('newsletter')) {
            if (agentName.includes('tactical')) {
              newAgentIds.newsletters.tactical = agentOId;
              console.log(`  ✅ MAPPED as NEWSLETTER: Tactical`);
            } else if (agentName.includes('leadership')) {
              newAgentIds.newsletters.leadership = agentOId;
              console.log(`  ✅ MAPPED as NEWSLETTER: Leadership`);
            }
          }
        }
      });

      console.log('🎯 ===== AGENT MAPPING COMPLETE =====');
      console.log('Prospector:', newAgentIds.prospector ? '✅' : '❌');
      console.log('Cold Emails:', Object.values(newAgentIds.coldEmails).filter(id => id).length, '/5');
      console.log('Call Prep:', newAgentIds.callPrep ? '✅' : '❌');
      console.log('LinkedIn Posts:', Object.values(newAgentIds.linkedinPosts).filter(id => id).length, '/3');
      console.log('LinkedIn DMs:', Object.values(newAgentIds.linkedinDMs).filter(id => id).length, '/3');
      console.log('Newsletters:', Object.values(newAgentIds.newsletters).filter(id => id).length, '/2');
      console.log('YouTube Scripts:', newAgentIds.youtube.longForm ? '✅' : '❌');

    } catch (error) {
      console.error('❌ Failed to list agents:', error);
    }

    // ============================================
    // STEP 2: LIST PERSONAS TO GET JOB TITLES FOR PROSPECTOR
    // ============================================
    
    updateProgress('Extracting persona job titles...', 2, 15);
    
    let fuzzyTitles: string[] = [];
    let personas: any[] = [];

    try {
      console.log('📋 Listing personas to extract job titles for Prospector...');
      const listPersonasResponse = await axios.get(
        'https://app.octavehq.com/api/v2/persona/list',
        {
          headers: { 'api_key': workspaceApiKey },
          params: { limit: 50 }
        }
      );

      if (listPersonasResponse.data?.data) {
        personas = listPersonasResponse.data.data;
        console.log(`📋 Found ${personas.length} personas in workspace`);
        
        // Extract all commonJobTitles from all personas
        personas.forEach((persona: any) => {
          const jobTitles = persona.data?.commonJobTitles || [];
          fuzzyTitles.push(...jobTitles);
        });
        
        // Remove duplicates
        fuzzyTitles = Array.from(new Set(fuzzyTitles));
        console.log(`✅ Extracted ${fuzzyTitles.length} unique job titles from personas`);
        console.log('Sample titles:', fuzzyTitles.slice(0, 5).join(', '), '...');
      }
    } catch (error) {
      console.error('⚠️ Failed to list personas (non-critical):', error);
    }

    // ============================================
    // STEP 3: LOAD ICP DATA FROM QUESTIONNAIRE
    // ============================================
    
    updateProgress('Loading ICP data from questionnaire...', 3, 15);
    
    let companySize = '';
    let geographicMarkets = '';
    let industry = '';
    let whatYouDo = '';
    
    try {
      console.log('📋 Fetching ICP data from questionnaire_responses...');
      const { data: icpData, error: icpError } = await supabase
        .from('questionnaire_responses')
        .select('section, field_key, field_value')
        .eq('user_id', userId)
        .in('field_key', ['companySize', 'geographicMarkets', 'industry', 'whatYouDo']);
      
      if (icpError) {
        console.error('❌ Failed to load ICP data:', icpError);
      } else if (icpData) {
        icpData.forEach((row: any) => {
          if (row.field_key === 'companySize') companySize = row.field_value;
          if (row.field_key === 'geographicMarkets') geographicMarkets = row.field_value;
          if (row.field_key === 'industry') industry = row.field_value;
          if (row.field_key === 'whatYouDo') whatYouDo = row.field_value;
        });
        
        console.log('✅ ICP Data loaded:');
        console.log('   Company Size:', companySize || '(not provided)');
        console.log('   Geographic Markets:', geographicMarkets || '(not provided)');
        console.log('   Industry:', industry || '(not provided)');
      }
    } catch (error) {
      console.error('❌ Error loading ICP data:', error);
    }
    
    // ============================================
    // STEP 4: GENERATE ICP-MATCHING COMPANIES WITH AI
    // ============================================
    
    updateProgress('Generating ICP-matching companies with AI...', 4, 15);
    
    // Extract competitor domains from questionnaire to exclude them from prospecting
    const competitorDomains: string[] = [];
    try {
      console.log('🔍 Fetching competitors from questionnaire_responses...');
      const { data: competitorData, error: competitorError } = await supabase
        .from('questionnaire_responses')
        .select('field_value')
        .eq('user_id', userId)
        .eq('field_key', 'competitors')
        .single();
      
      if (!competitorError && competitorData?.field_value) {
        // Parse the JSON string to get the array of competitors
        const competitors = JSON.parse(competitorData.field_value);
        if (Array.isArray(competitors)) {
          competitors.forEach((comp: any) => {
            if (comp.companyWebsite) {
              // Clean the domain (remove protocol, www, trailing slashes, paths)
              const domain = comp.companyWebsite
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('/')[0];
              competitorDomains.push(domain);
            }
          });
        }
      }
    } catch (error) {
      console.error('⚠️ Error loading competitors (non-critical):', error);
    }
    
    if (competitorDomains.length > 0) {
      console.log(`🚫 Excluding ${competitorDomains.length} competitor domains from ICP generation:`, competitorDomains);
    }
    
    let icpCompanyDomains: string[] = [];
    
    if (companySize && geographicMarkets) {
      try {
        icpCompanyDomains = await generateICPCompanies(
          companySize,
          geographicMarkets,
          industry,
          whatYouDo,
          competitorDomains
        );
        
        console.log(`✅ Generated ${icpCompanyDomains.length} ICP-matching companies (excluding competitors)`);
      } catch (error) {
        console.error('❌ AI company generation failed:', error);
      }
    } else {
      console.warn('⚠️ Missing ICP data (companySize or geographicMarkets), cannot generate AI companies');
    }
    
    // Fallback 1: Use reference domains if AI fails or returns nothing
    if (icpCompanyDomains.length === 0) {
      console.log('⚠️ No AI-generated companies, falling back to reference domains...');
    if (clientReferences && Array.isArray(clientReferences) && clientReferences.length > 0) {
        icpCompanyDomains = clientReferences
          .filter((ref: any) => ref.companyDomain)
          .map((ref: any) => {
            const domain = ref.companyDomain;
            return domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
          })
          .slice(0, 5);
        console.log(`✅ Using ${icpCompanyDomains.length} reference domains as fallback`);
      }
    }
    
    // Fallback 2: Use client's own domain as last resort
    if (icpCompanyDomains.length === 0 && companyDomain) {
      console.log('⚠️ No reference domains, using client domain as last resort');
      icpCompanyDomains = [companyDomain.replace(/^https?:\/\//, '').replace(/^www\./, '')];
    }
    
    // ============================================
    // STEP 5: RUN PROSPECTOR AGENT WITH ICP COMPANIES
    // ============================================
    
    updateProgress('Running Prospector Agent with ICP companies...', 5, 15);
    
    let prospects: any[] = [];
    
    if (newAgentIds.prospector && icpCompanyDomains.length > 0) {
      try {
        console.log('👥 Running Prospector Agent...');
        console.log(`🎯 Searching across ${icpCompanyDomains.length} ICP-matching companies`);
        console.log(`🎯 Using ${fuzzyTitles.length} job titles for search`);
        console.log(`🎯 Personas: ${personas.slice(0, 3).map((p: any) => p.name).join(', ')}...`);
        
        // Run prospector for EACH ICP company domain
        const prospectorPromises = icpCompanyDomains.map(async (domain) => {
          try {
            console.log(`   🔍 Prospecting: ${domain}`);
            
            const response = await axios.post(
          `${OCTAVE_BASE_URL}/prospector/run`,
          {
                companyDomain: domain.startsWith('http') ? domain : `https://${domain}`,
            agentOId: newAgentIds.prospector,
                limit: 20, // Limit per company to get variety
            minimal: true,
            searchContext: {
              personaOIds: personas.map((p: any) => p.oId),
              fuzzyTitles: fuzzyTitles
            }
          },
          {
            headers: {
              'api_key': workspaceApiKey,
              'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout per domain
              }
            );

            const data = response.data;
            const contacts = data.found && data.data?.contacts 
              ? data.data.contacts 
              : (data.contacts || []);
            
            console.log(`   ✅ ${domain}: Found ${contacts.length} prospects`);
            return contacts;
            
          } catch (error: any) {
            console.warn(`   ⚠️ ${domain}: Prospecting failed -`, error.message);
            return [];
          }
        });

        // Wait for all prospector calls to complete
        const allProspectsArrays = await Promise.all(prospectorPromises);
        
        // Flatten and structure prospects
        prospects = allProspectsArrays
          .flat()
          .map((p: any) => ({
          name: `${p.contact?.firstName || ''} ${p.contact?.lastName || ''}`.trim(),
          firstName: p.contact?.firstName,
          lastName: p.contact?.lastName,
          title: p.contact?.title,
          company: p.contact?.companyName,
          companyDomain: p.contact?.companyDomain,
          linkedIn: p.contact?.profileUrl,
          location: p.contact?.location,
          headline: p.contact?.headline,
          // Keep original nested structure for agent use
          contact: p.contact,
          personas: p.personas
        }));
        
        // Deduplicate by name+company (in case of duplicates across domains)
        const uniqueProspects = new Map();
        prospects.forEach(p => {
          const key = `${p.name}-${p.company}`.toLowerCase();
          if (!uniqueProspects.has(key)) {
            uniqueProspects.set(key, p);
          }
        });
        prospects = Array.from(uniqueProspects.values());

        console.log(`✅ Total unique prospects found: ${prospects.length}`);

      } catch (error: any) {
        console.error('❌ Prospector agent failed:', error.response?.data || error.message);
      }
    } else {
      console.warn('⚠️ Skipping Prospector - missing agent ID or ICP companies');
    }

    console.log(`🎯 Using ${prospects.length} prospects for agent outputs`);

    // ============================================
    // PHASE 1 NOTE: This endpoint now only handles prospecting + enrichment
    // Content generation (emails, posts, etc.) moved to /generate-strategy-content
    // ============================================

    // ============================================
    // STEP 6: ENRICH PROSPECTS WITH LEADMAGIC
    // ============================================
    
    console.log('📧 ===== STARTING LEADMAGIC ENRICHMENT =====');
    updateProgress('Enriching prospects with contact info...', 6, 15);

    let enrichedProspects = prospects;
    
    // CRITICAL: Wrap enrichment in try-catch to ensure Phase 1 always completes
    // Even if enrichment fails, we still have prospects to pass to Phase 2
    try {
    if (prospects.length > 0) {
      // ============================================
      // OPTIMIZATION: Enrich up to 99 prospects + Parallelize in batches of 10
      // This maximizes email coverage while avoiding Vercel timeout
      // Parallel batches dramatically reduce enrichment time
      // ============================================
      const MAX_ENRICH = 99;
      const BATCH_SIZE = 10;
      
      const prospectsToEnrich = prospects.slice(0, MAX_ENRICH);
      const unenrichedProspects = prospects.slice(MAX_ENRICH);
      
      console.log(`📧 Enriching ${prospectsToEnrich.length} prospects with LeadMagic (${unenrichedProspects.length} will remain unenriched)...`);
      console.log(`⚡ Using parallel batches of ${BATCH_SIZE} to speed up enrichment`);
      
      const enrichedList = [];
      let emailsFound = 0;
      let mobilesFound = 0;
      
      // Process prospects in parallel batches
      for (let i = 0; i < prospectsToEnrich.length; i += BATCH_SIZE) {
        const batch = prospectsToEnrich.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(prospectsToEnrich.length / BATCH_SIZE);
        
        console.log(`📦 Batch ${batchNumber}/${totalBatches}: Enriching ${batch.length} prospects in parallel...`);
        
        try {
          // Enrich all prospects in batch simultaneously
          const batchResults = await Promise.all(
            batch.map(async (prospect, batchIndex) => {
              try {
                const globalIndex = i + batchIndex + 1;
                console.log(`📧 [${globalIndex}/${prospectsToEnrich.length}] Enriching: ${prospect.name || 'Unnamed'}`);
          const enriched = await enrichProspect(prospect);
          
          if (enriched.email) emailsFound++;
          if (enriched.mobile_number) mobilesFound++;
          
                return enriched;
              } catch (error) {
                console.error(`❌ Failed to enrich ${prospect.name}:`, error);
                return prospect; // Return unenriched on error
              }
            })
          );
          
          enrichedList.push(...batchResults);
          console.log(`✅ Batch ${batchNumber} complete: ${enrichedList.length}/${prospectsToEnrich.length} enriched (${emailsFound} emails, ${mobilesFound} mobiles)`);
          
        } catch (error) {
          console.error(`❌ Batch ${batchNumber} failed:`, error);
          // Add original prospects if entire batch fails
          enrichedList.push(...batch);
        }
      }
      
      // Combine enriched + unenriched prospects
      enrichedProspects = [...enrichedList, ...unenrichedProspects];
      
      console.log('📧 ===== LEADMAGIC ENRICHMENT COMPLETE =====');
      console.log(`   Enriched prospects: ${enrichedList.length}/${prospectsToEnrich.length}`);
      console.log(`   Unenriched prospects: ${unenrichedProspects.length}`);
      console.log(`   Total prospects: ${enrichedProspects.length}`);
      console.log(`   Emails found: ${emailsFound} (${Math.round((emailsFound / prospectsToEnrich.length) * 100)}%)`);
      console.log(`   Mobiles found: ${mobilesFound} (${Math.round((mobilesFound / prospectsToEnrich.length) * 100)}%)`);
      console.log(`   ⚡ Time saved: ~${Math.round((prospects.length - MAX_ENRICH) * 3)} seconds by limiting enrichment`);
    } else {
      console.log('⚠️ No prospects to enrich');
    }
    } catch (enrichmentError: any) {
      // CRITICAL: If enrichment fails completely, continue with unenriched prospects
      console.error('❌ ENRICHMENT FAILED - Continuing with unenriched prospects:', enrichmentError.message);
      console.log('⚠️ Phase 1 will complete with unenriched prospect data');
      // enrichedProspects already set to prospects at the top, so we're good
    }

    // ============================================
    // END OF PHASE 1: Save prospects + agent IDs for Phase 2
    // CRITICAL: This MUST execute even if enrichment fails
    // ============================================
    
    updateProgress('Saving Phase 1 data (prospects + agent IDs)...', 7, 15);
    
    console.log('💾 ===== PHASE 1 COMPLETE - SAVING DATA =====');
    console.log(`   Prospects found: ${enrichedProspects.length}`);
    console.log(`   Agent IDs mapped: ${Object.keys(newAgentIds).length}`);
    
    const { error: updateError } = await supabase
      .from('octave_outputs')
      .update({
        prospect_list: enrichedProspects,
        // Store agent IDs for Phase 2
        _agent_ids: JSON.stringify(newAgentIds),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateError) {
      console.error('❌ Failed to save Phase 1 data:', updateError);
      return NextResponse.json({ error: 'Failed to save prospects' }, { status: 500 });
    }

    console.log('✅ Phase 1 data saved to database');
    console.log('🎯 ===== PHASE 1 COMPLETE =====');
    console.log('   Next: Frontend will call Phase 2 for content generation');

    return NextResponse.json({
      success: true,
      phase: 1,
      prospectCount: enrichedProspects.length,
      agentCount: Object.keys(newAgentIds).length,
      message: 'Phase 1 complete - prospects ready for content generation'
    });

  } catch (error: any) {
    console.error('❌ Phase 1 strategy generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate strategy Phase 1', details: error.message },
      { status: 500 }
    );
  }
}

