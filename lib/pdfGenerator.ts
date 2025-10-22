import { jsPDF } from 'jspdf';
import { QuestionnaireData } from '@/types';

interface PDFData {
  email: string;
  companyName: string;
  questionnaireData: QuestionnaireData;
}

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
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RevOps Onboarding Questionnaire', margin, yPosition);
  yPosition += 10;
  
  // Client Info
  addText(email, 12, false);
  addText(companyName, 14, true);
  addSpace(5);
  
  // Question 1: Company Name
  addText('Question 1: Company Name*', 11, true);
  addText(questionnaireData.companyInfo?.companyName || 'Not provided', 10, false);
  addSpace();
  
  // Question 2: Company Domain
  addText('Question 2: Company Domain', 11, true);
  addText(questionnaireData.companyInfo?.companyDomain || 'Not provided', 10, false);
  addSpace();
  
  // Question 3: Industry
  addText('Question 3: What industry does your company operate in?*', 11, true);
  addText(questionnaireData.basicInfo?.industry || 'Not provided', 10, false);
  addSpace();
  
  // Question 4: What you do
  addText('Question 4: Describe what you do. Explain it to me like I\'m 10 years old*', 11, true);
  addText(questionnaireData.basicInfo?.whatYouDo || 'Not provided', 10, false);
  addSpace();
  
  // Question 5: How you do it
  addText('Question 5: Describe how you do it. Explain it to me like I\'m 10 years old*', 11, true);
  addText(questionnaireData.basicInfo?.howYouDoIt || 'Not provided', 10, false);
  addSpace();
  
  // Question 6: Unique value
  addText('Question 6: What makes your company unique or different from competitors?*', 11, true);
  addText(questionnaireData.basicInfo?.uniqueValue || 'Not provided', 10, false);
  addSpace();
  
  // Question 7: Main service
  addText('Question 7: How would you describe your main service or product?*', 11, true);
  addText(questionnaireData.basicInfo?.mainService || 'Not provided', 10, false);
  addSpace();
  
  // Question 8: What you deliver
  addText('Question 8: What do you actually deliver?*', 11, true);
  addText(questionnaireData.basicInfo?.whatYouDeliver || 'Not provided', 10, false);
  addSpace();
  
  // Question 9: Top use cases
  addText('Question 9: What are the top 3 use cases of your service or product?*', 11, true);
  addText(questionnaireData.basicInfo?.topUseCases || 'Not provided', 10, false);
  addSpace();
  
  // Question 10: Barriers
  addText('Question 10: What are all the reasons someone would not take you up on your offer? What gets in their way?*', 11, true);
  addText(questionnaireData.basicInfo?.barriers || 'Not provided', 10, false);
  addSpace();
  
  // Question 11: Why move away
  addText('Question 11: Why should they move away from the status quo?*', 11, true);
  addText(questionnaireData.basicInfo?.whyMoveAway || 'Not provided', 10, false);
  addSpace();
  
  // Question 12: Seniority level
  addText('Question 12: Role Seniority & Titles — Who specifically makes the buying decision?*', 11, true);
  const seniorityLevel = Array.isArray(questionnaireData.icp?.seniorityLevel) 
    ? questionnaireData.icp.seniorityLevel.join(', ')
    : 'Not provided';
  addText(seniorityLevel, 10, false);
  addSpace();
  
  // Question 13: Job titles
  addText('Question 13: Specific Job Titles*', 11, true);
  addText(questionnaireData.icp?.jobTitles || 'Not provided', 10, false);
  addSpace();
  
  // Question 14: Company size
  addText('Question 14: Which employee size, revenue range (or funding stage) do you typically work with?*', 11, true);
  addText(questionnaireData.icp?.companySize || 'Not provided', 10, false);
  addSpace();
  
  // Question 15: Geographic markets
  addText('Question 15: What geographic market(s) do you focus on?*', 11, true);
  addText(questionnaireData.icp?.geographicMarkets || 'Not provided', 10, false);
  addSpace();
  
  // Question 16: Preferred engagement
  addText('Question 16: How do these decision-makers prefer to be initially engaged?*', 11, true);
  addText(questionnaireData.icp?.preferredEngagement || 'Not provided', 10, false);
  addSpace();
  
  // Question 17: Decision maker responsibilities
  addText('Question 17: What are the main responsibilities of the decision-makers you sell to?*', 11, true);
  addText(questionnaireData.icp?.decisionMakerResponsibilities || 'Not provided', 10, false);
  addSpace();
  
  // Question 18: Prospect challenges
  addText('Question 18: What are the main challenges or pain your prospects currently face?*', 11, true);
  addText(questionnaireData.icp?.prospectChallenges || 'Not provided', 10, false);
  addSpace();
  
  // Question 19: Proof points
  addText('Question 19: Why should they believe you?*', 11, true);
  addText(questionnaireData.socialProof?.proofPoints || 'Not provided', 10, false);
  addSpace();
  
  // Question 20: Client references
  addText('Question 20: Who has gotten these results?*', 11, true);
  addText(questionnaireData.socialProof?.clientReferences || 'Not provided', 10, false);
  addSpace();
  
  // Question 21: Competitors
  addText('Question 21: Who else can solve this for them?*', 11, true);
  addText(questionnaireData.socialProof?.competitors || 'Not provided', 10, false);
  addSpace();
  
  // Question 22: Lead magnet
  addText('Question 22: What can we offer in exchange for someone interacting with us?*', 11, true);
  addText(questionnaireData.callToAction?.leadMagnet || 'Not provided', 10, false);
  addSpace();
  
  // Question 23: Email example 1
  addText('Question 23: What emails have received positive responses in the past?', 11, true);
  addText(questionnaireData.callToAction?.emailExample1 || 'Not provided', 10, false);
  addSpace();
  
  // Question 24: Email example 2
  addText('Question 24: What emails have received positive responses in the past?', 11, true);
  addText(questionnaireData.callToAction?.emailExample2 || 'Not provided', 10, false);
  addSpace();
  
  // Question 25: Email example 3
  addText('Question 25: What emails have received positive responses in the past?', 11, true);
  addText(questionnaireData.callToAction?.emailExample3 || 'Not provided', 10, false);
  
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

