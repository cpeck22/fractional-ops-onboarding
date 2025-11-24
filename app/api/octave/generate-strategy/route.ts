import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Octave API base URL
const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

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
      company_name: companyName
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
        leadMagnet: ''
      },
      newsletters: {
        tactical: '',
        leadership: ''
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
            }
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
      console.log('LinkedIn DMs:', Object.values(newAgentIds.linkedinDMs).filter(id => id).length, '/2');
      console.log('Newsletters:', Object.values(newAgentIds.newsletters).filter(id => id).length, '/2');

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
    // STEP 3: RUN PROSPECTOR AGENT
    // ============================================
    
    updateProgress('Running Prospector Agent...', 3, 15);
    
    let prospects: any[] = [];
    let lookalikeSource = `https://${companyDomain}`;

    // Get lookalike source from reference customers if available
    // For now, use company domain as fallback
    console.log('🎯 Using lookalike search with reference customer:', lookalikeSource);

    if (newAgentIds.prospector && companyDomain) {
      try {
        console.log('👥 Running Prospector Agent...');
        console.log(`🎯 Searching for ${personas.length} personas: ${personas.slice(0, 3).map(p => p.name).join(', ')}...`);
        console.log(`🎯 Using ${fuzzyTitles.length} job titles for search`);
        console.log(`🎯 Lookalike source domain: ${lookalikeSource}`);

        const prospectorResponse = await axios.post(
          `${OCTAVE_BASE_URL}/prospector/run`,
          {
            companyDomain: lookalikeSource,
            agentOId: newAgentIds.prospector,
            limit: 25,
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
            }
          }
        );

        const prospectorData = prospectorResponse.data;
        console.log('📊 Prospector response structure:', JSON.stringify(prospectorData, null, 2));
        
        if (prospectorData.found && prospectorData.data?.contacts) {
          prospects = prospectorData.data.contacts;
          console.log(`✅ Prospector found ${prospects.length} prospects`);
        } else if (prospectorData.contacts) {
          // Sometimes contacts are at root level
          prospects = prospectorData.contacts;
          console.log(`✅ Prospector found ${prospects.length} prospects (root level)`);
        } else {
          console.warn('⚠️ Prospector returned no results:', prospectorData.message || 'Unknown error');
        }
        
        // Flatten prospect structure for UI compatibility
        prospects = prospects.map((p: any) => ({
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
        console.log(`📋 Flattened ${prospects.length} prospects for UI display`);
      } catch (error: any) {
        console.error('❌ Prospector agent failed:', error.response?.data || error.message);
      }
    }

    console.log(`🎯 Using ${prospects.length} prospects for varied agent outputs`);

    // Initialize agent results
    const agentResults = {
      campaignIdeas: [] as any[],
      prospectList: prospects,
      coldEmails: {
        personalizedSolutions: [] as any[],
        leadMagnetShort: [] as any[],
        localCity: [] as any[],
        problemSolution: [] as any[],
        leadMagnetLong: [] as any[]
      },
      linkedinPosts: {
        inspiring: '',
        promotional: '',
        actionable: ''
      },
      linkedinDMs: {
        newsletter: '',
        leadMagnet: ''
      },
      newsletters: {
        tactical: '',
        leadership: ''
      },
      callPrep: null as any
    };

    // ============================================
    // STEP 4-13: RUN ALL EMAIL, CONTENT, AND CALL PREP AGENTS
    // ============================================
    
    const runAgent = async (
      agentType: string,
      agentOId: string,
      agentName: string,
      prospectIndex: number = 0,
      stepNumber: number = 4
    ) => {
      if (!agentOId) {
        console.log(`⏭️ Skipping ${agentName} - no agent ID mapped`);
        return null;
      }

      updateProgress(`Running ${agentName}...`, stepNumber, 15);

      try {
        const prospect = prospects[prospectIndex % prospects.length];
        
        let endpoint = '';
        let requestBody: any = {
          agentOId: agentOId
        };

        // Build request based on agent type
        if (agentType === 'sequence') {
          endpoint = `${OCTAVE_BASE_URL}/sequence/run`;
          requestBody = {
            ...requestBody,
            email: prospect?.contact?.companyDomain || companyDomain || null,
            companyDomain: prospect?.contact?.companyDomain || companyDomain || null,
            companyName: prospect?.contact?.company || companyName || null,
            firstName: prospect?.contact?.firstName || null,
            jobTitle: prospect?.contact?.title || null,
            linkedInProfile: prospect?.contact?.profileUrl || null,
            outputFormat: 'text'
          };
        } else if (agentType === 'callPrep') {
          endpoint = `${OCTAVE_BASE_URL}/call-prep/run`;
          requestBody = {
            ...requestBody,
            email: prospect?.contact?.companyDomain || companyDomain || null,
            companyDomain: prospect?.contact?.companyDomain || companyDomain || null,
            companyName: prospect?.contact?.company || companyName || null,
            firstName: prospect?.contact?.firstName || null,
            jobTitle: prospect?.contact?.title || null,
            linkedInProfile: prospect?.contact?.profileUrl || null
          };
        } else if (agentType === 'content') {
          endpoint = `${OCTAVE_BASE_URL}/generate-content/run`;
          // Content agents don't need prospect info
        }

        console.log(`🔄 Running ${agentName}...`);
        
        const response = await axios.post(
          endpoint,
          requestBody,
          {
            headers: {
              'api_key': workspaceApiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`📊 ${agentName} response:`, JSON.stringify(response.data, null, 2));

        // Check for both "success" and "found" fields (Octave API inconsistency)
        if (response.data?.success || response.data?.found) {
          console.log(`✅ ${agentName} completed successfully`);
          return response.data;
        } else {
          console.warn(`⚠️ ${agentName} failed:`, response.data?.message);
          return null;
        }
      } catch (error: any) {
        console.error(`❌ ${agentName} error:`, error.response?.data || error.message);
        return null;
      }
    };

    // Run all Cold Email agents (4-8)
    if (newAgentIds.coldEmails.personalizedSolutions) {
      const result = await runAgent('sequence', newAgentIds.coldEmails.personalizedSolutions, 'Cold Email: Personalized Solutions', 0, 4);
      if (result?.data?.emails) agentResults.coldEmails.personalizedSolutions = result.data.emails;
    }

    if (newAgentIds.coldEmails.leadMagnetShort) {
      const result = await runAgent('sequence', newAgentIds.coldEmails.leadMagnetShort, 'Cold Email: Lead Magnet Short', 1, 5);
      if (result?.data?.emails) agentResults.coldEmails.leadMagnetShort = result.data.emails;
    }

    if (newAgentIds.coldEmails.localCity) {
      const result = await runAgent('sequence', newAgentIds.coldEmails.localCity, 'Cold Email: Local/Same City', 2, 6);
      if (result?.data?.emails) agentResults.coldEmails.localCity = result.data.emails;
    }

    if (newAgentIds.coldEmails.problemSolution) {
      const result = await runAgent('sequence', newAgentIds.coldEmails.problemSolution, 'Cold Email: Problem/Solution', 3, 7);
      if (result?.data?.emails) agentResults.coldEmails.problemSolution = result.data.emails;
    }

    if (newAgentIds.coldEmails.leadMagnetLong) {
      const result = await runAgent('sequence', newAgentIds.coldEmails.leadMagnetLong, 'Cold Email: Lead Magnet Long', 4, 8);
      if (result?.data?.emails) agentResults.coldEmails.leadMagnetLong = result.data.emails;
    }

    // Run LinkedIn Post agents (9-11)
    if (newAgentIds.linkedinPosts.inspiring) {
      const result = await runAgent('content', newAgentIds.linkedinPosts.inspiring, 'LinkedIn Post: Inspiring', 0, 9);
      if (result?.data?.content) agentResults.linkedinPosts.inspiring = result.data.content;
    }

    if (newAgentIds.linkedinPosts.promotional) {
      const result = await runAgent('content', newAgentIds.linkedinPosts.promotional, 'LinkedIn Post: Promotional', 1, 10);
      if (result?.data?.content) agentResults.linkedinPosts.promotional = result.data.content;
    }

    if (newAgentIds.linkedinPosts.actionable) {
      const result = await runAgent('content', newAgentIds.linkedinPosts.actionable, 'LinkedIn Post: Actionable', 2, 11);
      if (result?.data?.content) agentResults.linkedinPosts.actionable = result.data.content;
    }

    // Run LinkedIn DM agents (12-13)
    if (newAgentIds.linkedinDMs.newsletter) {
      const result = await runAgent('content', newAgentIds.linkedinDMs.newsletter, 'LinkedIn DM: Newsletter CTA', 0, 12);
      if (result?.data?.content) agentResults.linkedinDMs.newsletter = result.data.content;
    }

    if (newAgentIds.linkedinDMs.leadMagnet) {
      const result = await runAgent('content', newAgentIds.linkedinDMs.leadMagnet, 'LinkedIn DM: Lead Magnet CTA', 1, 13);
      if (result?.data?.content) agentResults.linkedinDMs.leadMagnet = result.data.content;
    }

    // Run Newsletter agents (14-15... will be 14)
    if (newAgentIds.newsletters.tactical) {
      const result = await runAgent('content', newAgentIds.newsletters.tactical, 'Newsletter: Tactical', 0, 14);
      if (result?.data?.content) agentResults.newsletters.tactical = result.data.content;
    }

    if (newAgentIds.newsletters.leadership) {
      const result = await runAgent('content', newAgentIds.newsletters.leadership, 'Newsletter: Leadership', 1, 14);
      if (result?.data?.content) agentResults.newsletters.leadership = result.data.content;
    }

    // Run Call Prep agent (will be 15)
    if (newAgentIds.callPrep) {
      const result = await runAgent('callPrep', newAgentIds.callPrep, 'Call Prep Agent', 0, 15);
      if (result?.data) agentResults.callPrep = result.data;
    }

    updateProgress('Saving results to database...', 15, 15);

    // ============================================
    // STEP 14: SAVE RESULTS TO DATABASE
    // ============================================
    
    console.log('💾 Updating agent outputs in database...');
    
    const { error: updateError } = await supabase
      .from('octave_outputs')
      .update({
        prospect_list: agentResults.prospectList,
        cold_emails: agentResults.coldEmails,
        linkedin_posts: agentResults.linkedinPosts,
        linkedin_dms: agentResults.linkedinDMs,
        newsletters: agentResults.newsletters,
        call_prep: agentResults.callPrep,
        agents_generated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Failed to update database:', updateError);
      return NextResponse.json(
        { error: 'Failed to save agent outputs', details: updateError },
        { status: 500 }
      );
    }

    console.log('✅ Agent outputs saved to database successfully');
    console.log('🎯 ===== AGENT STRATEGY GENERATION COMPLETE =====');

    return NextResponse.json({
      success: true,
      message: 'Strategy generated successfully',
      results: {
        prospects: agentResults.prospectList.length,
        coldEmails: Object.values(agentResults.coldEmails).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
        linkedinPosts: Object.values(agentResults.linkedinPosts).filter(v => v).length,
        linkedinDMs: Object.values(agentResults.linkedinDMs).filter(v => v).length,
        newsletters: Object.values(agentResults.newsletters).filter(v => v).length,
        callPrep: agentResults.callPrep ? 1 : 0
      }
    });

  } catch (error: any) {
    console.error('❌ Strategy generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate strategy', details: error.message },
      { status: 500 }
    );
  }
}


