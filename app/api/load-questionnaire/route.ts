import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // Create admin client at runtime (not build time)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('🔧 API: Missing environment variables');
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { userId } = await request.json();
    
    console.log('🔧 API: Loading data with service key for user:', userId);
    
    const { data, error } = await supabaseAdmin
      .from('questionnaire_responses')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('🔧 API: Load error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('🔧 API: Load success, rows:', data?.length || 0);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('🔧 API: Caught error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

