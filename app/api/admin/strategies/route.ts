import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin emails that can access the admin panel
const ADMIN_EMAILS = [
  'ali@fractionalops.com',
  'corey@fractionalops.com',
  'coreypeck@gmail.com',
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

    // Get all octave_outputs with user info
    const { data: strategies, error: strategiesError } = await supabaseAdmin
      .from('octave_outputs')
      .select('id, user_id, company_name, company_domain, created_at')
      .order('created_at', { ascending: false });

    if (strategiesError) {
      console.error('❌ Error fetching strategies:', strategiesError);
      return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 });
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
    const enrichedStrategies = strategies?.map(strategy => ({
      ...strategy,
      user_email: userEmailMap[strategy.user_id] || 'Unknown'
    }));

    console.log(`✅ Fetched ${enrichedStrategies?.length || 0} strategies for admin view`);

    return NextResponse.json({
      success: true,
      strategies: enrichedStrategies || [],
      adminEmails: ADMIN_EMAILS
    });

  } catch (error: any) {
    console.error('❌ Admin strategies error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

