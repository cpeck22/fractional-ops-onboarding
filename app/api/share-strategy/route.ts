import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    console.log('📤 Creating share link for user:', userId);

    // Check if user already has a share link
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('shared_strategies')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing && !existingError) {
      // Return existing share link
      console.log('✅ Returning existing share link:', existing.share_id);
      return NextResponse.json({
        success: true,
        shareId: existing.share_id,
        expiresAt: existing.expires_at,
        alreadyExists: true
      });
    }

    // Get user's workspace info
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_oid')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (workspaceError || !workspace) {
      console.error('❌ No workspace found for user:', userId);
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Generate unique share ID (8 characters, URL-safe)
    const shareId = Math.random().toString(36).substring(2, 10);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    console.log('🔗 Generating share link:', shareId);
    console.log('📅 Expires at:', expiresAt.toISOString());

    // Create share record
    const { data: shareRecord, error: shareError } = await supabaseAdmin
      .from('shared_strategies')
      .insert({
        share_id: shareId,
        user_id: userId,
        workspace_oid: workspace.workspace_oid,
        created_at: createdAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (shareError) {
      console.error('❌ Failed to create share link:', shareError);
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
    }

    console.log('✅ Share link created successfully:', shareRecord.share_id);

    return NextResponse.json({
      success: true,
      shareId: shareRecord.share_id,
      expiresAt: shareRecord.expires_at,
      alreadyExists: false
    });

  } catch (error: any) {
    console.error('❌ Share strategy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

