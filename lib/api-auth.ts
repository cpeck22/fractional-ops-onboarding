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

    // Note: We return the authenticated admin user, not the impersonated user
    // Routes should check admin status and use impersonateUserId from query params separately
    // This allows routes to verify admin access before using impersonated user ID
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

    // Note: We return the authenticated admin user, not the impersonated user
    // Routes should check admin status and use impersonateUserId from query params separately
    // This allows routes to verify admin access before using impersonated user ID
    return { user, error: null };
  }
}
