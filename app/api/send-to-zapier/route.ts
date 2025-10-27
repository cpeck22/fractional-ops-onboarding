import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';
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
    
    // Create FormData with the PDF and metadata
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });
    
    // Basic metadata
    formData.append('email', email);
    formData.append('companyName', companyName);
    formData.append('fileName', fileName);
    formData.append('submittedAt', new Date().toISOString());
    
    // Step 1: Who You Are (Q1-2)
    formData.append('companyDomain', questionnaireData.companyInfo?.companyDomain || '');
    
    // Step 2: What You Do (Q3-4)
    formData.append('industry', questionnaireData.whatYouDo?.industry || '');
    formData.append('whatYouDo', questionnaireData.whatYouDo?.whatYouDo || '');
    
    // Step 3: How You Do It (Q5-6)
    formData.append('howYouDoIt', questionnaireData.howYouDoIt?.howYouDoIt || '');
    formData.append('uniqueValue', questionnaireData.howYouDoIt?.uniqueValue || '');
    
    // Step 4: What You Deliver (Q7-9)
    formData.append('mainService', questionnaireData.whatYouDeliver?.mainService || '');
    formData.append('whatYouDeliver', questionnaireData.whatYouDeliver?.whatYouDeliver || '');
    formData.append('topUseCases', questionnaireData.whatYouDeliver?.topUseCases || '');
    
    // Step 5: Creating Desire (Q10-11)
    formData.append('barriers', questionnaireData.creatingDesire?.barriers || '');
    formData.append('whyMoveAway', questionnaireData.creatingDesire?.whyMoveAway || '');
    
    // Step 6: Your Buyers (Q12-18)
    formData.append('seniorityLevel', Array.isArray(questionnaireData.yourBuyers?.seniorityLevel) 
      ? questionnaireData.yourBuyers.seniorityLevel.join(', ') 
      : '');
    formData.append('jobTitles', questionnaireData.yourBuyers?.jobTitles || '');
    formData.append('companySize', questionnaireData.yourBuyers?.companySize || '');
    formData.append('geographicMarkets', questionnaireData.yourBuyers?.geographicMarkets || '');
    formData.append('preferredEngagement', questionnaireData.yourBuyers?.preferredEngagement || '');
    formData.append('decisionMakerResponsibilities', questionnaireData.yourBuyers?.decisionMakerResponsibilities || '');
    formData.append('prospectChallenges', questionnaireData.yourBuyers?.prospectChallenges || '');
    
    // Step 7: Social Proof (Q19-20)
    formData.append('proofPoints', questionnaireData.socialProof?.proofPoints || '');
    formData.append('clientReferences', questionnaireData.socialProof?.clientReferences || '');
    
    // Step 8: Positioning (Q21)
    formData.append('competitors', questionnaireData.positioning?.competitors || '');
    
    // Step 9: Carrots & Lead Magnets (Q22)
    formData.append('leadMagnet', questionnaireData.leadMagnets?.leadMagnet || '');
    
    // Step 10: Brand & Examples (Q23-27)
    formData.append('emailExample1', questionnaireData.brandExamples?.emailExample1 || '');
    formData.append('emailExample2', questionnaireData.brandExamples?.emailExample2 || '');
    formData.append('emailExample3', questionnaireData.brandExamples?.emailExample3 || '');
    formData.append('brandDocuments', questionnaireData.brandExamples?.brandDocuments || '');
    formData.append('additionalFiles', questionnaireData.brandExamples?.additionalFiles || '');
    
    console.log('📋 Sending complete questionnaire data to Zapier with', Object.keys(questionnaireData).length, 'sections');
    console.log('📋 Sample fields being sent:', { email, companyName, companyDomain, industry: questionnaireData.whatYouDo?.industry });
    
    console.log('📤 Sending to Zapier webhook:', zapierWebhookUrl);
    console.log('📤 Content-Type:', formData.getHeaders()['content-type']);
    
    // Send to Zapier
    const response = await fetch(zapierWebhookUrl, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders()
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

