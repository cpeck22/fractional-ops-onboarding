import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, filePath } = body as {
      userId: string;
      filePath: string;
    };
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path required' },
        { status: 400 }
      );
    }
    
    console.log('🗑️ Deleting file for user:', userId);
    console.log('🗑️ File path:', filePath);
    
    // Verify file belongs to this user (security check)
    if (!filePath.startsWith(`${userId}/`)) {
      console.error('❌ Security violation: User trying to delete file that doesn\'t belong to them');
      return NextResponse.json(
        { error: 'You can only delete your own files' },
        { status: 403 }
      );
    }
    
    // Check if service role key is configured
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Use service role key for storage operations to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );
    
    // Delete from Supabase Storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from('Questionnaire Files')
      .remove([filePath]);
    
    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete file: ${deleteError.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ File deleted successfully:', filePath);
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Error in delete-file:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete file',
        details: error.message
      },
      { status: 500 }
    );
  }
}

