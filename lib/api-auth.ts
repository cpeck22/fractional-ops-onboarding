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

  // Enhanced logging for debugging
  console.log('🔐 Auth check:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenLength: token?.length || 0,
    url: request.url,
    impersonateUserId: impersonateUserId || 'none'
  });

  if (token) {
    // Use token from Authorization header
    console.log('🔑 Using token-based auth');
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
      console.error('❌ Token auth error:', {
        error: tokenError?.message,
        status: tokenError?.status,
        name: tokenError?.name
      });
      return { user: null, error: tokenError?.message || 'Unauthorized' };
    }

    console.log('✅ Token auth successful:', { userId: tokenUser.id, email: tokenUser.email });
    // Note: We return the authenticated admin user, not the impersonated user
    // Routes should check admin status and use impersonateUserId from query params separately
    // This allows routes to verify admin access before using impersonated user ID
    return { user: tokenUser, error: null };
  } else {
    // Fallback to cookie-based auth
    console.log('🍪 Falling back to cookie-based auth');
    try {
      const cookieStore = cookies();
      const allCookies = cookieStore.getAll();
      const cookieHeader = allCookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      console.log('🍪 Cookie check:', {
        cookieCount: allCookies.length,
        hasCookieHeader: !!cookieHeader,
        cookieNames: allCookies.map(c => c.name)
      });
      
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
      
      console.log('🍪 Session check:', {
        hasSession: !!session,
        hasUser: !!user,
        sessionError: sessionError?.message
      });
      
      if (!user) {
        const { data: { user: fetchedUser }, error: authError } = await supabase.auth.getUser();
        user = fetchedUser || null;
        
        console.log('🍪 getUser check:', {
          hasUser: !!user,
          authError: authError?.message
        });
        
        if (authError || !user) {
          const errorMsg = authError?.message || sessionError?.message || 'Auth session missing!';
          console.error('❌ Cookie auth error:', {
            authError: authError?.message,
            sessionError: sessionError?.message,
            finalError: errorMsg
          });
          return { user: null, error: errorMsg };
        }
      }

      console.log('✅ Cookie auth successful:', { userId: user.id, email: user.email });
      // Note: We return the authenticated admin user, not the impersonated user
      // Routes should check admin status and use impersonateUserId from query params separately
      // This allows routes to verify admin access before using impersonated user ID
      return { user, error: null };
    } catch (cookieError: any) {
      console.error('❌ Cookie access error:', cookieError?.message);
      return { user: null, error: cookieError?.message || 'Failed to access cookies' };
    }
  }
}
