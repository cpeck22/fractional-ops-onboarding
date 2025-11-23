import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Diagnostic endpoint to check workspace data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('octave_outputs')
      .select('workspace_oid, workspace_api_key, company_name, created_at, agents_generated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'No workspace found', 
        details: error,
        suggestion: 'User may need to resubmit questionnaire'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      workspace: {
        oid: data.workspace_oid,
        hasApiKey: !!data.workspace_api_key,
        apiKeyPreview: data.workspace_api_key ? data.workspace_api_key.substring(0, 15) + '...' : null,
        companyName: data.company_name,
        createdAt: data.created_at,
        lastGeneratedAt: data.agents_generated_at
      },
      needsMigration: !data.workspace_api_key,
      message: data.workspace_api_key 
        ? '✅ Workspace has API key - regeneration should work'
        : '⚠️ Workspace missing API key - need to run migration and resubmit questionnaire'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


