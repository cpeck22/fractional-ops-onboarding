import { jsPDF } from 'jspdf';
import { QuestionnaireData } from '@/types';

interface PDFData {
  email: string;
  companyName: string;
  questionnaireData: QuestionnaireData;
}

// Section structure matching the Review page
const sectionTitles = [
  { id: 'companyInfo', title: 'Step 1: Who You Are', fields: [
    { key: 'companyName', label: 'Company Name' },
    { key: 'companyDomain', label: 'Company Domain' }
  ]},
  { id: 'whatYouDo', title: 'Step 2: What You Do', fields: [
    { key: 'industry', label: 'What industry does your company operate in?' },
    { key: 'whatYouDo', label: 'Describe what you do. Explain it to me like I\'m 10 years old' }
  ]},
  { id: 'howYouDoIt', title: 'Step 3: How You Do It', fields: [
    { key: 'howYouDoIt', label: 'Describe how you do it. Explain it to me like I\'m 10 years old' },
    { key: 'uniqueValue', label: 'What makes your company unique or different from competitors?' }
  ]},
  { id: 'whatYouDeliver', title: 'Step 4: What You Deliver', fields: [
    { key: 'mainService', label: 'How would you describe your main service or product?' },
    { key: 'whatYouDeliver', label: 'What do you actually deliver?' },
    { key: 'topUseCases', label: 'What are the top 3 use cases of your service or product?' }
  ]},
  { id: 'creatingDesire', title: 'Step 5: Creating Desire', fields: [
    { key: 'barriers', label: 'What are all the reasons someone would not take you up on your offer? What gets in their way?' },
    { key: 'whyMoveAway', label: 'Why should they move away from the status quo?' }
  ]},
  { id: 'yourBuyers', title: 'Step 6: Your Buyers', fields: [
    { key: 'seniorityLevel', label: 'Role Seniority & Titles: Who specifically makes the buying decision?' },
    { key: 'jobTitles', label: 'Specific Job Titles' },
    { key: 'companySize', label: 'Which employee size, revenue range (or funding stage) do you typically work with?' },
    { key: 'geographicMarkets', label: 'What geographic market(s) do you focus on?' },
    { key: 'preferredEngagement', label: 'How do these decision-makers prefer to be initially engaged?' },
    { key: 'decisionMakerResponsibilities', label: 'What are the main responsibilities of the decision-makers you sell to?' },
    { key: 'prospectChallenges', label: 'What are the main challenges or pain your prospects currently face?' }
  ]},
  { id: 'socialProof', title: 'Step 7: Social Proof', fields: [
    { key: 'proofPoints', label: 'Why should they believe you?' },
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
    { key: 'brandDocuments', label: 'Upload any brand documents you have' },
    { key: 'additionalFiles', label: 'You may have other files that didn\'t quite fit into my initial questions' }
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
  
  // Title - matching Review page
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Review Your Ops Transformation System™', margin, yPosition);
  yPosition += 8;
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const subtitle = 'Tactical systems to drive reliable profits and turn chaos into clarity.';
  doc.text(subtitle, margin, yPosition);
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
      
      if (value) {
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else {
          displayValue = value;
        }
      }
      
      // Question number (e.g., "1.1", "1.2", etc.)
      const questionNumber = `${sectionIndex + 1}.${fieldIndex + 1}`;
      
      // Question label with number
      addText(`${questionNumber} ${field.label}:`, 11, true);
      
      // Answer
      addText(displayValue, 10, false);
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

