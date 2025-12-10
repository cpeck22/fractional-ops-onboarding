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

export const maxDuration = 60; // 1 minute timeout

export async function POST(request: NextRequest) {
  try {
    const { email, agentType } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!agentType) {
      return NextResponse.json({ error: 'Agent type is required' }, { status: 400 });
    }

    console.log('🔄 ===== ADMIN RERUN AGENT REQUEST =====');
    console.log('📧 Client Email:', email);
    console.log('🤖 Agent Type:', agentType);

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
      .select('workspace_api_key, prospect_list, _agent_ids, _company_domain, _company_name')
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

    console.log('✅ Workspace data loaded:');
    console.log(`   Company: ${companyName}`);
    console.log(`   Prospects: ${prospects.length}`);

    // ============================================
    // STEP 3: Determine which agent to run
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

    let agentOId: string | null = null;
    let endpoint = '';
    let resultKey = '';

    if (agentType === 'callPrep') {
      agentOId = agentIds.callPrep;
      endpoint = `${OCTAVE_BASE_URL}/call-prep/run`;
      resultKey = 'call_prep';
      console.log('🎯 Running Call Prep Agent:', agentOId);
    } else {
      return NextResponse.json({ error: `Unknown agent type: ${agentType}` }, { status: 400 });
    }

    if (!agentOId) {
      return NextResponse.json({ error: `No agent ID found for: ${agentType}` }, { status: 404 });
    }

    // ============================================
    // STEP 4: Run the Octave agent
    // ============================================
    
    console.log('🚀 Calling Octave API...');
    
    const requestBody = {
      agentOId: agentOId,
      email: prospect?.contact?.companyDomain || companyDomain || null,
      companyDomain: prospect?.contact?.companyDomain || companyDomain || null,
      companyName: prospect?.contact?.company || companyName || null,
      firstName: prospect?.contact?.firstName || null,
      jobTitle: prospect?.contact?.title || null,
      linkedInProfile: prospect?.contact?.profileUrl || null
    };

    console.log('📤 Request:', JSON.stringify(requestBody, null, 2));

    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'api_key': workspaceApiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Response status:', response.status);

    if (!response.data?.success && !response.data?.found) {
      console.error('❌ Agent failed:', response.data?.message);
      return NextResponse.json({ 
        error: 'Agent execution failed', 
        details: response.data?.message 
      }, { status: 500 });
    }

    const newOutput = response.data?.data;
    console.log('✅ Agent completed successfully');

    // ============================================
    // STEP 5: Update database with new output
    // ============================================
    
    console.log('💾 Updating database with new output...');

    const updatePayload: any = {};
    updatePayload[resultKey] = newOutput;

    const { error: updateError } = await supabaseAdmin
      .from('octave_outputs')
      .update(updatePayload)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      return NextResponse.json({ error: 'Failed to save new output' }, { status: 500 });
    }

    console.log('✅ Database updated successfully');
    console.log('🎯 ===== RERUN COMPLETE =====');

    return NextResponse.json({
      success: true,
      message: `${agentType} agent rerun successfully`,
      email: email,
      userId: userId,
      agentType: agentType,
      outputPreview: agentType === 'callPrep' ? {
        hasCallScript: !!newOutput?.callScript,
        hasObjectionHandling: !!newOutput?.objectionHandling
      } : null
    });

  } catch (error: any) {
    console.error('❌ Rerun agent error:', error.response?.data || error.message);
    return NextResponse.json(
      { error: 'Failed to rerun agent', details: error.message },
      { status: 500 }
    );
  }
}

