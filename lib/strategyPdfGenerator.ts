import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

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
  const headerHeight = 20; // Space reserved for logo
  const footerHeight = 15; // Space reserved for page number
  let yPosition = margin + headerHeight;
  
  // Load logo as base64
  let logoBase64 = '';
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Fractional-Ops_Symbol_Main.png');
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.warn('⚠️ Could not load logo for PDF:', error);
  }
  
  // Helper function to add header with logo on every page
  const addHeaderAndFooter = () => {
    const currentPage = doc.internal.pages.length - 1;
    
    // Add logo to top right (skip on title page)
    if (logoBase64 && currentPage > 1) {
      const logoSize = 15; // mm
      doc.addImage(logoBase64, 'PNG', pageWidth - margin - logoSize, margin - 5, logoSize, logoSize);
    }
    
    // Add page number at bottom center (skip on title page)
    if (currentPage > 1) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${currentPage - 1}`, 
        pageWidth / 2, 
        pageHeight - 10, 
        { align: 'center' }
      );
      doc.setTextColor(0, 0, 0); // Reset
    }
  };
  
  // Helper functions
  const checkPageBreak = (spaceNeeded: number = 20) => {
    if (yPosition + spaceNeeded > pageHeight - footerHeight - margin) {
      addHeaderAndFooter(); // Add header/footer to current page
      doc.addPage();
      yPosition = margin + headerHeight;
      addHeaderAndFooter(); // Add header/footer to new page
      return true;
    }
    return false;
  };
  
  const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.5;
    const totalHeight = lines.length * lineHeight + 5;
    
    checkPageBreak(totalHeight);
    
    doc.text(lines, margin, yPosition);
    yPosition += totalHeight;
    doc.setTextColor(0, 0, 0); // Reset color
  };
  
  const addSpace = (space: number = 5) => {
    yPosition += space;
  };
  
  // CHANGE #1: Black background with white font for section headers
  const addSectionHeader = (title: string) => {
    checkPageBreak(20);
    addSpace(8);
    
    // Black background
    doc.setFillColor(0, 0, 0);
    doc.rect(margin - 5, yPosition - 5, pageWidth - (margin * 2) + 10, 14, 'F');
    
    // White text
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin, yPosition + 4);
    
    yPosition += 18;
    doc.setTextColor(0, 0, 0); // Reset to black
  };
  
  const addDivider = () => {
    checkPageBreak(5);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    addSpace(5);
  };
  
  // CHANGE #2: Helper to ensure items don't split across pages
  const ensureSpaceForItem = (estimatedHeight: number) => {
    if (yPosition + estimatedHeight > pageHeight - footerHeight - margin) {
      addHeaderAndFooter();
      doc.addPage();
      yPosition = margin + headerHeight;
      addHeaderAndFooter();
    }
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
  
  // Add logo to title page
  if (logoBase64) {
    const logoSize = 25;
    doc.addImage(logoBase64, 'PNG', pageWidth / 2 - logoSize / 2, 115, logoSize, logoSize);
  }
  
  doc.addPage();
  yPosition = margin + headerHeight;
  addHeaderAndFooter();
  
  // Campaign Ideas
  if (data.campaignIdeas && data.campaignIdeas.length > 0) {
    addSectionHeader('CAMPAIGN IDEAS');
    data.campaignIdeas.forEach((campaign: any, index: number) => {
      ensureSpaceForItem(40); // Ensure entire campaign fits on page
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
      ensureSpaceForItem(30); // Ensure entire prospect fits on page
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
      ensureSpaceForItem(35); // Ensure variant header fits
      addText(`Email Sequence ${variantIndex + 1}: ${variant.label}`, 12, true, [63, 81, 181]);
      addSpace(3);
      
      emails.forEach((email: any, emailIndex: number) => {
        // CHANGE #2: Ensure each email stays on one page
        const emailLines = doc.splitTextToSize(email.email || email.body || 'No content available', maxWidth);
        const estimatedEmailHeight = (emailLines.length * 4.5) + 30;
        ensureSpaceForItem(estimatedEmailHeight);
        
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
      // CHANGE #2: Ensure each post stays on one page
      const postLines = doc.splitTextToSize(content, maxWidth);
      const estimatedPostHeight = (postLines.length * 4.5) + 25;
      ensureSpaceForItem(estimatedPostHeight);
      
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
      // CHANGE #2: Ensure each DM stays on one page
      const dmLines = doc.splitTextToSize(content, maxWidth);
      const estimatedDMHeight = (dmLines.length * 4.5) + 25;
      ensureSpaceForItem(estimatedDMHeight);
      
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
      // CHANGE #2: Ensure each newsletter stays on one page
      const newsletterLines = doc.splitTextToSize(content, maxWidth);
      const estimatedNewsletterHeight = (newsletterLines.length * 4.5) + 25;
      ensureSpaceForItem(estimatedNewsletterHeight);
      
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
        ensureSpaceForItem(15);
        addText(`${index + 1}. ${question}`, 9, false);
        addSpace(2);
      });
      addSpace(5);
    }
    
    if (data.callPrep.callScript) {
      const scriptLines = doc.splitTextToSize(data.callPrep.callScript, maxWidth);
      const estimatedScriptHeight = (scriptLines.length * 4.5) + 20;
      ensureSpaceForItem(estimatedScriptHeight);
      addText('Call Script:', 11, true);
      addSpace(3);
      addText(data.callPrep.callScript, 9, false);
      addSpace(5);
    }
    
    if (data.callPrep.objectionHandling) {
      const objectionLines = doc.splitTextToSize(data.callPrep.objectionHandling, maxWidth);
      const estimatedObjectionHeight = (objectionLines.length * 4.5) + 20;
      ensureSpaceForItem(estimatedObjectionHeight);
      addText('Objection Handling:', 11, true);
      addSpace(3);
      addText(data.callPrep.objectionHandling, 9, false);
      addSpace(5);
    }
    
    addDivider();
  }
  
  // Misc. (formerly Workspace Library)
  addSectionHeader('MISC.');
  addText('Foundational library materials created in your Octave workspace', 10, false, [100, 100, 100]);
  addSpace(8);
  
  // Service Offering - FULL DETAIL
  if (data.serviceOffering) {
    ensureSpaceForItem(40);
    addText('SERVICE OFFERING', 13, true, [63, 81, 181]);
    addSpace(4);
    
    addText(`Name: ${data.serviceOffering.name || 'N/A'}`, 11, true);
    addSpace(2);
    
    if (data.serviceOffering.description) {
      addText(`Description: ${data.serviceOffering.description}`, 9, false);
      addSpace(2);
    }
    
    if ((data.serviceOffering as any).data?.type) {
      addText(`Type: ${(data.serviceOffering as any).data.type}`, 9, false);
      addSpace(2);
    }
    
    if ((data.serviceOffering as any).data?.summary) {
      addText('Summary:', 10, true);
      addText((data.serviceOffering as any).data.summary, 9, false);
      addSpace(3);
    }
    
    if ((data.serviceOffering as any).data?.capabilities && (data.serviceOffering as any).data.capabilities.length > 0) {
      addText('Key Capabilities:', 10, true);
      (data.serviceOffering as any).data.capabilities.forEach((cap: string) => {
        addText(`• ${cap}`, 9, false);
      });
      addSpace(3);
    }
    
    if ((data.serviceOffering as any).data?.differentiatedValue && (data.serviceOffering as any).data.differentiatedValue.length > 0) {
      addText('Differentiated Value:', 10, true);
      (data.serviceOffering as any).data.differentiatedValue.forEach((val: string) => {
        addText(`• ${val}`, 9, false);
      });
      addSpace(3);
    }
    
    if ((data.serviceOffering as any).data?.statusQuo && (data.serviceOffering as any).data.statusQuo.length > 0) {
      addText('Status Quo:', 10, true);
      (data.serviceOffering as any).data.statusQuo.forEach((sq: string) => {
        addText(`• ${sq}`, 9, false);
      });
      addSpace(3);
    }
    
    if ((data.serviceOffering as any).data?.challengesAddressed && (data.serviceOffering as any).data.challengesAddressed.length > 0) {
      addText('Challenges Addressed:', 10, true);
      (data.serviceOffering as any).data.challengesAddressed.forEach((ch: string) => {
        addText(`• ${ch}`, 9, false);
      });
      addSpace(3);
    }
    
    if ((data.serviceOffering as any).data?.customerBenefits && (data.serviceOffering as any).data.customerBenefits.length > 0) {
      addText('Customer Benefits:', 10, true);
      (data.serviceOffering as any).data.customerBenefits.forEach((ben: string) => {
        addText(`• ${ben}`, 9, false);
      });
      addSpace(3);
    }
    
    if ((data.serviceOffering as any).qualifyingQuestions && (data.serviceOffering as any).qualifyingQuestions.length > 0) {
      addText(`Qualifying Questions (${(data.serviceOffering as any).qualifyingQuestions.length}):`, 10, true);
      (data.serviceOffering as any).qualifyingQuestions.forEach((q: any, idx: number) => {
        ensureSpaceForItem(20);
        addText(`${idx + 1}. ${q.question}`, 9, true);
        addText(`   Rationale: ${q.rationale}`, 8, false, [80, 80, 80]);
        addText(`   Fit: ${q.fitType} | Weight: ${q.weight}`, 8, false, [100, 100, 100]);
        addSpace(2);
      });
    }
    
    addSpace(8);
  }
  
  // Personas - FULL DETAIL
  if (data.personas && data.personas.length > 0) {
    ensureSpaceForItem(40);
    addText(`PERSONAS (${data.personas.length})`, 13, true, [63, 81, 181]);
    addSpace(4);
    
    data.personas.forEach((persona: any, index: number) => {
      ensureSpaceForItem(35);
      addText(`${index + 1}. ${persona.name || 'Unnamed Persona'}`, 11, true);
      addSpace(2);
      
      if (persona.internalName) {
        addText(`Internal Name: ${persona.internalName}`, 9, false, [80, 80, 80]);
      }
      
      if (persona.description) {
        addText(`Description: ${persona.description}`, 9, false);
        addSpace(2);
      }
      
      if (persona.data?.commonJobTitles && persona.data.commonJobTitles.length > 0) {
        addText('Common Job Titles:', 9, true);
        persona.data.commonJobTitles.slice(0, 10).forEach((title: string) => {
          addText(`• ${title}`, 8, false);
        });
        addSpace(2);
      }
      
      if (persona.data?.primaryResponsibilities && persona.data.primaryResponsibilities.length > 0) {
        addText('Primary Responsibilities:', 9, true);
        persona.data.primaryResponsibilities.forEach((resp: string) => {
          addText(`• ${resp}`, 8, false);
        });
        addSpace(2);
      }
      
      if (persona.data?.painPoints && persona.data.painPoints.length > 0) {
        addText('Pain Points:', 9, true);
        persona.data.painPoints.forEach((pain: string) => {
          addText(`• ${pain}`, 8, false);
        });
        addSpace(2);
      }
      
      if (persona.data?.keyConcerns && persona.data.keyConcerns.length > 0) {
        addText('Key Concerns:', 9, true);
        persona.data.keyConcerns.forEach((concern: string) => {
          addText(`• ${concern}`, 8, false);
        });
        addSpace(2);
      }
      
      if (persona.data?.keyObjectives && persona.data.keyObjectives.length > 0) {
        addText('Key Objectives:', 9, true);
        persona.data.keyObjectives.forEach((obj: string) => {
          addText(`• ${obj}`, 8, false);
        });
        addSpace(2);
      }
      
      if (persona.data?.whyTheyMatterToUs && persona.data.whyTheyMatterToUs.length > 0) {
        addText('Why They Matter To Us:', 9, true);
        persona.data.whyTheyMatterToUs.forEach((why: string) => {
          addText(`• ${why}`, 8, false);
        });
        addSpace(2);
      }
      
      if (persona.data?.whyWeMatterToThem && persona.data.whyWeMatterToThem.length > 0) {
        addText('Why We Matter To Them:', 9, true);
        persona.data.whyWeMatterToThem.forEach((why: string) => {
          addText(`• ${why}`, 8, false);
        });
        addSpace(2);
      }
      
      if (persona.qualifyingQuestions && persona.qualifyingQuestions.length > 0) {
        addText(`Qualifying Questions (${persona.qualifyingQuestions.length}):`, 9, true);
        persona.qualifyingQuestions.slice(0, 5).forEach((q: any, qIdx: number) => {
          addText(`${qIdx + 1}. ${q.question}`, 8, false);
          addText(`   ${q.rationale}`, 7, false, [100, 100, 100]);
          addSpace(1);
        });
        addSpace(2);
      }
      
      addSpace(5);
    });
    
    addSpace(8);
  }
  
  // Use Cases - FULL DETAIL
  if (data.useCases && data.useCases.length > 0) {
    ensureSpaceForItem(40);
    addText(`USE CASES (${data.useCases.length})`, 13, true, [63, 81, 181]);
    addSpace(4);
    
    data.useCases.forEach((useCase: any, index: number) => {
      ensureSpaceForItem(30);
      addText(`${index + 1}. ${useCase.name || 'Unnamed Use Case'}`, 11, true);
      addSpace(2);
      
      if (useCase.internalName) {
        addText(`Internal Name: ${useCase.internalName}`, 9, false, [80, 80, 80]);
      }
      
      if (useCase.description) {
        addText(`Description: ${useCase.description}`, 9, false);
        addSpace(2);
      }
      
      if (useCase.data?.summary) {
        addText('Summary:', 9, true);
        addText(useCase.data.summary, 8, false);
        addSpace(2);
      }
      
      if (useCase.data?.scenarios && useCase.data.scenarios.length > 0) {
        addText('Scenarios:', 9, true);
        useCase.data.scenarios.forEach((scenario: string) => {
          addText(`• ${scenario}`, 8, false);
        });
        addSpace(2);
      }
      
      if (useCase.data?.desiredOutcomes && useCase.data.desiredOutcomes.length > 0) {
        addText('Desired Outcomes:', 9, true);
        useCase.data.desiredOutcomes.forEach((outcome: string) => {
          addText(`• ${outcome}`, 8, false);
        });
        addSpace(2);
      }
      
      if (useCase.data?.businessDrivers && useCase.data.businessDrivers.length > 0) {
        addText('Business Drivers:', 9, true);
        useCase.data.businessDrivers.forEach((driver: string) => {
          addText(`• ${driver}`, 8, false);
        });
        addSpace(2);
      }
      
      addSpace(5);
    });
    
    addSpace(8);
  }
  
  // Segments - FULL DETAIL
  if (data.segments && data.segments.length > 0) {
    ensureSpaceForItem(40);
    addText(`MARKET SEGMENTS (${data.segments.length})`, 13, true, [63, 81, 181]);
    addSpace(4);
    
    data.segments.forEach((segment: any, index: number) => {
      ensureSpaceForItem(30);
      addText(`${index + 1}. ${segment.name || 'Unnamed Segment'}`, 11, true);
      addSpace(2);
      
      if (segment.internalName) {
        addText(`Internal Name: ${segment.internalName}`, 9, false, [80, 80, 80]);
      }
      
      if (segment.description) {
        addText(`Description: ${segment.description}`, 9, false);
        addSpace(2);
      }
      
      if (segment.data?.fitExplanation) {
        addText('Fit Explanation:', 9, true);
        addText(segment.data.fitExplanation, 8, false);
        addSpace(2);
      }
      
      if (segment.data?.keyPriorities && segment.data.keyPriorities.length > 0) {
        addText('Key Priorities:', 9, true);
        segment.data.keyPriorities.forEach((priority: string) => {
          addText(`• ${priority}`, 8, false);
        });
        addSpace(2);
      }
      
      if (segment.data?.keyConsiderations && segment.data.keyConsiderations.length > 0) {
        addText('Key Considerations:', 9, true);
        segment.data.keyConsiderations.forEach((consideration: string) => {
          addText(`• ${consideration}`, 8, false);
        });
        addSpace(2);
      }
      
      if (segment.data?.uniqueApproach && segment.data.uniqueApproach.length > 0) {
        addText('Unique Approach:', 9, true);
        segment.data.uniqueApproach.forEach((approach: string) => {
          addText(`• ${approach}`, 8, false);
        });
        addSpace(2);
      }
      
      if (segment.qualifyingQuestions && segment.qualifyingQuestions.length > 0) {
        addText(`Qualifying Questions (${segment.qualifyingQuestions.length}):`, 9, true);
        segment.qualifyingQuestions.slice(0, 5).forEach((q: any, qIdx: number) => {
          addText(`${qIdx + 1}. ${q.question}`, 8, false);
          addText(`   ${q.rationale}`, 7, false, [100, 100, 100]);
          addSpace(1);
        });
        addSpace(2);
      }
      
      addSpace(5);
    });
    
    addSpace(8);
  }
  
  // Client References - FULL DETAIL
  if (data.clientReferences && data.clientReferences.length > 0) {
    ensureSpaceForItem(40);
    addText(`CLIENT REFERENCES (${data.clientReferences.length})`, 13, true, [63, 81, 181]);
    addSpace(4);
    
    data.clientReferences.forEach((ref: any, index: number) => {
      ensureSpaceForItem(30);
      addText(`${index + 1}. ${ref.name || ref.internalName || 'Unnamed Reference'}`, 11, true);
      addSpace(2);
      
      if (ref.name && ref.internalName && ref.name !== ref.internalName) {
        addText(`Internal Name: ${ref.internalName}`, 9, false, [80, 80, 80]);
      }
      
      if (ref.description) {
        addText(`Description: ${ref.description}`, 9, false);
        addSpace(2);
      }
      
      if (ref.data?.howTheyMakeMoney) {
        addText('How They Make Money:', 9, true);
        addText(ref.data.howTheyMakeMoney, 8, false);
        addSpace(2);
      }
      
      if (ref.data?.howTheyUseProduct) {
        addText('How They Use Our Product/Service:', 9, true);
        addText(ref.data.howTheyUseProduct, 8, false);
        addSpace(2);
      }
      
      if (ref.data?.howTheyBenefitFromProduct) {
        addText('How They Benefit:', 9, true);
        addText(ref.data.howTheyBenefitFromProduct, 8, false);
        addSpace(2);
      }
      
      if (ref.data?.howWeImpactedTheirBusiness && ref.data.howWeImpactedTheirBusiness.length > 0) {
        addText('How We Impacted Their Business:', 9, true);
        ref.data.howWeImpactedTheirBusiness.forEach((impact: string) => {
          addText(`• ${impact}`, 8, false);
        });
        addSpace(2);
      }
      
      if (ref.data?.keyStats && ref.data.keyStats.length > 0) {
        addText('Key Stats:', 9, true);
        ref.data.keyStats.forEach((stat: string) => {
          addText(`• ${stat}`, 8, false);
        });
        addSpace(2);
      }
      
      if (ref.data?.emailSnippets && ref.data.emailSnippets.length > 0) {
        addText(`Email Snippets (${ref.data.emailSnippets.length}):`, 9, true);
        ref.data.emailSnippets.slice(0, 3).forEach((snippet: string) => {
          addText(`"${snippet}"`, 8, false, [80, 80, 80]);
          addSpace(1);
        });
        addSpace(2);
      }
      
      addSpace(5);
    });
  }
  
  // CHANGE #3 & #4: Add final header/footer
  addHeaderAndFooter();
  
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
