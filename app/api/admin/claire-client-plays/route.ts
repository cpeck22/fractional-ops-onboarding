import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: plays, error } = await supabaseAdmin
      .from('play_executions')
      .select(`
        id,
        play_id,
        status,
        created_at,
        claire_plays (
          code,
          name,
          category
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading client plays:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load plays' },
        { status: 500 }
      );
    }

    // Transform the data to handle Supabase's array response for relations
    const transformedPlays = (plays || []).map((play: any) => ({
      id: play.id,
      play_id: play.play_id,
      status: play.status,
      created_at: play.created_at,
      claire_plays: Array.isArray(play.claire_plays) 
        ? play.claire_plays[0] || null 
        : play.claire_plays
    }));

    return NextResponse.json({
      success: true,
      plays: transformedPlays
    });

  } catch (error: any) {
    console.error('❌ Error fetching client plays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plays', details: error.message },
      { status: 500 }
    );
  }
}

