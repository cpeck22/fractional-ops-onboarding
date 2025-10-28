import { NextRequest, NextResponse } from 'next/server';
import { QuestionnaireData } from '@/types';
import { generateQuestionnairePDF, getFileName } from '@/lib/pdfGenerator';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, questionnaireData, userId } = body as {
      email: string;
      questionnaireData: QuestionnaireData;
      userId?: string;
    };
    
    // Get Zapier webhook URL from environment
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    
    if (!zapierWebhookUrl) {
      console.error('❌ Zapier webhook URL not configured');
      return NextResponse.json(
        { error: 'Zapier webhook URL not configured' },
        { status: 500 }
      );
    }
    
    console.log('📄 Generating PDF for:', email);
    console.log('📄 Company Name:', questionnaireData.companyInfo?.companyName);
    
    // Generate PDF
    const companyName = questionnaireData.companyInfo?.companyName || 'Client Company';
    const pdfBuffer = generateQuestionnairePDF({
      email,
      companyName,
      questionnaireData
    });
    
    const fileName = getFileName(companyName, email);
    console.log('📄 PDF generated:', fileName, 'Size:', pdfBuffer.length, 'bytes');
    
    // Upload PDF to Supabase Storage
    let pdfUrl = '';
    
    // Use userId passed from octave workspace route, or try to get from cookies
    let effectiveUserId = userId;
    
    if (!effectiveUserId) {
      console.log('🔑 No userId provided, attempting to get from cookies...');
      const cookieStore = await cookies();
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              cookie: cookieStore.toString()
            }
          }
        }
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
      
      console.log('🔑 Auth check from cookies - User ID:', effectiveUserId || 'null');
      console.log('🔑 Auth error:', authError);
    } else {
      console.log('🔑 Using provided userId:', effectiveUserId);
    }
    
    if (effectiveUserId) {
      // Check if service role key is configured
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured');
        console.warn('⚠️ Cannot upload PDF without service role key');
      } else {
        // Use service role key for storage operations to bypass RLS
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        );
        
        const timestamp = Date.now();
        const pdfPath = `${effectiveUserId}/${timestamp}_${fileName}`;
        
        console.log('📤 Uploading PDF to Supabase Storage:', pdfPath);
      
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('Questionnaire Files')
          .upload(pdfPath, pdfBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('❌ PDF upload error:', uploadError);
          console.error('❌ Upload error details:', JSON.stringify(uploadError, null, 2));
        } else if (uploadData) {
          // Generate a signed URL that expires in 1 year (for long-term access)
          // Signed URLs work regardless of bucket's public access settings
          const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
            .from('Questionnaire Files')
            .createSignedUrl(uploadData.path, 31536000); // 1 year in seconds
          
          if (signedUrlError) {
            console.error('❌ Error creating signed URL:', signedUrlError);
            // Fallback to public URL (may not work if bucket is private)
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from('Questionnaire Files')
              .getPublicUrl(uploadData.path);
            pdfUrl = publicUrl;
            console.warn('⚠️ Using public URL (may not be accessible):', pdfUrl);
          } else if (signedUrlData?.signedUrl) {
            pdfUrl = signedUrlData.signedUrl;
            console.log('✅ PDF uploaded to Supabase with signed URL:', pdfUrl);
            console.log('✅ Signed URL expires in 1 year');
          }
        }
      }
    } else {
      console.warn('⚠️ No user ID available (not provided and not authenticated)');
      console.warn('⚠️ Skipping PDF upload to Supabase');
    }
    
    // Convert PDF to base64 for JSON transmission (backward compatibility)
    const pdfBase64 = pdfBuffer.toString('base64');
    
    // Create JSON payload with all data
    const payload = {
      // Basic metadata
      email,
      companyName,
      companyDomain: questionnaireData.companyInfo?.companyDomain || '',
      fileName,
      submittedAt: new Date().toISOString(),
      
      // PDF URL (Supabase Storage link)
      pdfUrl,
      
      // PDF as base64 (backward compatibility)
      pdfBase64,
      pdfSize: pdfBuffer.length,
      
      // Step 2: What You Do (Q3-4)
      industry: questionnaireData.whatYouDo?.industry || '',
      whatYouDo: questionnaireData.whatYouDo?.whatYouDo || '',
      
      // Step 3: How You Do It (Q5-6)
      howYouDoIt: questionnaireData.howYouDoIt?.howYouDoIt || '',
      uniqueValue: questionnaireData.howYouDoIt?.uniqueValue || '',
      
      // Step 4: What You Deliver (Q7-9)
      mainService: questionnaireData.whatYouDeliver?.mainService || '',
      whatYouDeliver: questionnaireData.whatYouDeliver?.whatYouDeliver || '',
      topUseCases: questionnaireData.whatYouDeliver?.topUseCases || '',
      
      // Step 5: Creating Desire (Q10-11)
      barriers: questionnaireData.creatingDesire?.barriers || '',
      whyMoveAway: questionnaireData.creatingDesire?.whyMoveAway || '',
      
      // Step 6: Your Buyers (Q12-18)
      seniorityLevel: Array.isArray(questionnaireData.yourBuyers?.seniorityLevel) 
        ? questionnaireData.yourBuyers.seniorityLevel.join(', ') 
        : '',
      jobTitles: questionnaireData.yourBuyers?.jobTitles || '',
      companySize: questionnaireData.yourBuyers?.companySize || '',
      geographicMarkets: questionnaireData.yourBuyers?.geographicMarkets || '',
      preferredEngagement: questionnaireData.yourBuyers?.preferredEngagement || '',
      decisionMakerResponsibilities: questionnaireData.yourBuyers?.decisionMakerResponsibilities || '',
      prospectChallenges: questionnaireData.yourBuyers?.prospectChallenges || '',
      
      // Step 7: Social Proof (Q19-20)
      proofPoints: questionnaireData.socialProof?.proofPoints || '',
      clientReferences: questionnaireData.socialProof?.clientReferences || '',
      
      // Step 8: Positioning (Q21)
      competitors: questionnaireData.positioning?.competitors || '',
      
      // Step 9: Carrots & Lead Magnets (Q22)
      leadMagnet: questionnaireData.leadMagnets?.leadMagnet || '',
      
      // Step 10: Brand & Examples (Q23-27)
      emailExample1: questionnaireData.brandExamples?.emailExample1 || '',
      emailExample2: questionnaireData.brandExamples?.emailExample2 || '',
      emailExample3: questionnaireData.brandExamples?.emailExample3 || '',
      brandDocuments: questionnaireData.brandExamples?.brandDocuments || '',
      brandDocumentsUrls: questionnaireData.brandExamples?.brandDocuments 
        ? questionnaireData.brandExamples.brandDocuments.split(', ').filter(url => url.trim())
        : [],
      additionalFiles: questionnaireData.brandExamples?.additionalFiles || '',
      additionalFilesUrls: questionnaireData.brandExamples?.additionalFiles 
        ? questionnaireData.brandExamples.additionalFiles.split(', ').filter(url => url.trim())
        : [],
      totalFileCount: [
        ...(questionnaireData.brandExamples?.brandDocuments?.split(', ') || []),
        ...(questionnaireData.brandExamples?.additionalFiles?.split(', ') || [])
      ].filter(url => url.trim()).length
    };
    
    console.log('📋 Sending complete questionnaire data to Zapier with', Object.keys(questionnaireData).length, 'sections');
    console.log('📋 Sample fields being sent:', { email, companyName, companyDomain: payload.companyDomain, industry: payload.industry });
    console.log('📋 PDF URL:', pdfUrl || 'Not uploaded (no authenticated user)');
    console.log('📋 PDF size:', pdfBuffer.length, 'bytes, base64 size:', pdfBase64.length, 'chars');
    console.log('📋 File uploads:', { 
      brandDocuments: payload.brandDocumentsUrls.length, 
      additionalFiles: payload.additionalFilesUrls.length,
      total: payload.totalFileCount 
    });
    
    console.log('📤 Sending to Zapier webhook:', zapierWebhookUrl);
    console.log('📤 Content-Type: application/json');
    
    // Send to Zapier as JSON
    const response = await fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📤 Zapier response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Zapier webhook error:', errorText);
      throw new Error(`Zapier webhook failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Successfully sent to Zapier:', result);
    console.log('✅ Zapier request ID:', result.request_id || result.id);
    
    return NextResponse.json({
      success: true,
      message: 'PDF generated and sent to Zapier successfully',
      fileName,
      zapierResponse: result
    });
    
  } catch (error: any) {
    console.error('❌ Error in send-to-zapier:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF or send to Zapier',
        details: error.message
      },
      { status: 500 }
    );
  }
}

