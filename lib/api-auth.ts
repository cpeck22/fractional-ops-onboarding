import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Get authenticated user from request
 * Tries Authorization header first (from client-side session), then falls back to cookies
 */
export async function getAuthenticatedUser(request: NextRequest) {
  // Try Authorization header first (from client-side session)
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token) {
    // Use token from Authorization header (preferred method)
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
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error };
    }
    
    return { user, error: null };
  }
  
  // Fallback to cookie-based auth (for server-side requests)
  const cookieStore = await cookies();
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
  
  // Try to get session first (works better with cookies), then fallback to getUser
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (session?.user) {
    return { user: session.user, error: null };
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { user: null, error: authError || sessionError };
  }
  
  return { user, error: null };
}

