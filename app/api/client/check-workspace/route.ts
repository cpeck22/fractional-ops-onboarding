import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check for impersonation parameter
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    
    // Verify admin access if impersonating
    if (impersonateUserId) {
      const ADMIN_EMAILS = [
        'ali.hassan@fractionalops.com',
        'sharifali1000@gmail.com',
        'corey@fractionalops.com',
      ];
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
    
    // Use impersonated user ID if provided, otherwise use authenticated user ID
    const effectiveUserId = impersonateUserId || user.id;

    // Use admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('company_name, workspace_api_key')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (workspaceError) {
      console.error('Error loading workspace:', workspaceError);
      return NextResponse.json({
        success: false,
        hasWorkspace: false,
        error: workspaceError.message
      });
    }
    
    return NextResponse.json({
      success: true,
      hasWorkspace: !!workspaceData?.workspace_api_key,
      companyName: workspaceData?.company_name || null
    });
  } catch (error: any) {
    console.error('Error in check-workspace:', error);
    return NextResponse.json(
      { success: false, hasWorkspace: false, error: error.message },
      { status: 500 }
    );
  }
}

