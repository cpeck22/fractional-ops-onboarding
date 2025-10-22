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
    formData.append('email', email);
    formData.append('companyName', companyName);
    formData.append('fileName', fileName);
    
    console.log('📤 Sending to Zapier webhook:', zapierWebhookUrl);
    
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

