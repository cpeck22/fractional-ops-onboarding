import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CRITICAL: Force dynamic rendering - prevents Next.js/Vercel from caching this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('📊 Admin fetching strategy for user:', userId);

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the strategy for this user
    // Order by updated_at to get the most recently regenerated content
    // Since regeneration updates the existing record, this ensures we get the latest version
    const { data: strategy, error: strategyError } = await supabaseAdmin
      .from('octave_outputs')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (strategyError || !strategy) {
      console.error('❌ Strategy not found:', strategyError);
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Get user email
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find(u => u.id === userId);

    console.log('✅ Strategy loaded for admin view:', strategy.company_name);
    console.log(`   Agents generated at: ${strategy.agents_generated_at || 'Not set'}`);
    console.log(`   Updated at: ${strategy.updated_at || 'Not set'}`);
    console.log(`   Created at: ${strategy.created_at || 'Not set'}`);

    // Add cache-busting headers to ensure fresh data
    return NextResponse.json({
      success: true,
      strategy,
      userEmail: user?.email || 'Unknown'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ Admin strategy fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

