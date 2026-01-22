import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { getPlayPromptConfig } from '@/lib/play-prompts';

export const dynamic = 'force-dynamic';

// Admin emails
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isAdmin = ADMIN_EMAILS.some(
      email => email.toLowerCase() === user.email?.toLowerCase()
    );

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all plays from database
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: plays, error } = await supabaseAdmin
      .from('claire_plays')
      .select('*')
      .order('code', { ascending: true });

    if (error) {
      console.error('Error fetching plays:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch plays' },
        { status: 500 }
      );
    }

    // Enrich with prompt config data
    const enrichedPlays = (plays || []).map(play => {
      const promptConfig = getPlayPromptConfig(play.code);
      return {
        ...play,
        // Use prompt config if available, otherwise use database values
        agent_id: promptConfig?.agentId || play.agent_id || null,
        prompt_template: promptConfig?.promptTemplate || play.prompt_template || null,
        hasPromptConfig: !!promptConfig,
        variableCount: promptConfig ? Object.keys(promptConfig.variableMappings).length : 0,
      };
    });

    return NextResponse.json({
      success: true,
      plays: enrichedPlays
    });

  } catch (error: any) {
    console.error('Error in plays catalog API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

