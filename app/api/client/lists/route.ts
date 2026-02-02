import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check for impersonation
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    let effectiveUserId = user.id;

    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
      effectiveUserId = impersonateUserId;
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch lists from database
    const { data: lists, error: listsError } = await supabaseAdmin
      .from('campaign_lists')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('uploaded_at', { ascending: false });

    if (listsError) {
      console.error('Error fetching lists:', listsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch lists',
        details: listsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lists: lists || []
    });
  } catch (error: any) {
    console.error('Error in lists route:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
