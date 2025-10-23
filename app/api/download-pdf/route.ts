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
    
    console.log('📄 Generating PDF for download:', email);
    
    // Generate PDF
    const companyName = questionnaireData.companyInfo?.companyName || 'Client Company';
    const pdfBuffer = generateQuestionnairePDF({
      email,
      companyName,
      questionnaireData
    });
    
    const fileName = getFileName(companyName, email);
    console.log('📄 PDF generated for download:', fileName);
    
    // Return PDF as downloadable file (convert Buffer to Uint8Array for Next.js compatibility)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error generating PDF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error.message
      },
      { status: 500 }
    );
  }
}

