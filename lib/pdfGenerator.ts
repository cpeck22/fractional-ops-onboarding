import { jsPDF } from 'jspdf';
import { QuestionnaireData } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

interface PDFData {
  email: string;
  companyName: string;
  questionnaireData: QuestionnaireData;
}

// Section structure matching the Review page
const sectionTitles = [
  { id: 'companyInfo', title: 'Step 1: Who We Are', fields: [
    { key: 'companyName', label: 'Company Name' },
    { key: 'companyDomain', label: 'Company Domain' }
  ]},
  { id: 'whatYouDo', title: 'Step 2: What We Do', fields: [
    { key: 'industry', label: 'What industry do we operate in?' },
    { key: 'whatYouDo', label: 'Describe what we do. Explain it to me like I\'m 10 years old' }
  ]},
  { id: 'howYouDoIt', title: 'Step 3: How We Do It', fields: [
    { key: 'howYouDoIt', label: 'Describe how we do it. Explain it to me like I\'m 10 years old' },
    { key: 'uniqueValue', label: 'What makes our company unique or different from competitors?' }
  ]},
  { id: 'whatYouDeliver', title: 'Step 4: What We Deliver', fields: [
    { key: 'mainService', label: 'How would we describe our main service or product?' },
    { key: 'whatYouDeliver', label: 'What do we actually deliver?' },
    { key: 'topUseCases', label: 'What are the top 3 use cases of our service or product?' }
  ]},
  { id: 'creatingDesire', title: 'Step 5: Creating Desire', fields: [
    { key: 'barriers', label: 'What are all the reasons someone would not take us up on our offer? What gets in their way?' },
    { key: 'whyMoveAway', label: 'Why should they move away from the status quo?' }
  ]},
  { id: 'yourBuyers', title: 'Step 6: Our Buyers', fields: [
    { key: 'seniorityLevel', label: 'Role Seniority & Titles: Who specifically makes the buying decision?' },
    { key: 'jobTitles', label: 'Specific Job Titles' },
    { key: 'companySize', label: 'Which employee size, revenue range (or funding stage) do we typically work with?' },
    { key: 'geographicMarkets', label: 'What geographic market(s) do we focus on?' },
    { key: 'preferredEngagement', label: 'How do these decision-makers prefer to be initially engaged?' },
    { key: 'decisionMakerResponsibilities', label: 'What are the main responsibilities of the decision-makers we sell to?' },
    { key: 'prospectChallenges', label: 'What are the main challenges or pain our prospects currently face?' }
  ]},
  { id: 'socialProof', title: 'Step 7: Social Proof', fields: [
    { key: 'proofPoints', label: 'Why should they believe us?' },
    { key: 'clientReferences', label: 'Who has gotten these results?' }
  ]},
  { id: 'positioning', title: 'Step 8: Positioning', fields: [
    { key: 'competitors', label: 'Who else can solve this for them?' }
  ]},
  { id: 'leadMagnets', title: 'Step 9: Carrots & Lead Magnets', fields: [
    { key: 'leadMagnet', label: 'What can we offer in exchange for someone interacting with us?' }
  ]},
  { id: 'brandExamples', title: 'Step 10: Brand & Examples', fields: [
    { key: 'emailExample1', label: 'What emails have received positive responses in the past? Example 1' },
    { key: 'emailExample2', label: 'What emails have received positive responses in the past? Example 2' },
    { key: 'emailExample3', label: 'What emails have received positive responses in the past? Example 3' },
    { key: 'brandDocuments', label: 'Upload any brand documents we have' },
    { key: 'additionalFiles', label: 'We may have other files that didn\'t quite fit into my initial questions' }
  ]}
];

export function generateQuestionnairePDF(data: PDFData): Buffer {
  const { email, companyName, questionnaireData } = data;
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin;
  
  // Load logo as base64
  let logoBase64 = '';
  try {
    const logoPath = path.join(process.cwd(), 'app', 'Fractional-Ops_Symbol_Main- 2.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('⚠️ Could not load logo for PDF:', error);
  }
  
  // Add logo to top right
  // Logo aspect ratio: 1840 x 289 = 6.37:1 (width:height)
  if (logoBase64) {
    const logoHeight = 6; // mm (smaller size)
    const logoWidth = logoHeight * 6.37; // Maintain aspect ratio (~38mm)
    doc.addImage(logoBase64, 'PNG', pageWidth - margin - logoWidth, margin, logoWidth, logoHeight);
  }
  
  yPosition += 5; // Add space after logo
  
  // Helper function to add text and handle page breaks
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lines = doc.splitTextToSize(text, maxWidth);
    
    // Check if we need a new page
    if (yPosition + (lines.length * fontSize * 0.35) > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * fontSize * 0.35 + 3;
  };
  
  const addSpace = (space: number = 5) => {
    yPosition += space;
  };
  
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('10 Steps to Sales Excellence Questionnaire', margin, yPosition);
  yPosition += 10;
  
  // Loop through sections - matching Review page structure
  sectionTitles.forEach((section, sectionIndex) => {
    const sectionData = questionnaireData[section.id as keyof typeof questionnaireData] as any;
    
    // Section Header (e.g., "1. Company Information")
    addText(`${sectionIndex + 1}. ${section.title}`, 14, true);
    addSpace(2);
    
    // Loop through fields in section
    section.fields.forEach((field, fieldIndex) => {
      const value = sectionData?.[field.key];
      let displayValue = 'Not provided';
      
      // Question number (e.g., "1.1", "1.2", etc.)
      const questionNumber = `${sectionIndex + 1}.${fieldIndex + 1}`;
      
      // Question label with number
      addText(`${questionNumber} ${field.label}:`, 11, true);
      
      if (value) {
        // Special handling for client references (array of objects)
        if (field.key === 'clientReferences' && Array.isArray(value)) {
          if (value.length === 0) {
            addText('Not provided', 10, false);
          } else {
            value.forEach((ref: any, refIndex: number) => {
              const refNumber = refIndex + 1;
              addText(`Client Reference #${refNumber}:`, 10, true);
              addText(`  Company Name: ${ref.companyName || 'Not provided'}`, 10, false);
              addText(`  Website: ${ref.companyDomain || 'Not provided'}`, 10, false);
              addText(`  Industry: ${ref.industry || 'Not provided'}`, 10, false);
              if (ref.successStory) {
                addText(`  Success Story: ${ref.successStory}`, 10, false);
              }
              if (refIndex < value.length - 1) {
                addSpace(2);
              }
            });
          }
        } 
        // Regular array handling (like seniorityLevel)
        else if (Array.isArray(value)) {
          displayValue = value.join(', ');
          addText(displayValue, 10, false);
        } 
        // Regular text handling
        else {
          displayValue = value;
          addText(displayValue, 10, false);
        }
      } else {
        addText(displayValue, 10, false);
      }
      
      addSpace(3);
    });
    
    // Add section separator (except for last section)
    if (sectionIndex < sectionTitles.length - 1) {
      addSpace(3);
    }
  });
  
  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

export function getFileName(companyName: string, email: string): string {
  // Sanitize strings for filename
  const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const sanitizedCompany = sanitize(companyName);
  const sanitizedEmail = sanitize(email);
  
  return `RevOps_Onboarding_${sanitizedCompany}_${sanitizedEmail}.pdf`;
}

