import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Octave API base URL
const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

export const maxDuration = 300; // 5 minute timeout

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    console.log('🎯 ===== STARTING PHASE 2: CONTENT GENERATION =====');
    console.log('👤 User ID:', userId);

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ============================================
    // STEP 1: LOAD PHASE 1 DATA FROM DATABASE
    // ============================================
    
    console.log('📚 Loading Phase 1 data from database...');
    
    const { data, error } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, prospect_list, _agent_ids, _company_domain, _company_name')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('❌ No Phase 1 data found:', error);
      return NextResponse.json({ error: 'No workspace data found. Please run Phase 1 first.' }, { status: 404 });
    }

    const workspaceApiKey = data.workspace_api_key;
    const prospects = data.prospect_list || [];
    const agentIds = JSON.parse(data._agent_ids || '{}');
    const companyDomain = data._company_domain || '';
    const companyName = data._company_name || '';

    // ============================================
    // HARDCODED FALLBACKS FOR NEW AGENTS
    // ============================================
    // Ensure new agents work even for existing workspaces created before they existed
    
    if (!agentIds.linkedinDMs) agentIds.linkedinDMs = {};
    if (!agentIds.youtube) agentIds.youtube = {};

    if (!agentIds.linkedinDMs.askQuestion) {
      agentIds.linkedinDMs.askQuestion = 'ca_mKHrB6A2yNiBN5yRPPsOm';
      console.log('⚠️ Using hardcoded LinkedIn DM: Ask A Question agent (ca_mKHrB6A2yNiBN5yRPPsOm)');
    }

    if (!agentIds.youtube.longForm) {
      agentIds.youtube.longForm = 'ca_oR6ro10L1z7N8HouxVgNc';
      console.log('⚠️ Using hardcoded YouTube: Long-Form Script agent (ca_oR6ro10L1z7N8HouxVgNc)');
    }

    console.log('✅ Phase 1 data loaded:');
    console.log(`   Prospects: ${prospects.length}`);
    console.log(`   Agent IDs: ${Object.keys(agentIds).length} categories`);
    console.log(`   Company: ${companyName} (${companyDomain})`);

    // ============================================
    // FALLBACK: Sample prospect when no real prospects found
    // ============================================
    // Octave agents require a valid LinkedIn profile to generate content.
    // When prospecting yields 0 results (rare edge case ~1-5%), we use a 
    // sample profile so all content agents can still run successfully.
    // The sample prospect is NOT saved to the database - prospect_list stays empty.
    
    const FALLBACK_SAMPLE_PROSPECT = {
      contact: {
        firstName: 'Corey',
        lastName: 'Peck',
        title: 'Chief Executive Officer',
        company: 'Sample Corporation',
        companyDomain: 'example.com',
        profileUrl: 'https://www.linkedin.com/in/coreypeck/'
      }
    };

    // Use fallback if no real prospects found
    const agentProspects = prospects.length > 0 ? prospects : [FALLBACK_SAMPLE_PROSPECT];
    const usingFallback = prospects.length === 0;

    if (usingFallback) {
      console.log('⚠️ ===== FALLBACK MODE: No real prospects found =====');
      console.log('📋 Using sample profile for content generation:', FALLBACK_SAMPLE_PROSPECT.contact.profileUrl);
      console.log('📋 Note: Sample prospect will NOT be saved to database');
    }

    // ============================================
    // STEP 2-14: RUN ALL CONTENT AGENTS (PARALLEL)
    // ============================================
    
    console.log('🚀 Starting content generation for', agentProspects.length, 'prospects', usingFallback ? '(FALLBACK MODE)' : '');

    // Initialize agent results
    const agentResults = {
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
        leadMagnet: '',
        askQuestion: ''
      },
      newsletters: {
        tactical: '',
        leadership: ''
      },
      youtube: {
        longForm: ''
      },
      callPrep: null as any
    };

    // Helper function to run a single agent
    const runAgent = async (
      agentType: string,
      agentOId: string,
      agentName: string,
      prospectIndex: number = 0
    ) => {
      if (!agentOId) {
        console.log(`⏭️ Skipping ${agentName} - no agent ID mapped`);
        return null;
      }

      try {
        // Use agentProspects (which includes fallback if no real prospects)
        const prospect = agentProspects[prospectIndex % agentProspects.length];
        
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
          requestBody = {
            ...requestBody,
            email: prospect?.contact?.companyDomain || companyDomain || null,
            companyDomain: prospect?.contact?.companyDomain || companyDomain || null,
            companyName: prospect?.contact?.company || companyName || null,
            firstName: prospect?.contact?.firstName || null,
            jobTitle: prospect?.contact?.title || null,
            linkedInProfile: prospect?.contact?.profileUrl || null
          };
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

        // console.log(`📊 ${agentName} response:`, JSON.stringify(response.data, null, 2)); // Too verbose for parallel

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

    // ============================================
    // QUEUE ALL AGENTS IN PARALLEL
    // ============================================
    
    const promises: Promise<void>[] = [];

    // --- Cold Email Agents ---
    if (usingFallback) {
      console.log('📧 Cold Email agents will use fallback sample profile');
    }

    if (agentIds.coldEmails?.leadMagnetLong) {
      promises.push(runAgent('sequence', agentIds.coldEmails.leadMagnetLong, 'Cold Email: Lead Magnet Long', 0)
        .then(res => { if (res?.data?.emails) agentResults.coldEmails.leadMagnetLong = res.data.emails; }));
    }
    if (agentIds.coldEmails?.personalizedSolutions) {
      promises.push(runAgent('sequence', agentIds.coldEmails.personalizedSolutions, 'Cold Email: Personalized Solutions', 1)
        .then(res => { if (res?.data?.emails) agentResults.coldEmails.personalizedSolutions = res.data.emails; }));
    }
    if (agentIds.coldEmails?.problemSolution) {
      promises.push(runAgent('sequence', agentIds.coldEmails.problemSolution, 'Cold Email: Problem/Solution', 2)
        .then(res => { if (res?.data?.emails) agentResults.coldEmails.problemSolution = res.data.emails; }));
    }
    if (agentIds.coldEmails?.localCity) {
      promises.push(runAgent('sequence', agentIds.coldEmails.localCity, 'Cold Email: Local/Same City', 3)
        .then(res => { if (res?.data?.emails) agentResults.coldEmails.localCity = res.data.emails; }));
    }
    if (agentIds.coldEmails?.leadMagnetShort) {
      promises.push(runAgent('sequence', agentIds.coldEmails.leadMagnetShort, 'Cold Email: Lead Magnet Short', 4)
        .then(res => { if (res?.data?.emails) agentResults.coldEmails.leadMagnetShort = res.data.emails; }));
    }

    // --- LinkedIn Post Agents ---
    if (agentIds.linkedinPosts?.inspiring) {
      promises.push(runAgent('content', agentIds.linkedinPosts.inspiring, 'LinkedIn Post: Inspiring', 0)
        .then(res => { if (res?.data?.content) agentResults.linkedinPosts.inspiring = res.data.content; }));
    }
    if (agentIds.linkedinPosts?.promotional) {
      promises.push(runAgent('content', agentIds.linkedinPosts.promotional, 'LinkedIn Post: Promotional', 1)
        .then(res => { if (res?.data?.content) agentResults.linkedinPosts.promotional = res.data.content; }));
    }
    if (agentIds.linkedinPosts?.actionable) {
      promises.push(runAgent('content', agentIds.linkedinPosts.actionable, 'LinkedIn Post: Actionable', 2)
        .then(res => { if (res?.data?.content) agentResults.linkedinPosts.actionable = res.data.content; }));
    }

    // --- LinkedIn DM Agents ---
    if (agentIds.linkedinDMs?.newsletter) {
      promises.push(runAgent('content', agentIds.linkedinDMs.newsletter, 'LinkedIn DM: Newsletter CTA', 0)
        .then(res => { if (res?.data?.content) agentResults.linkedinDMs.newsletter = res.data.content; }));
    }
    if (agentIds.linkedinDMs?.leadMagnet) {
      promises.push(runAgent('content', agentIds.linkedinDMs.leadMagnet, 'LinkedIn DM: Lead Magnet CTA', 1)
        .then(res => { if (res?.data?.content) agentResults.linkedinDMs.leadMagnet = res.data.content; }));
    }
    if (agentIds.linkedinDMs?.askQuestion) {
      promises.push(runAgent('content', agentIds.linkedinDMs.askQuestion, 'LinkedIn DM: Ask A Question', 2)
        .then(res => { if (res?.data?.content) agentResults.linkedinDMs.askQuestion = res.data.content; }));
    }

    // --- Newsletter Agents ---
    if (agentIds.newsletters?.tactical) {
      promises.push(runAgent('content', agentIds.newsletters.tactical, 'Newsletter: Tactical', 0)
        .then(res => { if (res?.data?.content) agentResults.newsletters.tactical = res.data.content; }));
    }
    if (agentIds.newsletters?.leadership) {
      promises.push(runAgent('content', agentIds.newsletters.leadership, 'Newsletter: Leadership', 1)
        .then(res => { if (res?.data?.content) agentResults.newsletters.leadership = res.data.content; }));
    }

    // --- Call Prep Agent ---
    if (agentIds.callPrep) {
      promises.push(runAgent('callPrep', agentIds.callPrep, 'Call Prep Agent', 0)
        .then(res => { if (res?.data) agentResults.callPrep = res.data; }));
    }

    // --- YouTube Script Agent ---
    if (agentIds.youtube?.longForm) {
      promises.push(runAgent('content', agentIds.youtube.longForm, 'YouTube Script: Long-Form', 0)
        .then(res => { if (res?.data?.content) agentResults.youtube.longForm = res.data.content; }));
    }

    // ============================================
    // EXECUTE ALL AGENTS
    // ============================================
    
    console.log(`⏳ Waiting for ${promises.length} agents to complete in parallel...`);
    await Promise.all(promises);
    console.log('✅ All agents finished execution');

    // ============================================
    // STEP 15: SAVE PHASE 2 RESULTS TO DATABASE
    // ============================================
    
    console.log('💾 Saving Phase 2 content to database...');
    
    const { error: phase2Error } = await supabaseAdmin
      .from('octave_outputs')
      .update({
        cold_emails: agentResults.coldEmails,
        linkedin_posts: agentResults.linkedinPosts,
        linkedin_dms: agentResults.linkedinDMs,
        newsletters: agentResults.newsletters,
        call_prep: agentResults.callPrep,
        youtube_scripts: agentResults.youtube,
        agents_generated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (phase2Error) {
      console.error('❌ Failed to save Phase 2 content:', phase2Error);
      return NextResponse.json({ error: 'Failed to save content', details: phase2Error }, { status: 500 });
    }

    console.log('✅ Phase 2 content saved to database');
    console.log('🎯 ===== PHASE 2 COMPLETE =====');
    
    return NextResponse.json({
      success: true,
      phase: 2,
      message: 'Content generation complete',
      results: {
        coldEmails: Object.values(agentResults.coldEmails).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
        linkedinPosts: Object.values(agentResults.linkedinPosts).filter(v => v).length,
        linkedinDMs: Object.values(agentResults.linkedinDMs).filter(v => v).length,
        newsletters: Object.values(agentResults.newsletters).filter(v => v).length,
        callPrep: agentResults.callPrep ? 1 : 0,
        youtubeScripts: agentResults.youtube.longForm ? 1 : 0
      }
    });

  } catch (error: any) {
    console.error('❌ Phase 2 content generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate content Phase 2', details: error.message },
      { status: 500 }
    );
  }
}
