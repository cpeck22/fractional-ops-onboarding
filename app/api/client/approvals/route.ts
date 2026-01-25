import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Admin emails that can impersonate clients
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status
    const playCategory = searchParams.get('category'); // Filter by play category
    const impersonateUserId = searchParams.get('impersonate'); // Check for impersonation

    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin access if impersonating
    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
    }

    // Check for impersonation - if admin is impersonating, use impersonated user's data
    const effectiveUserId = impersonateUserId || user.id;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // STEP 1: Query ONLY IDs first (simpler query, less likely to be cached)
    // This gives us the list of execution IDs that match our filters
    let idQuery = supabaseAdmin
      .from('play_executions')
      .select('id, status, play_id')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status) {
      idQuery = idQuery.eq('status', status);
    }

    // Apply category filter if needed (requires join, but we'll filter after)
    let categoryFilteredIds: string[] | null = null;
    if (playCategory) {
      // For category filter, we need to join with claire_plays
      // But we'll do this in a separate query to avoid caching issues
      const categoryQuery = supabaseAdmin
        .from('play_executions')
        .select('id, claire_plays!inner(category)')
        .eq('user_id', effectiveUserId)
        .eq('claire_plays.category', playCategory);
      
      if (status) {
        categoryQuery.eq('status', status);
      }
      
      const { data: categoryData } = await categoryQuery;
      categoryFilteredIds = categoryData?.map((e: any) => e.id) || [];
    }

    const { data: idData, error: idError } = await idQuery;

    if (idError) {
      console.error('❌ Error fetching execution IDs:', idError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch approvals', details: idError.message },
        { status: 500 }
      );
    }

    // Filter by category if needed
    let executionIds = idData?.map((e: any) => e.id) || [];
    if (categoryFilteredIds && categoryFilteredIds.length > 0) {
      executionIds = executionIds.filter((id: string) => categoryFilteredIds!.includes(id));
    }

    if (executionIds.length === 0) {
      console.log(`📊 No executions found for user ${effectiveUserId}`);
      return NextResponse.json({
        success: true,
        executions: []
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    console.log(`🔍 Found ${executionIds.length} execution IDs, fetching full data...`);

    // STEP 2: Query full data ONLY for verified IDs
    // This ensures we only get data for executions that actually exist
    const { data: executions, error: executionError } = await supabaseAdmin
      .from('play_executions')
      .select(`
        *,
        claire_plays (
          code,
          name,
          category
        ),
        play_approvals (
          id,
          shareable_token,
          status,
          due_date,
          approved_at,
          rejected_at,
          comments
        )
      `)
      .eq('user_id', effectiveUserId)
      .in('id', executionIds)
      .order('created_at', { ascending: false });

    if (executionError) {
      console.error('❌ Error fetching execution details:', executionError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch approvals', details: executionError.message },
        { status: 500 }
      );
    }

    // Log execution IDs for debugging
    const verifiedIds = executions?.map((e: any) => e.id) || [];
    const draftCount = executions?.filter((e: any) => e.status === 'draft').length || 0;
    
    console.log(`📊 Returning ${executions?.length || 0} executions for user ${effectiveUserId} (status: ${status || 'all'}, category: ${playCategory || 'all'})`);
    console.log(`📋 Draft count: ${draftCount}`);
    console.log(`🆔 Execution IDs: ${verifiedIds.slice(0, 10).join(', ')}${verifiedIds.length > 10 ? '...' : ''}`);

    return NextResponse.json({
      success: true,
      executions: executions || []
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ Error fetching approvals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approvals', details: error.message },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}
