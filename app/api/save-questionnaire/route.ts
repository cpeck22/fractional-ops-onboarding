import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client with service role key (server-side only)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { userId, section, fieldKey, fieldValue } = await request.json();
    
    console.log('🔧 API: Saving with service key');
    
    const { data, error } = await supabaseAdmin
      .from('questionnaire_responses')
      .upsert({
        user_id: userId,
        section,
        field_key: fieldKey,
        field_value: fieldValue
      });
    
    if (error) {
      console.error('🔧 API: Save error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('🔧 API: Save success');
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('🔧 API: Caught error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

