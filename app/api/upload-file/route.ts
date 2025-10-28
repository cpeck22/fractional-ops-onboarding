import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    console.log('📤 Uploading file:', file.name, 'for user:', userId);
    
    // Validate file size (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} is too large. Max size is 10MB.` },
        { status: 400 }
      );
    }
    
    // Validate file type
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed. Please upload PDF, DOC, DOCX, PNG, or JPG files.` },
        { status: 400 }
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
    
    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}_${file.name}`;
    
    console.log('📤 Uploading to Supabase Storage:', filePath);
    
    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('Questionnaire Files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload ${file.name}: ${uploadError.message}` },
        { status: 500 }
      );
    }
    
    if (!uploadData) {
      console.error('❌ No upload data returned');
      return NextResponse.json(
        { error: 'Upload failed - no data returned' },
        { status: 500 }
      );
    }
    
    // Generate a signed URL that expires in 1 year (for long-term access)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('Questionnaire Files')
      .createSignedUrl(uploadData.path, 31536000); // 1 year in seconds
    
    let fileUrl = '';
    
    if (signedUrlError) {
      console.error('❌ Error creating signed URL:', signedUrlError);
      // Fallback to public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('Questionnaire Files')
        .getPublicUrl(uploadData.path);
      fileUrl = publicUrl;
      console.warn('⚠️ Using public URL (may not be accessible):', fileUrl);
    } else if (signedUrlData?.signedUrl) {
      fileUrl = signedUrlData.signedUrl;
      console.log('✅ File uploaded with signed URL:', fileUrl);
    }
    
    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name
    });
    
  } catch (error: any) {
    console.error('❌ Error in file upload:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error.message
      },
      { status: 500 }
    );
  }
}

