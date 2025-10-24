'use client';

import { useState, useEffect } from 'react';
import { useQuestionnaire } from './QuestionnaireProvider';
import ClaireVideoPlaceholder from './ClaireVideoPlaceholder';
import toast from 'react-hot-toast';

interface Section {
  id: string;
  title: string;
  description: string;
}

interface QuestionnaireFormProps {
  section: Section;
  data: any;
  onDataChange: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstSection: boolean;
  isLastSection: boolean;
}

const sectionFields: Record<string, Array<{key: string, label: string, placeholder: string, type: 'text' | 'textarea' | 'dropdown' | 'multiselect' | 'file', required?: boolean, description?: string, example?: string, options?: string[], questionNumber?: number}>> = {
  // Step 1: Who You Are (Q1-2)
  companyInfo: [
    { key: 'companyName', label: 'Company Name', placeholder: 'Please Type Your Answer here', type: 'text', required: true, questionNumber: 1 },
    { key: 'companyDomain', label: 'Company Domain', placeholder: 'example.com', type: 'text', required: true, description: 'Enter your domain without https:// or www.', questionNumber: 2 }
  ],
  // Step 2: What You Do (Q3-4)
  whatYouDo: [
    { 
      key: 'industry', 
      label: 'What industry does your company operate in?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'text', 
      required: true,
      description: 'This helps me understand your business context and create industry-specific solutions.',
      example: '"Corporate Real Estate Services"\n\n"Legal Services"\n\n"HR Consulting Services"',
      questionNumber: 3
    },
    { 
      key: 'whatYouDo', 
      label: 'Describe what you do. Explain it to me like I\'m 10 years old', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'I\'ll build this out in way more detail for you behind the scenes, but I just need the basics for now.',
      example: '"We help companies find and set up offices so their teams have a good place to work and they don\'t waste money."\n\n"We help companies make sure their business deals and contracts are done the right way so they don\'t get into trouble."\n\n"We help companies fix how they hire, manage, and grow their teams so people actually enjoy working there."',
      questionNumber: 4
    }
  ],
  // Step 3: How You Do It (Q5-6)
  howYouDoIt: [
    { 
      key: 'howYouDoIt', 
      label: 'Describe how you do it. Explain it to me like I\'m 10 years old', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'Again, I just need the basics in plain English for now.',
      example: '"We look at all the offices a company has, figure out which ones cost too much or don\'t work well, and help them find better spaces or better deals."\n\n"We read the contracts and rules for the company, make sure everything is fair and legal, and help them fix anything that could cause problems later."\n\n"We talk to the company\'s leaders, see what\'s not working with their people, and help them set up better ways to hire, manage, and grow their teams."',
      questionNumber: 5
    },
    { 
      key: 'uniqueValue', 
      label: 'What makes your company unique or different from competitors?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'I need to know what actually sets you apart. This isn\'t aspirational. I need to know the real answer.',
      example: '"We built an internal lease benchmarking database that gives clients real-time market leverage"\n\n"We use a proprietary risk assessment model to identify compliance gaps faster than traditional methods"\n\n"We developed a repeatable framework for diagnosing and restructuring underperforming teams in under 30 days"',
      questionNumber: 6
    }
  ],
  // Step 4: What You Deliver (Q7-9)
  whatYouDeliver: [
    { 
      key: 'mainService', 
      label: 'How would you describe your main service or product?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'text', 
      required: true,
      description: 'We need to focus on your primary service or product to start. This is often the one you make the most revenue from. Be very specific. (Don\'t worry, we\'ll be adding your other services later).',
      example: '"Lease negotiation"\n\n"Employment law advisory"\n\n"Implementing performance management systems"',
      questionNumber: 7
    },
    { 
      key: 'whatYouDeliver', 
      label: 'What do you actually deliver?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'I need to know the 1-3 tangible outputs of what you do. Many prospects like "things" (They need to know what they\'re paying you for). Remember, this isn\'t your Service or Product — it\'s the output of your services or products.',
      example: '**From a Corporate Real Estate Services company**\n"Signed lease agreements with improved terms"\n"A fully-executed office relocation, including vendor coordination and move management"\n"An implemented space management system with live floor plans and seat assignments"\n\n**From a Legal Services company**\n"Finalized and executed commercial contracts"\n"A completed legal entity structure, ready for launch"\n"Clean cap tables and board consents prepared for an upcoming raise"\n\n**From a HR Consulting Services company**\n"A live performance review tool running inside their HRIS"\n"New compensation bands rolled out to managers and employees"\n"A working onboarding flow with automated tasks and templates"',
      questionNumber: 8
    },
    { 
      key: 'topUseCases', 
      label: 'What are the top 3 use cases of your service or product?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'These are practical applications of your offering that describe how you deliver value. These should be the most common or most loved way people use your service or product.',
      example: '**From a Corporate Real Estate Services company**\n"Negotiating lease renewals"\n"Space strategy for hybrid work models"\n"Managing relocations and build-outs for new offices"\n\n**From a Legal Services company**\n"Advising on M&A transactions and due diligence"\n"Drafting and reviewing commercial contracts"\n"Providing ongoing legal counsel for corporate governance"\n\n**From a HR Consulting Services company**\n"Redesigning performance management systems"\n"Installing structured compensation plans"\n"Creating Interview Templates"',
      questionNumber: 9
    }
  ],
  // Step 5: Creating Desire (Q10-11)
  creatingDesire: [
    { 
      key: 'barriers', 
      label: 'What are all the reasons someone would not take you up on your offer? What gets in their way?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'I need to know this to help you proactively overcome these when I build your playbooks.',
      example: '**From a Corporate Real Estate Services company**\n"They\'re locked into long-term leases and don\'t see an immediate need"\n"They believe they can handle negotiations internally"\n"They think switching providers will create too much disruption"\n\n**From a Legal Services company**\n"They already have in-house counsel and don\'t see the value in external support"\n"They\'re concerned about high hourly rates and unpredictable costs"\n"They think legal help is only needed reactively, not proactively"\n\n**From a HR Consulting Services company**\n"They believe their internal HR team can handle it"\n"They think results will take too long"\n"They\'ve had a bad experience with a previous HR vendor"',
      questionNumber: 10
    },
    { 
      key: 'whyMoveAway', 
      label: 'Why should they move away from the status quo?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'Sometimes, your biggest competitor is inaction. The prospect understands your benefits at a high level, but it can\'t answer the "what\'s in it for them." How would you paint a picture of the future in a way that makes it impossible for your prospect to avoid learning more? What\'s in it for them?',
      example: '**Corporate Real Estate:**\n• "Show cost savings on leases"\n\n• "Make faster, better decisions with clear data"\n\n• "Reduce time managing deals and vendors"\n\n**Legal Services:**\n• "Spend less time on low-risk contracts"\n\n• "Manage legal costs predictably"\n\n• "Reduce deal delays from legal backlogs"\n\n**HR Consulting:**\n• "Stop repeating performance issues"\n\n• "Show clear HR impact metrics"\n\n• "Recover credibility after failed initiatives"',
      questionNumber: 11
    }
  ],
  // Step 6: Your Buyers (Q12-18)
  yourBuyers: [
    { 
      key: 'seniorityLevel', 
      label: 'Role Seniority & Titles: Who specifically makes the buying decision?', 
      placeholder: 'Select seniority levels', 
      type: 'multiselect', 
      required: true,
      options: ['Owner', 'Founder', 'C-Suite', 'Partner', 'Vp', 'Head', 'Director', 'Manager', 'Senior', 'Entry', 'Intern'],
      description: 'This is important for when we start building lists of people to target.',
      example: '• VP / Director — VP of Corporate Real Estate, Director of Workplace Strategy\n\n• Managing Partner / Senior Partner — Managing Partner, Head of Employment Law\n\n• C-Suite / Director — Chief People Officer, Director of HR Strategy',
      questionNumber: 12
    },
    { 
      key: 'jobTitles', 
      label: 'Specific Job Titles', 
      placeholder: 'Please Type Your Answer here', 
      type: 'text', 
      required: true,
      description: 'Provide the actual job titles of your decision-makers.',
      example: 'VP of Corporate Real Estate, Director of Workplace Strategy',
      questionNumber: 13
    },
    { 
      key: 'companySize', 
      label: 'Which employee size, revenue range (or funding stage) do you typically work with?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'text', 
      required: true,
      description: 'We don\'t want to target people who can\'t afford us, and we also don\'t want to target companies where the roles you just picked aren\'t personally involved in buying our services.',
      example: '• "1,000–8,000 employees and $100M–$1B revenue"\n\n• "100–200 employees and $15–30M revenue"\n\n• "200–1,000 employees, Series A+"',
      questionNumber: 14
    },
    { 
      key: 'geographicMarkets', 
      label: 'What geographic market(s) do you focus on?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'text', 
      required: true,
      description: 'I don\'t want to launch campaigns in London if you can only service New York, Boston, and Philadelphia.',
      example: '• "New York, Chicago, and San Francisco"\n\n• "Northeast U.S., primarily Boston and Philadelphia"\n\n• "National U.S. coverage with major Canadian cities"',
      questionNumber: 15
    },
    { 
      key: 'preferredEngagement', 
      label: 'How do these decision-makers prefer to be initially engaged?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'text', 
      required: true,
      description: 'Think about how your contacts usually respond to you. Do they answer your calls? Respond to LinkedIn DMs? Email you back?',
      example: '• "Email Outreach"\n\n• "LinkedIn DMs"\n\n• "Phone calls"\n\n• "In-person"',
      questionNumber: 16
    },
    { 
      key: 'decisionMakerResponsibilities', 
      label: 'What are the main responsibilities of the decision-makers you sell to?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'I need to know this to map the answers to my next questions to their daily realities.',
      example: '• "Overseeing property acquisitions, lease negotiations, and client portfolios"\n\n• "Managing litigation strategy and compliance"\n\n• "Advising clients on workforce strategy and HR compliance"',
      questionNumber: 17
    },
    { 
      key: 'prospectChallenges', 
      label: 'What are the main challenges or pain your prospects currently face?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'Identifying current problems helps me create targeted solutions to solve their problems.',
      example: '• "Difficulty optimizing real estate footprint while reducing costs"\n\n• "Navigating complex legal issues without in-house counsel"\n\n• "Struggling to build scalable HR processes during growth"',
      questionNumber: 18
    }
  ],
  // Step 7: Social Proof (Q19-20)
  socialProof: [
    { 
      key: 'proofPoints', 
      label: 'Why should they believe you?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'Proof Points are key pieces of evidence seen across all customers — think quantifiable results like cost savings, x% performance improvements, or even qualitative metrics. Ultimately, these are positive business outcomes you\'ve achieved for similar people.',
      example: '**Corporate Real Estate:**\n• "Clients save 15–25% on occupancy costs"\n\n• "Lease cycle times reduced by 30–40%"\n\n• "20% improvement in space utilization"\n\n**Legal Services:**\n• "Contract turnaround reduced by 25–35%"\n\n• "Identify and mitigate $250K+ legal risk exposure"\n\n• "100% on-time M&A closings"\n\n**HR Consulting:**\n• "15–20% employee engagement improvement"\n\n• "Time-to-hire reduced by 30%"\n\n• "Scaled headcount 2–4x with stable performance"',
      questionNumber: 19
    },
    { 
      key: 'clientReferences', 
      label: 'Who has gotten these results?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'I need 1-3 client references to start. Creating detailed reference clients will help me showcase how real people are succeeding with our service (or product) offering. I need you to either name the actual client and give me their website (I\'ll can gather more details behind the scenes for you) or if you can\'t name them, just describe them. If actually naming them, I need this format: [Client\'s Company Name] (Client\'s website url) [Describe the result]',
      example: '**Corporate Real Estate:**\n• FedEx (https://www.fedex.com) — Reduced real estate costs via consolidation\n\n• Global financial firm — Improved lease cycle time by 30%\n\n**Legal Services:**\n• Mid-market SaaS — Closed $100M acquisition with no compliance issues\n\n• PE firm ($2B AUM) — Standardized contracts across 6 entities\n\n**HR Consulting:**\n• Shopify (https://www.shopify.com) — Improved engagement by 18% in 6 months\n\n• PE-backed manufacturer — Designed review system across 5 plants',
      questionNumber: 20
    }
  ],
  // Step 8: Positioning (Q21)
  positioning: [
    { 
      key: 'competitors', 
      label: 'Who else can solve this for them?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: true,
      description: 'I need a list of your competitors (at least 1–3 to start). All I need is the Company Name and Website.',
      example: '**Corporate Real Estate:**\n• CBRE — https://www.cbre.com\n\n• JLL — https://www.us.jll.com\n\n• Cushman & Wakefield — https://www.cushmanwakefield.com\n\n**Legal Services:**\n• Wilson Sonsini — https://www.wsgr.com\n\n• Cooley LLP — https://www.cooley.com\n\n• Latham & Watkins — https://www.lw.com\n\n**HR Consulting:**\n• Mercer — https://www.mercer.com\n\n• Korn Ferry — https://www.kornferry.com\n\n• Gallup — https://www.gallup.com',
      questionNumber: 21
    }
  ],
  // Step 9: Carrots & Lead Magnets (Q22)
  leadMagnets: [
    { 
      key: 'leadMagnet', 
      label: 'What can we offer in exchange for someone interacting with us?', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: false,
      description: 'We need to entice people with something tangible. They don\'t know us yet and have no reason to care unless we give them one. These could be as simple as a proprietary report or as big as a complementary service. Some people refer to these as "Lead Magnets." The best versions of these are something that you have actually charged for, that you can give away for free. And ideally something that you have (or could) charge $2–10k for. The worst versions are "audits". From your last answers, I already know you\'re great, but these prospects don\'t know you, so they won\'t care about a service from an unproven and unknown random (even if it\'s free). PS. Don\'t worry, if you only have the simple ones right now (like white papers or reports), I\'ll help you operationalize these into something more valuable later.',
      example: '• "Online lease savings calculator"\n\n• "M&A deal checklist and data room folder structure"\n\n• "Performance review toolkit with templates and HRIS integration"',
      questionNumber: 22
    }
  ],
  // Step 10: Brand & Examples (Q23-27)
  brandExamples: [
    { 
      key: 'emailExample1', 
      label: 'What emails have received positive responses in the past? Copy and paste the examples below: Example 1', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: false,
      description: 'Share emails that have worked well for you in the past.',
      questionNumber: 23
    },
    { 
      key: 'emailExample2', 
      label: 'What emails have received positive responses in the past? Copy and paste the examples below: Example 2', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: false,
      description: 'Share another email that has worked well for you.',
      questionNumber: 24
    },
    { 
      key: 'emailExample3', 
      label: 'What emails have received positive responses in the past? Copy and paste the examples below: Example 3', 
      placeholder: 'Please Type Your Answer here', 
      type: 'textarea', 
      required: false,
      description: 'Share a third email that has worked well for you.',
      questionNumber: 25
    },
    { 
      key: 'brandDocuments', 
      label: 'Almost done (I promise). I need to know how you speak! We shouldn\'t launch any campaigns or make social content that don\'t sound like you. This step is simple: just upload any brand documents you have, such as: Tone of Voice, Brand Standards and Guidelines, Writing Guidelines, Core Values, Manifestos, Founder Story', 
      placeholder: 'Upload your brand documents', 
      type: 'file', 
      required: false,
      description: 'We shouldn\'t launch any campaigns or make social content that don\'t sound like you.',
      example: 'Upload files like Tone of Voice, Brand Standards, Writing Guidelines, etc.',
      questionNumber: 26
    },
    { 
      key: 'additionalFiles', 
      label: '…and what else? You may have other files that didn\'t quite fit into my initial questions. Upload all of them here👇', 
      placeholder: 'Upload additional files', 
      type: 'file', 
      required: false,
      description: 'Upload any other relevant files that didn\'t fit into the previous questions.',
      example: 'Upload any additional relevant files',
      questionNumber: 27
    }
  ]
};

export default function QuestionnaireForm({
  section,
  data,
  onDataChange,
  onNext,
  onPrevious,
  isFirstSection,
  isLastSection
}: QuestionnaireFormProps) {
  console.log('📝 QuestionnaireForm: Component rendering...');
  console.log('📝 QuestionnaireForm: Section:', section);
  console.log('📝 QuestionnaireForm: Data:', data);
  
  const [formData, setFormData] = useState(data || {});
  const { isSaving, saveCurrentData } = useQuestionnaire();
  const [savingField, setSavingField] = useState<string | null>(null);

  console.log('📝 QuestionnaireForm: Form data:', formData);

  useEffect(() => {
    setFormData(data || {});
  }, [data]);

  const handleFieldChange = (key: string, value: string | string[]) => {
    console.log('📝 QuestionnaireForm: handleFieldChange called with:', { key, value });
    const newData = { ...formData, [key]: value };
    console.log('📝 QuestionnaireForm: New form data:', newData);
    setFormData(newData);
    console.log('📝 QuestionnaireForm: Calling onDataChange with:', newData);
    onDataChange(newData);
  };

  const handleSaveField = async (fieldKey: string) => {
    setSavingField(fieldKey);
    try {
      await saveCurrentData();
    } finally {
      setSavingField(null);
    }
  };

  const handleNext = async () => {
    // Validate company domain - check for https://, http://, or www.
    if (section.id === 'companyInfo' && formData.companyDomain) {
      const domain = formData.companyDomain.toString();
      if (/^https?:\/\//i.test(domain) || /^www\./i.test(domain)) {
        toast.error('Please remove https and/or www from the company domain');
        return;
      }
    }

    // Validate required fields before proceeding
    const requiredFields = fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => {
      const value = formData[field.key];
      // Check if field is empty or (for multiselect) if array is empty
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return !value || value.trim() === '';
    });

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => `Question ${f.questionNumber}`).join(', ');
      toast.error(`Please fill out all required fields: ${fieldNames}`);
      return;
    }

    // Save progress before moving to next section
    await saveCurrentData();
    onNext();
  };

  const fields = sectionFields[section.id] || [];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fo-primary mb-2">{section.title}</h2>
        <p className="text-fo-text-secondary font-light">{section.description}</p>
      </div>

      {/* Claire's Video Placeholder */}
      <ClaireVideoPlaceholder 
        sectionTitle={section.title}
        sectionDescription={section.description}
      />

      <div className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.key} className="bg-white p-6 rounded-lg border border-fo-light shadow-sm">
            <label className="block text-sm font-semibold text-fo-text mb-2">
              {`Question ${field.questionNumber}: `}
              {field.label}
              {field.required && <span className="text-fo-orange ml-1">*</span>}
            </label>
            
            {field.description && (
              <p className="text-sm text-fo-text-secondary font-light mb-2">
                {field.description}
              </p>
            )}
            
            {field.example && (
              <p className="text-sm text-fo-text-secondary italic mb-3 bg-fo-light p-3 rounded border-l-4 border-fo-secondary">
                <span className="font-medium text-fo-primary">Examples:</span><br />
                <span style={{ whiteSpace: 'pre-line' }} dangerouslySetInnerHTML={{ __html: field.example.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></span>
              </p>
            )}
            
            <div className="space-y-2">
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                required={field.required}
                className="w-full px-3 py-2 border border-fo-light rounded-md focus:outline-none focus:ring-2 focus:ring-fo-primary focus:border-fo-primary resize-vertical text-fo-text"
              />
            ) : field.type === 'dropdown' ? (
              <select
                value={formData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2 border border-fo-light rounded-md focus:outline-none focus:ring-2 focus:ring-fo-primary focus:border-fo-primary text-fo-text"
              >
                <option value="">{field.placeholder}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : field.type === 'multiselect' ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-2">
                  Selected: {Array.isArray(formData[field.key]) ? formData[field.key].join(', ') : 'None'}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {field.options?.map((option) => (
                    <label key={option} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(formData[field.key]) && formData[field.key].includes(option)}
                        onChange={(e) => {
                          const currentValues = Array.isArray(formData[field.key]) ? formData[field.key] : [];
                          const newValues = e.target.checked
                            ? [...currentValues, option]
                            : currentValues.filter((val: string) => val !== option);
                          handleFieldChange(field.key, newValues);
                        }}
                        className="rounded border-fo-light text-fo-primary focus:ring-fo-primary"
                      />
                      <span className="text-sm text-fo-text font-medium">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : field.type === 'file' ? (
              <input
                type="file"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleFieldChange(field.key, Array.from(files).map(file => file.name).join(', '));
                  }
                }}
                multiple
                className="w-full px-3 py-2 border border-fo-light rounded-md focus:outline-none focus:ring-2 focus:ring-fo-primary focus:border-fo-primary text-fo-text"
              />
            ) : (
              <input
                type={field.type}
                value={formData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-3 py-2 border border-fo-light rounded-md focus:outline-none focus:ring-2 focus:ring-fo-primary focus:border-fo-primary text-fo-text"
              />
            )}
            
            <button
              type="button"
              onClick={() => handleSaveField(field.key)}
              disabled={savingField === field.key}
              className="mt-2 px-4 py-2 bg-fo-secondary text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-secondary font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {savingField === field.key ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-fo-light">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstSection}
          className="px-6 py-2 border border-fo-light rounded-md text-fo-text-secondary hover:bg-fo-light disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Previous
        </button>
        
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={saveCurrentData}
            disabled={isSaving}
            className="px-6 py-2 bg-fo-secondary text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-secondary font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Save Progress</span>
              </>
            )}
        </button>
        
        <button
          type="button"
          onClick={handleNext}
          disabled={isSaving}
            className="px-8 py-2 bg-gradient-to-r from-fo-primary to-fo-secondary text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastSection ? 'Review & Submit' : 'Next Section'}
        </button>
        </div>
      </div>
    </div>
  );
}
