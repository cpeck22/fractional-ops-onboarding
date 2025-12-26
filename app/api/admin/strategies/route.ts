import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CRITICAL: Force dynamic rendering - prevents Next.js/Vercel from caching this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Admin emails that can access the admin panel
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
  // Add more admin emails as needed
];

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get all octave_outputs with user info - fetch ALL records
    // Using service role key bypasses RLS, so we get all records regardless of user
    // CRITICAL: Order by updated_at DESC (not created_at) to show most recently updated strategies first
    // This ensures newly generated/regenerated strategies appear at the top of the list
    console.log('🔍 Fetching all strategies from octave_outputs...');
    const { data: strategies, error: strategiesError } = await supabaseAdmin
      .from('octave_outputs')
      .select('id, user_id, company_name, company_domain, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (strategiesError) {
      console.error('❌ Error fetching strategies:', strategiesError);
      console.error('❌ Error details:', JSON.stringify(strategiesError, null, 2));
      return NextResponse.json({ error: 'Failed to fetch strategies', details: strategiesError }, { status: 500 });
    }

    console.log(`📊 Raw query returned ${strategies?.length || 0} strategies`);
    
    // Log detailed info about all strategies for debugging
    if (strategies && strategies.length > 0) {
      console.log('📋 All strategies found:');
      strategies.forEach((strategy, index) => {
        console.log(`   [${index + 1}] ID: ${strategy.id}, User: ${strategy.user_id}, Company: ${strategy.company_name || '(no name)'}, Created: ${strategy.created_at}`);
      });
      
      // Check for strategies with null company_name
      const nullNameCount = strategies.filter(s => !s.company_name || s.company_name.trim() === '').length;
      if (nullNameCount > 0) {
        console.warn(`⚠️ Found ${nullNameCount} strategies with null/empty company_name`);
      }
    } else {
      console.warn('⚠️ No strategies found in database');
    }

    // Get user emails for each strategy
    const userIds = Array.from(new Set(strategies?.map(s => s.user_id) || []));
    
    // Fetch user details
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    }

    // Create a map of user_id to email
    const userEmailMap: Record<string, string> = {};
    users?.forEach(user => {
      userEmailMap[user.id] = user.email || 'Unknown';
    });

    // Enrich strategies with email
    // Include all strategies, even if company_name is null (they might still be valid)
    const enrichedStrategies = strategies?.map(strategy => ({
      ...strategy,
      user_email: userEmailMap[strategy.user_id] || 'Unknown',
      company_name: strategy.company_name || '(No Company Name)',
      company_domain: strategy.company_domain || '(No Domain)'
    }));

    console.log(`✅ Fetched ${enrichedStrategies?.length || 0} strategies for admin view`);
    console.log(`📧 Mapped ${Object.keys(userEmailMap).length} user emails`);

    // Add cache-busting headers to ensure fresh data
    return NextResponse.json({
      success: true,
      strategies: enrichedStrategies || [],
      adminEmails: ADMIN_EMAILS
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ Admin strategies error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

