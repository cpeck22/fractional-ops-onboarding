import { jsPDF } from 'jspdf';

interface StrategyPDFData {
  companyName: string;
  companyDomain: string;
  campaignIdeas: any[];
  prospectList: any[];
  coldEmails: {
    personalizedSolutions: any[];
    leadMagnetShort: any[];
    localCity: any[];
    problemSolution: any[];
    leadMagnetLong: any[];
  };
  linkedinPosts: {
    inspiring: string;
    promotional: string;
    actionable: string;
  };
  linkedinDMs: {
    newsletter: string;
    leadMagnet: string;
  };
  newsletters: {
    tactical: string;
    leadership: string;
  };
  callPrep: any;
  serviceOffering?: any;
  useCases?: any[];
  personas?: any[];
  clientReferences?: any[];
  segments?: any[];
}

export function generateStrategyPDF(data: StrategyPDFData): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin;
  
  // Helper functions
  const checkPageBreak = (spaceNeeded: number = 20) => {
    if (yPosition + spaceNeeded > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };
  
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.5; // Increased from 0.35 for better spacing
    const totalHeight = lines.length * lineHeight + 5;
    
    checkPageBreak(totalHeight);
    
    doc.text(lines, margin, yPosition);
    yPosition += totalHeight;
    doc.setTextColor(0, 0, 0); // Reset color
  };
  
  const addSpace = (space: number = 5) => {
    yPosition += space;
  };
  
  const addSectionHeader = (title: string) => {
    checkPageBreak(20);
    addSpace(8);
    doc.setFillColor(240, 240, 250);
    doc.rect(margin - 5, yPosition - 3, pageWidth - (margin * 2) + 10, 14, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(63, 81, 181);
    doc.text(title, margin, yPosition + 5);
    yPosition += 18; // Fixed spacing after header
    doc.setTextColor(0, 0, 0);
  };
  
  const addDivider = () => {
    checkPageBreak(5);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    addSpace(5);
  };
  
  // Title Page
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(63, 81, 181);
  doc.text(`${data.companyName}'s`, pageWidth / 2, 60, { align: 'center' });
  doc.text('CRO Strategy', pageWidth / 2, 75, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Built by Claire', pageWidth / 2, 90, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, 100, { align: 'center' });
  
  doc.addPage();
  yPosition = margin;
  
  // Campaign Ideas
  if (data.campaignIdeas && data.campaignIdeas.length > 0) {
    addSectionHeader('CAMPAIGN IDEAS');
    data.campaignIdeas.forEach((campaign: any, index: number) => {
      addText(`Campaign ${campaign.id || index + 1}: ${campaign.title}`, 12, true);
      addText(campaign.description, 10, false);
      addSpace(5);
    });
    addDivider();
  }
  
  // Prospect List
  if (data.prospectList && data.prospectList.length > 0) {
    addSectionHeader('REAL PROSPECT LIST');
    addText(`Found ${data.prospectList.length} qualified prospects matching your ideal customer profile`, 10, false, [100, 100, 100]);
    addSpace(4);
    
    const prospectsToShow = data.prospectList.slice(0, 10);
    prospectsToShow.forEach((prospect: any, index: number) => {
      checkPageBreak(20);
      addText(`${index + 1}. ${prospect.name || `Prospect ${index + 1}`}`, 11, true);
      if (prospect.title) addText(`   ${prospect.title}`, 9, false);
      if (prospect.company) addText(`   ${prospect.company}`, 9, false);
      if (prospect.linkedIn) addText(`   LinkedIn: ${prospect.linkedIn}`, 8, false, [0, 0, 255]);
      addSpace(3);
    });
    
    if (data.prospectList.length > 10) {
      addText(`+ ${data.prospectList.length - 10} more prospects available in your Octave workspace`, 9, false, [100, 100, 100]);
    }
    addDivider();
  }
  
  // Cold Emails - All 5 variants
  const emailVariants = [
    { key: 'personalizedSolutions', label: '3 Personalized Solutions' },
    { key: 'leadMagnetShort', label: 'Lead Magnet Focus (Short)' },
    { key: 'localCity', label: 'Local/Same City In Common' },
    { key: 'problemSolution', label: 'Problem/Solution Focus' },
    { key: 'leadMagnetLong', label: 'Lead Magnet Focus (Long)' }
  ];
  
  addSectionHeader('OUTBOUND COPY (COLD EMAILS)');
  emailVariants.forEach((variant, variantIndex) => {
    const emails = data.coldEmails[variant.key as keyof typeof data.coldEmails];
    if (emails && emails.length > 0) {
      checkPageBreak(25);
      addText(`Email Sequence ${variantIndex + 1}: ${variant.label}`, 12, true, [63, 81, 181]);
      addSpace(3);
      
      emails.forEach((email: any, emailIndex: number) => {
        checkPageBreak(30);
        addText(`Email ${emailIndex + 1}`, 11, true);
        addText(`Subject: ${email.subject}`, 10, true);
        addSpace(3);
        addText(email.email || email.body || 'No content available', 9, false);
        addSpace(5);
      });
      
      if (variantIndex < emailVariants.length - 1) {
        addSpace(4);
      }
    }
  });
  addDivider();
  
  // LinkedIn Posts - All 3 variants
  const postVariants = [
    { key: 'inspiring', label: 'Inspiring Post (Challenges Overcome / Client Story)' },
    { key: 'promotional', label: 'Promotional Post (Lead-Magnet)' },
    { key: 'actionable', label: 'Actionable Post (Explanation / Analysis)' }
  ];
  
  addSectionHeader('LINKEDIN POST COPY');
  postVariants.forEach((variant, index) => {
    const content = data.linkedinPosts[variant.key as keyof typeof data.linkedinPosts];
    if (content) {
      checkPageBreak(25);
      addText(`${index + 1}. ${variant.label}`, 11, true);
      addSpace(3);
      addText(content, 9, false);
      addSpace(5);
    }
  });
  addDivider();
  
  // LinkedIn DMs - Both variants
  const dmVariants = [
    { key: 'newsletter', label: 'Newsletter CTA' },
    { key: 'leadMagnet', label: 'Lead Magnet CTA' }
  ];
  
  addSectionHeader('LINKEDIN CONNECTION COPY');
  dmVariants.forEach((variant, index) => {
    const content = data.linkedinDMs[variant.key as keyof typeof data.linkedinDMs];
    if (content) {
      checkPageBreak(25);
      addText(`${index + 1}. LinkedIn DM - ${variant.label}`, 11, true);
      addSpace(3);
      addText(content, 9, false);
      addSpace(5);
    }
  });
  addDivider();
  
  // Newsletters - Both variants
  const newsletterVariants = [
    { key: 'tactical', label: 'Tactical Writing (Nurture Emails)' },
    { key: 'leadership', label: 'Leadership Writing (Nurture Emails)' }
  ];
  
  addSectionHeader('NEWSLETTER COPY');
  newsletterVariants.forEach((variant, index) => {
    const content = data.newsletters[variant.key as keyof typeof data.newsletters];
    if (content) {
      checkPageBreak(25);
      addText(`${index + 1}. ${variant.label}`, 11, true);
      addSpace(3);
      addText(content, 9, false);
      addSpace(5);
    }
  });
  addDivider();
  
  // Call Prep
  if (data.callPrep) {
    addSectionHeader('SAMPLE CALL-PREP');
    
    if (data.callPrep.discoveryQuestions && data.callPrep.discoveryQuestions.length > 0) {
      addText('Discovery Questions:', 11, true);
      addSpace(3);
      data.callPrep.discoveryQuestions.forEach((question: string, index: number) => {
        checkPageBreak(15);
        addText(`${index + 1}. ${question}`, 9, false);
        addSpace(2);
      });
      addSpace(5);
    }
    
    if (data.callPrep.callScript) {
      checkPageBreak(30);
      addText('Call Script:', 11, true);
      addSpace(3);
      addText(data.callPrep.callScript, 9, false);
      addSpace(5);
    }
    
    if (data.callPrep.objectionHandling) {
      checkPageBreak(30);
      addText('Objection Handling:', 11, true);
      addSpace(3);
      addText(data.callPrep.objectionHandling, 9, false);
      addSpace(5);
    }
    
    addDivider();
  }
  
  // Workspace Library
  addSectionHeader('WORKSPACE LIBRARY');
  addText('Foundational materials created in your Octave workspace', 10, false, [100, 100, 100]);
  addSpace(5);
  
  // Service Offering
  if (data.serviceOffering) {
    checkPageBreak(20);
    addText('Service Offering', 12, true);
    addSpace(2);
    addText(`Name: ${data.serviceOffering.name || 'N/A'}`, 10, false);
    if (data.serviceOffering.differentiatedValue) {
      addText(`Value: ${data.serviceOffering.differentiatedValue}`, 10, false);
    }
    addSpace(5);
  }
  
  // Personas
  if (data.personas && data.personas.length > 0) {
    checkPageBreak(20);
    addText(`Personas (${data.personas.length} created)`, 12, true);
    addSpace(2);
    data.personas.forEach((persona: any, index: number) => {
      checkPageBreak(15);
      addText(`${index + 1}. ${persona.name || 'Unnamed Persona'}`, 10, true);
      if (persona.data?.commonJobTitles && persona.data.commonJobTitles.length > 0) {
        addText(`   Job Titles: ${persona.data.commonJobTitles.slice(0, 3).join(', ')}...`, 9, false);
      }
      addSpace(2);
    });
    addSpace(5);
  }
  
  // Use Cases
  if (data.useCases && data.useCases.length > 0) {
    checkPageBreak(20);
    addText(`Use Cases (${data.useCases.length} created)`, 12, true);
    addSpace(2);
    data.useCases.forEach((useCase: any, index: number) => {
      checkPageBreak(20);
      addText(`${index + 1}. ${useCase.name || 'Unnamed Use Case'}`, 10, true);
      if (useCase.description) {
        addText(useCase.description.substring(0, 200) + '...', 9, false);
      }
      addSpace(3);
    });
    addSpace(5);
  }
  
  // Segments
  if (data.segments && data.segments.length > 0) {
    checkPageBreak(20);
    addText(`Market Segments (${data.segments.length} created)`, 12, true);
    addSpace(2);
    data.segments.forEach((segment: any, index: number) => {
      checkPageBreak(15);
      addText(`${index + 1}. ${segment.name || 'Unnamed Segment'}`, 10, true);
      if (segment.industry) {
        addText(`   Industry: ${segment.industry}`, 9, false);
      }
      addSpace(2);
    });
    addSpace(5);
  }
  
  // Client References
  if (data.clientReferences && data.clientReferences.length > 0) {
    checkPageBreak(20);
    addText(`Client References (${data.clientReferences.length} created)`, 12, true);
    addSpace(2);
    data.clientReferences.forEach((ref: any, index: number) => {
      checkPageBreak(15);
      addText(`${index + 1}. ${ref.companyName || 'Unnamed Company'}`, 10, true);
      if (ref.companyDomain) addText(`   Website: ${ref.companyDomain}`, 9, false);
      if (ref.industry) addText(`   Industry: ${ref.industry}`, 9, false);
      addSpace(3);
    });
  }
  
  // Convert to buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

export function getStrategyFileName(companyName: string): string {
  const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const sanitizedCompany = sanitize(companyName);
  const timestamp = new Date().toISOString().split('T')[0];
  
  return `Claire_Strategy_${sanitizedCompany}_${timestamp}.pdf`;
}

