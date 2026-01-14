import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { User } from '@supabase/supabase-js';

// Admin emails that can impersonate clients
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export async function getAuthenticatedUser(request: NextRequest): Promise<{ user: User | null; error: string | null }> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  // Check for impersonation parameter
  const { searchParams } = new URL(request.url);
  const impersonateUserId = searchParams.get('impersonate');

  if (token) {
    // Use token from Authorization header
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !tokenUser) {
      console.error('❌ Token auth error:', tokenError?.message);
      return { user: null, error: tokenError?.message || 'Unauthorized' };
    }

    // If impersonating and user is admin, return impersonated user
    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(
        email => email.toLowerCase() === tokenUser.email?.toLowerCase()
      );

      if (isAdmin) {
        // Use admin client to get impersonated user
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: { user: impersonatedUser }, error: impersonateError } = await supabaseAdmin.auth.admin.getUserById(impersonateUserId);
        
        if (!impersonateError && impersonatedUser) {
          return { user: impersonatedUser, error: null };
        }
      }
    }
    
    return { user: tokenUser, error: null };
  } else {
    // Fallback to cookie-based auth
    const cookieStore = cookies();
    const cookieHeader = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            cookie: cookieHeader || cookieStore.toString()
          }
        }
      }
    );
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    let user = session?.user || null;
    
    if (!user) {
      const { data: { user: fetchedUser }, error: authError } = await supabase.auth.getUser();
      user = fetchedUser || null;
      
      if (authError || !user) {
        console.error('❌ Cookie auth error:', authError?.message || sessionError?.message);
        return { user: null, error: authError?.message || sessionError?.message || 'Unauthorized' };
      }
    }

    // If impersonating and user is admin, return impersonated user
    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user?.email?.toLowerCase()
      );

      if (isAdmin) {
        // Use admin client to get impersonated user
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: { user: impersonatedUser }, error: impersonateError } = await supabaseAdmin.auth.admin.getUserById(impersonateUserId);
        
        if (!impersonateError && impersonatedUser) {
          return { user: impersonatedUser, error: null };
        }
      }
    }

    return { user, error: null };
  }
}
