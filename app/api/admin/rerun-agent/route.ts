import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Octave API base URL
const OCTAVE_BASE_URL = 'https://app.octavehq.com/api/v2/agents';

// Admin emails that can use this endpoint
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export const maxDuration = 120; // 2 minute timeout (increased for prospector)

// Agent type configuration mapping
interface AgentConfig {
  octaveType: 'PROSPECTOR' | 'CALL_PREP' | 'SEQUENCE' | 'CONTENT';
  endpoint: string;
  dbField: string;
  isVariant: boolean;
  variantKey?: string;
  namePatterns?: string[]; // Patterns to match agent names
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  // Prospector
  prospector: {
    octaveType: 'PROSPECTOR',
    endpoint: `${OCTAVE_BASE_URL}/prospector/run`,
    dbField: 'prospect_list',
    isVariant: false,
    namePatterns: ['prospector', 'prospect']
  },
  
  // Call Prep
  callPrep: {
    octaveType: 'CALL_PREP',
    endpoint: `${OCTAVE_BASE_URL}/call-prep/run`,
    dbField: 'call_prep',
    isVariant: false,
    namePatterns: ['call prep', 'callprep', '1st meeting', 'first meeting']
  },
  
  // Cold Email Sequences (all use SEQUENCE endpoint)
  'coldEmails.leadMagnetLong': {
    octaveType: 'SEQUENCE',
    endpoint: `${OCTAVE_BASE_URL}/sequence/run`,
    dbField: 'cold_emails',
    isVariant: true,
    variantKey: 'leadMagnetLong',
    namePatterns: ['lead magnet long', 'leadmagnetlong']
  },
  'coldEmails.personalizedSolutions': {
    octaveType: 'SEQUENCE',
    endpoint: `${OCTAVE_BASE_URL}/sequence/run`,
    dbField: 'cold_emails',
    isVariant: true,
    variantKey: 'personalizedSolutions',
    namePatterns: ['personalized solutions', 'personalizedsolutions']
  },
  'coldEmails.problemSolution': {
    octaveType: 'SEQUENCE',
    endpoint: `${OCTAVE_BASE_URL}/sequence/run`,
    dbField: 'cold_emails',
    isVariant: true,
    variantKey: 'problemSolution',
    namePatterns: ['problem solution', 'problemsolution']
  },
  'coldEmails.localCity': {
    octaveType: 'SEQUENCE',
    endpoint: `${OCTAVE_BASE_URL}/sequence/run`,
    dbField: 'cold_emails',
    isVariant: true,
    variantKey: 'localCity',
    namePatterns: ['local city', 'localcity', 'same city']
  },
  'coldEmails.leadMagnetShort': {
    octaveType: 'SEQUENCE',
    endpoint: `${OCTAVE_BASE_URL}/sequence/run`,
    dbField: 'cold_emails',
    isVariant: true,
    variantKey: 'leadMagnetShort',
    namePatterns: ['lead magnet short', 'leadmagnetshort']
  },
  
  // LinkedIn Posts (all use CONTENT endpoint)
  'linkedinPosts.inspiring': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'linkedin_posts',
    isVariant: true,
    variantKey: 'inspiring',
    namePatterns: ['linkedin post inspiring', 'inspiring post']
  },
  'linkedinPosts.promotional': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'linkedin_posts',
    isVariant: true,
    variantKey: 'promotional',
    namePatterns: ['linkedin post promotional', 'promotional post']
  },
  'linkedinPosts.actionable': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'linkedin_posts',
    isVariant: true,
    variantKey: 'actionable',
    namePatterns: ['linkedin post actionable', 'actionable post']
  },
  
  // LinkedIn DMs (all use CONTENT endpoint)
  'linkedinDMs.newsletter': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'linkedin_dms',
    isVariant: true,
    variantKey: 'newsletter',
    namePatterns: ['linkedin dm newsletter', 'dm newsletter']
  },
  'linkedinDMs.leadMagnet': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'linkedin_dms',
    isVariant: true,
    variantKey: 'leadMagnet',
    namePatterns: ['linkedin dm lead magnet', 'dm lead magnet']
  },
  'linkedinDMs.askQuestion': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'linkedin_dms',
    isVariant: true,
    variantKey: 'askQuestion',
    namePatterns: ['linkedin dm ask question', 'dm ask question', 'ask a question']
  },
  
  // Newsletters (all use CONTENT endpoint)
  'newsletters.tactical': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'newsletters',
    isVariant: true,
    variantKey: 'tactical',
    namePatterns: ['newsletter tactical', 'tactical newsletter']
  },
  'newsletters.leadership': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'newsletters',
    isVariant: true,
    variantKey: 'leadership',
    namePatterns: ['newsletter leadership', 'leadership newsletter']
  },
  
  // YouTube
  'youtube.longForm': {
    octaveType: 'CONTENT',
    endpoint: `${OCTAVE_BASE_URL}/generate-content/run`,
    dbField: 'youtube_scripts',
    isVariant: true,
    variantKey: 'longForm',
    namePatterns: ['youtube', 'script writing', 'long form', 'long-form']
  },
};

/**
 * Find agent ID by name patterns (name-based discovery)
 * Falls back to stored ID from database if name matching fails
 */
async function findAgentId(
  agentType: string,
  config: AgentConfig,
  workspaceApiKey: string,
  storedAgentIds: any
): Promise<string | null> {
  try {
    // List all agents in the workspace
    const agentsResponse = await axios.get('https://app.octavehq.com/api/v2/agents/list', {
      headers: { 
        'api_key': workspaceApiKey,
        'Content-Type': 'application/json'
      },
      params: { limit: 100 }
    });
    
    const allAgents = agentsResponse.data?.agents || agentsResponse.data?.data || [];
    console.log(`📋 Found ${allAgents.length} agents in workspace`);
    
    // Find agents matching type and name patterns
    const matchingAgents: Array<{ oId: string; name: string; score: number }> = [];
    
    for (const agent of allAgents) {
      const agentOctaveType = agent.type || agent.agentType;
      const agentName = (agent.name || '').toLowerCase();
      const agentOId = agent.oId || agent.agentOId;
      
      // Must match Octave type first
      if (agentOctaveType !== config.octaveType) continue;
      
      // Score based on name pattern matches
      let score = 0;
      if (config.namePatterns) {
        for (const pattern of config.namePatterns) {
          if (agentName.includes(pattern.toLowerCase())) {
            score += pattern.length; // Longer patterns = higher score
          }
        }
      }
      
      if (score > 0 || !config.namePatterns) {
        matchingAgents.push({ oId: agentOId, name: agent.name || 'Unnamed', score });
      }
    }
    
    // Sort by score (highest first) and return best match
    if (matchingAgents.length > 0) {
      matchingAgents.sort((a, b) => b.score - a.score);
      const bestMatch = matchingAgents[0];
      console.log(`✅ Found agent by name: ${bestMatch.name} (${bestMatch.oId})`);
      return bestMatch.oId;
    }
    
    // Fallback: Try to get from stored agent IDs
    const storedId = getStoredAgentId(agentType, storedAgentIds);
    if (storedId) {
      console.log(`⚠️ No name match found, using stored ID: ${storedId}`);
      return storedId;
    }
    
    console.warn(`⚠️ No agent found for type: ${agentType}`);
    return null;
    
  } catch (listError: any) {
    console.error('⚠️ Failed to list agents, trying stored ID:', listError.message);
    // Fallback to stored ID
    const storedId = getStoredAgentId(agentType, storedAgentIds);
    return storedId || null;
  }
}

/**
 * Extract stored agent ID from database JSONB structure
 */
function getStoredAgentId(agentType: string, storedAgentIds: any): string | null {
  if (!storedAgentIds) return null;
  
  // Handle simple types (prospector, callPrep)
  if (agentType === 'prospector') {
    return storedAgentIds.prospector || null;
  }
  if (agentType === 'callPrep') {
    return storedAgentIds.callPrep || null;
  }
  
  // Handle nested types (coldEmails.leadMagnetLong, etc.)
  const parts = agentType.split('.');
  if (parts.length === 2) {
    const [category, variant] = parts;
    return storedAgentIds[category]?.[variant] || null;
  }
  
  return null;
}

/**
 * Build request body for Octave API based on agent type
 */
function buildRequestBody(
  agentType: string,
  config: AgentConfig,
  agentOId: string,
  prospect: any,
  companyDomain: string,
  companyName: string,
  searchContext?: any
): any {
  const baseBody = { agentOId };
  
  // Prospector needs special handling
  if (agentType === 'prospector') {
    return {
      companyDomain: companyDomain, // MUST be first per API docs
      agentOId: agentOId,            // MUST be second per API docs
      limit: 25,
      minimal: true,
      searchContext: searchContext || {}
    };
  }
  
  // All other agents use prospect/company info
  return {
    ...baseBody,
    email: prospect?.contact?.companyDomain || companyDomain || null,
    companyDomain: prospect?.contact?.companyDomain || companyDomain || null,
    companyName: prospect?.contact?.company || companyName || null,
    firstName: prospect?.contact?.firstName || null,
    jobTitle: prospect?.contact?.title || null,
    linkedInProfile: prospect?.contact?.profileUrl || null,
    ...(config.octaveType === 'SEQUENCE' ? { outputFormat: 'text' } : {})
  };
}

/**
 * Update database with new output (handles variants correctly)
 */
async function updateDatabase(
  supabaseAdmin: any,
  recordId: string,
  agentType: string,
  config: AgentConfig,
  newOutput: any
): Promise<void> {
  const updatePayload: any = {};
  
  if (config.isVariant && config.variantKey) {
    // For variants, we need to preserve existing data and update only the specific variant
    // First, fetch current data
    const { data: currentRecord } = await supabaseAdmin
      .from('octave_outputs')
      .select(config.dbField)
      .eq('id', recordId)
      .single();
    
    const currentData = currentRecord?.[config.dbField] || {};
    
    // Update only the specific variant
    updatePayload[config.dbField] = {
      ...currentData,
      [config.variantKey]: newOutput
    };
  } else {
    // For non-variants, update the entire field
    updatePayload[config.dbField] = newOutput;
  }
  
  const { error: updateError } = await supabaseAdmin
    .from('octave_outputs')
    .update(updatePayload)
    .eq('id', recordId);
  
  if (updateError) {
    throw new Error(`Database update failed: ${updateError.message}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, agentType } = await request.json();

    // Validation
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!agentType) {
      return NextResponse.json({ error: 'Agent type is required' }, { status: 400 });
    }

    // Check if agent type is supported
    const config = AGENT_CONFIGS[agentType];
    if (!config) {
      return NextResponse.json({ 
        error: `Unknown agent type: ${agentType}`,
        supportedTypes: Object.keys(AGENT_CONFIGS)
      }, { status: 400 });
    }

    console.log('🔄 ===== ADMIN RERUN AGENT REQUEST =====');
    console.log('📧 Client Email:', email);
    console.log('🤖 Agent Type:', agentType);
    console.log('🔧 Config:', JSON.stringify(config, null, 2));

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // STEP 1: Look up userId from email
    // ============================================
    
    console.log('🔍 Looking up user by email...');
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      return NextResponse.json({ error: 'Failed to lookup user' }, { status: 500 });
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error('❌ User not found with email:', email);
      return NextResponse.json({ error: `No user found with email: ${email}` }, { status: 404 });
    }

    const userId = user.id;
    console.log('✅ Found user:', userId);

    // ============================================
    // STEP 2: Load workspace data from database
    // ============================================
    
    console.log('📚 Loading workspace data...');
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, prospect_list, _agent_ids, _company_domain, _company_name, personas, use_cases')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (workspaceError || !workspaceData) {
      console.error('❌ No workspace data found:', workspaceError);
      return NextResponse.json({ error: 'No strategy found for this user' }, { status: 404 });
    }

    const workspaceApiKey = workspaceData.workspace_api_key;
    const prospects = workspaceData.prospect_list || [];
    const agentIds = JSON.parse(workspaceData._agent_ids || '{}');
    const companyDomain = workspaceData._company_domain || '';
    const companyName = workspaceData._company_name || '';
    const personas = workspaceData.personas || [];
    const useCases = workspaceData.use_cases || [];

    console.log('✅ Workspace data loaded:');
    console.log(`   Company: ${companyName} (${companyDomain})`);
    console.log(`   Prospects: ${prospects.length}`);
    console.log(`   Personas: ${personas.length}`);
    console.log(`   Use Cases: ${useCases.length}`);

    // ============================================
    // STEP 3: Find the correct agent ID
    // ============================================
    
    console.log('🔍 Finding agent ID (name-based discovery with fallback)...');
    
    const correctAgentOId = await findAgentId(agentType, config, workspaceApiKey, agentIds);
    
    if (!correctAgentOId) {
      return NextResponse.json({ 
        error: `No agent ID found for: ${agentType}`,
        suggestion: 'Make sure the agent exists in the client\'s workspace'
      }, { status: 404 });
    }

    console.log(`✅ Using agent ID: ${correctAgentOId}`);

    // ============================================
    // STEP 4: Prepare request data
    // ============================================
    
    // Fallback sample prospect (same as in generate-strategy-content)
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

    const agentProspects = prospects.length > 0 ? prospects : [FALLBACK_SAMPLE_PROSPECT];
    const prospect = agentProspects[0];

    // Build search context for prospector (if needed)
    let searchContext: any = {};
    if (agentType === 'prospector') {
      // Extract persona OIDs and job titles for prospector
      const personaOIds = personas.map((p: any) => p.oId).filter(Boolean);
      const fuzzyTitles = personas
        .map((p: any) => p.jobTitle || p.title)
        .filter(Boolean)
        .map((title: string) => title.toLowerCase());
      
      searchContext = {
        personaOIds: personaOIds.length > 0 ? personaOIds : undefined,
        fuzzyTitles: fuzzyTitles.length > 0 ? fuzzyTitles : undefined
      };
    }

    const requestBody = buildRequestBody(
      agentType,
      config,
      correctAgentOId,
      prospect,
      companyDomain,
      companyName,
      searchContext
    );

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    // ============================================
    // STEP 5: Run the Octave agent
    // ============================================
    
    console.log(`🚀 Calling Octave API: ${config.endpoint}`);
    
    const response = await axios.post(config.endpoint, requestBody, {
      headers: {
        'api_key': workspaceApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 2 minute timeout
    });

    console.log('📥 Response status:', response.status);

    // Handle different response formats
    let newOutput: any;
    if (agentType === 'prospector') {
      // Prospector returns { data: { contacts: [...] } }
      newOutput = response.data?.data?.contacts || [];
    } else if (config.octaveType === 'SEQUENCE') {
      // Sequence returns { data: { emails: [...] } }
      newOutput = response.data?.data?.emails || [];
    } else if (config.octaveType === 'CONTENT') {
      // Content agents return { data: { content: "..." } }
      newOutput = response.data?.data?.content || '';
    } else {
      // Call Prep and others return { data: {...} }
      newOutput = response.data?.data || {};
    }

    if (!response.data?.success && !response.data?.found && !newOutput) {
      console.error('❌ Agent failed:', response.data?.message);
      return NextResponse.json({ 
        error: 'Agent execution failed', 
        details: response.data?.message 
      }, { status: 500 });
    }

    console.log('✅ Agent completed successfully');
    console.log(`📊 Output type: ${typeof newOutput}, isArray: ${Array.isArray(newOutput)}`);

    // ============================================
    // STEP 6: Update database with new output
    // ============================================
    
    console.log('💾 Updating database with new output...');

    // Get the specific record ID to update
    const { data: recordToUpdate, error: selectError } = await supabaseAdmin
      .from('octave_outputs')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (selectError || !recordToUpdate) {
      console.error('❌ Could not find record to update:', selectError);
      return NextResponse.json({ error: 'Could not find strategy record to update' }, { status: 404 });
    }

    console.log('📍 Found record to update:', recordToUpdate.id);

    // Update database (handles variants correctly)
    await updateDatabase(supabaseAdmin, recordToUpdate.id, agentType, config, newOutput);

    console.log('✅ Database updated successfully');
    console.log('🎯 ===== RERUN COMPLETE =====');

    return NextResponse.json({
      success: true,
      message: `${agentType} agent rerun successfully`,
      email: email,
      userId: userId,
      agentType: agentType,
      recordId: recordToUpdate.id,
      outputPreview: {
        type: typeof newOutput,
        isArray: Array.isArray(newOutput),
        length: Array.isArray(newOutput) ? newOutput.length : (typeof newOutput === 'string' ? newOutput.length : 'N/A')
      }
    });

  } catch (error: any) {
    console.error('❌ Rerun agent error:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        error: 'Failed to rerun agent', 
        details: error.response?.data?.message || error.message 
      },
      { status: 500 }
    );
  }
}
