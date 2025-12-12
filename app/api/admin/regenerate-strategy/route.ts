import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin emails that can use this endpoint
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export const maxDuration = 300; // 5 minutes timeout (for both phases)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('🔄 ===== ADMIN REGENERATE STRATEGY REQUEST =====');
    console.log('📧 Client Email:', email);

    // Initialize Supabase admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
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
      return NextResponse.json({ 
        error: `No user found with email: ${email}` 
      }, { status: 404 });
    }

    const userId = user.id;
    console.log('✅ Found user:', userId, `(${user.email})`);

    // ============================================
    // STEP 2: Verify workspace exists and has required data
    // ============================================
    
    console.log('📚 Verifying workspace exists...');
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('id, workspace_api_key, workspace_oid, company_name, company_domain, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (workspaceError || !workspaceData) {
      console.error('❌ No workspace found:', workspaceError);
      return NextResponse.json({ 
        error: 'No workspace found for this user. They must complete the questionnaire first.' 
      }, { status: 404 });
    }

    if (!workspaceData.workspace_api_key) {
      console.error('❌ Workspace API key missing');
      return NextResponse.json({ 
        error: 'Workspace API key missing. User needs to resubmit questionnaire.' 
      }, { status: 400 });
    }

    if (!workspaceData.workspace_oid) {
      console.error('❌ Workspace OID missing');
      return NextResponse.json({ 
        error: 'Workspace OID missing. User needs to resubmit questionnaire.' 
      }, { status: 400 });
    }

    console.log('✅ Workspace verified:');
    console.log(`   Company: ${workspaceData.company_name || 'Unknown'}`);
    console.log(`   Domain: ${workspaceData.company_domain || 'Unknown'}`);
    console.log(`   Workspace OID: ${workspaceData.workspace_oid}`);

    // ============================================
    // STEP 3: Run Phase 1 - Generate Strategy (Prospects + Enrichment)
    // ============================================
    
    console.log('🎯 Starting Phase 1: Data Generation (Prospects + Enrichment)...');
    
    const phase1Url = `${request.nextUrl.origin}/api/octave/generate-strategy`;
    console.log(`   Calling: ${phase1Url}`);
    
    const phase1Response = await fetch(phase1Url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    if (!phase1Response.ok) {
      const errorData = await phase1Response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Phase 1 failed:', errorData);
      return NextResponse.json({ 
        error: `Phase 1 (Prospects) failed: ${errorData.error || 'Unknown error'}`,
        phase: 1,
        details: errorData
      }, { status: 500 });
    }

    const phase1Result = await phase1Response.json();
    console.log('✅ Phase 1 complete:');
    console.log(`   Prospect Count: ${phase1Result.prospectCount || 'Unknown'}`);
    console.log(`   Emails Found: ${phase1Result.emailsFound || 0}`);
    console.log(`   Mobiles Found: ${phase1Result.mobilesFound || 0}`);

    // ============================================
    // STEP 4: Run Phase 2 - Generate Content (All Agents)
    // ============================================
    
    console.log('🎯 Starting Phase 2: Content Generation (All Agents)...');
    
    const phase2Url = `${request.nextUrl.origin}/api/octave/generate-strategy-content`;
    console.log(`   Calling: ${phase2Url}`);
    
    const phase2Response = await fetch(phase2Url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });

    if (!phase2Response.ok) {
      const errorData = await phase2Response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Phase 2 failed:', errorData);
      
      // Phase 1 succeeded, so we return partial success
      return NextResponse.json({ 
        error: `Phase 2 (Content) failed: ${errorData.error || 'Unknown error'}`,
        phase: 2,
        phase1Success: true,
        phase1Result,
        details: errorData
      }, { status: 500 });
    }

    const phase2Result = await phase2Response.json();
    console.log('✅ Phase 2 complete:');
    console.log(`   Cold Emails: ${phase2Result.results?.coldEmails ? 'Generated' : 'Failed'}`);
    console.log(`   LinkedIn Posts: ${phase2Result.results?.linkedinPosts ? 'Generated' : 'Failed'}`);
    console.log(`   LinkedIn DMs: ${phase2Result.results?.linkedinDMs ? 'Generated' : 'Failed'}`);
    console.log(`   Newsletters: ${phase2Result.results?.newsletters ? 'Generated' : 'Failed'}`);
    console.log(`   Call Prep: ${phase2Result.results?.callPrep ? 'Generated' : 'Failed'}`);

    // ============================================
    // SUCCESS: Both phases completed
    // ============================================
    
    console.log('🎉 ===== STRATEGY REGENERATION COMPLETE =====');
    console.log(`   User: ${email} (${userId})`);
    console.log(`   Company: ${workspaceData.company_name || 'Unknown'}`);
    console.log(`   Prospects: ${phase1Result.prospectCount || 0}`);
    console.log(`   Content: All agents executed`);

    return NextResponse.json({
      success: true,
      message: `Strategy successfully regenerated for ${workspaceData.company_name || email}`,
      userEmail: email,
      userId,
      companyName: workspaceData.company_name,
      companyDomain: workspaceData.company_domain,
      phase1: {
        success: true,
        prospectCount: phase1Result.prospectCount,
        emailsFound: phase1Result.emailsFound,
        mobilesFound: phase1Result.mobilesFound
      },
      phase2: {
        success: true,
        results: phase2Result.results
      }
    });

  } catch (error: any) {
    console.error('❌ Regenerate strategy error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error occurred',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

