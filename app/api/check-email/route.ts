import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // Create admin client at runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('🔧 API: Missing environment variables');
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const { email } = await request.json();
    
    console.log('🔧 API: Checking if email exists:', email);
    
    // Use admin client to check if user exists in auth.users table
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('🔧 API: Error checking email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Check if any user has this email
    const emailExists = data.users.some(user => user.email?.toLowerCase() === email.toLowerCase());
    
    console.log('🔧 API: Email exists:', emailExists);
    return NextResponse.json({ exists: emailExists });
  } catch (error: any) {
    console.error('🔧 API: Caught error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

