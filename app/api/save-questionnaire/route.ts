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
    
    const { userId, section, fieldKey, fieldValue } = await request.json();
    
    // Validate required fields
    if (!userId || !section || !fieldKey) {
      console.error('🔧 API: Missing required fields', { userId: !!userId, section: !!section, fieldKey: !!fieldKey });
      return NextResponse.json({ 
        error: 'Missing required fields: userId, section, or fieldKey' 
      }, { status: 400 });
    }
    
    console.log('🔧 API: Saving with service key');
    console.log(`🔧 API: Upserting ${section}.${fieldKey} for user ${userId}`);
    
    // Use upsert with explicit select to ensure we get the result back
    const { data, error } = await supabaseAdmin
      .from('questionnaire_responses')
      .upsert(
        {
          user_id: userId,
          section,
          field_key: fieldKey,
          field_value: fieldValue,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,section,field_key',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();
    
    if (error) {
      console.error('🔧 API: Save error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log(`🔧 API: ✅ Save success for ${section}.${fieldKey}`);
    return NextResponse.json({ data, success: true });
  } catch (error: any) {
    console.error('🔧 API: Caught error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

