import { NextRequest, NextResponse } from 'next/server';
import { QuestionnaireData } from '@/types';
import { generateQuestionnairePDF, getFileName } from '@/lib/pdfGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, questionnaireData } = body as {
      email: string;
      questionnaireData: QuestionnaireData;
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
    
    // Convert PDF to base64 for JSON transmission
    const pdfBase64 = pdfBuffer.toString('base64');
    
    // Create JSON payload with all data
    const payload = {
      // Basic metadata
      email,
      companyName,
      companyDomain: questionnaireData.companyInfo?.companyDomain || '',
      fileName,
      submittedAt: new Date().toISOString(),
      
      // PDF as base64
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
      additionalFiles: questionnaireData.brandExamples?.additionalFiles || ''
    };
    
    console.log('📋 Sending complete questionnaire data to Zapier with', Object.keys(questionnaireData).length, 'sections');
    console.log('📋 Sample fields being sent:', { email, companyName, companyDomain: payload.companyDomain, industry: payload.industry });
    console.log('📋 PDF size:', pdfBuffer.length, 'bytes, base64 size:', pdfBase64.length, 'chars');
    
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

