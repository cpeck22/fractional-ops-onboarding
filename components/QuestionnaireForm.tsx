'use client';

import { useState, useEffect } from 'react';

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

const sectionFields: Record<string, Array<{key: string, label: string, placeholder: string, type: 'text' | 'textarea' | 'dropdown' | 'multiselect' | 'file', required?: boolean, description?: string, example?: string, options?: string[]}>> = {
  companyInfo: [
    { key: 'companyName', label: 'Company Name', placeholder: 'Enter your company name', type: 'text', required: true },
    { key: 'companyDomain', label: 'Company Domain', placeholder: 'e.g., example.com (without https://)', type: 'text', required: true }
  ],
  serviceInfo: [
    { 
      key: 'industry', 
      label: 'What industry does your company operate in?', 
      placeholder: 'e.g., Healthcare, Technology, Manufacturing, Logistics, etc.', 
      type: 'text', 
      required: true,
      description: 'This helps us understand your business context and create industry-specific solutions.',
      example: 'Example: "Healthcare Technology" or "Trucking and Logistics"'
    },
    { 
      key: 'keyResponsibilities', 
      label: 'What are the main responsibilities of your decision-makers?', 
      placeholder: 'Describe what your key stakeholders do day-to-day...', 
      type: 'textarea', 
      required: true,
      description: 'Understanding daily responsibilities helps us tailor our approach to their workflow.',
      example: 'Example: "Managing fleet operations, coordinating driver schedules, and optimizing delivery routes"'
    },
    { 
      key: 'competitiveEdge', 
      label: 'What makes your company unique or different from competitors?', 
      placeholder: 'Describe your unique value proposition...', 
      type: 'textarea', 
      required: true,
      description: 'Your competitive advantages help us highlight what sets you apart in the market.',
      example: 'Example: "Real-time GPS tracking, fuel optimization algorithms, and 24/7 customer support"'
    },
    { 
      key: 'commonProblems', 
      label: 'What are the main challenges your company currently faces?', 
      placeholder: 'Describe your biggest operational or business challenges...', 
      type: 'textarea', 
      required: true,
      description: 'Identifying current problems helps us create targeted solutions for your specific needs.',
      example: 'Example: "High fuel costs, driver retention issues, and inefficient route planning"'
    },
    { 
      key: 'serviceDescription', 
      label: 'How would you describe your main service or product?', 
      placeholder: 'Provide a brief description of what your company offers...', 
      type: 'textarea', 
      required: true,
      description: 'This helps us create accurate service descriptions for your Octave workspace.',
      example: 'Example: "We provide nationwide freight transportation services with real-time tracking and guaranteed delivery times"'
    }
  ],
  basicInfo: [
    { 
      key: 'industry', 
      label: 'What industry does your company operate in?', 
      placeholder: 'Corporate Real Estate Services, Legal Services, HR Consulting Services', 
      type: 'text', 
      required: true,
      description: 'This helps me understand your business context and create industry-specific solutions.',
      example: '"Corporate Real Estate Services", "Legal Services", "HR Consulting Services"'
    },
    { 
      key: 'whatYouDo', 
      label: 'Describe what you do. Explain it to me like I\'m 10 years old', 
      placeholder: 'We help companies find and set up offices so their teams have a good place to work and they don\'t waste money.', 
      type: 'textarea', 
      required: true,
      description: 'I\'ll build this out in way more detail for you behind the scenes, but I just need the basics for now.',
      example: '"We help companies find and set up offices so their teams have a good place to work and they don\'t waste money."'
    },
    { 
      key: 'howYouDoIt', 
      label: 'Describe how you do it. Explain it to me like I\'m 10 years old', 
      placeholder: 'We look at all the offices a company has, figure out which ones cost too much or don\'t work well, and help them find better spaces or better deals.', 
      type: 'textarea', 
      required: true,
      description: 'Again, I just need the basics in plain English for now.',
      example: '"We look at all the offices a company has, figure out which ones cost too much or don\'t work well, and help them find better spaces or better deals."'
    },
    { 
      key: 'uniqueValue', 
      label: 'What makes your company unique or different from competitors?', 
      placeholder: 'We built an internal lease benchmarking database that gives clients real-time market leverage', 
      type: 'textarea', 
      required: true,
      description: 'I need to know what actually sets you apart. This isn\'t aspirational. I need to know the real answer.',
      example: '"We built an internal lease benchmarking database that gives clients real-time market leverage"'
    },
    { 
      key: 'mainService', 
      label: 'How would you describe your main service or product?', 
      placeholder: 'Lease negotiation', 
      type: 'text', 
      required: true,
      description: 'We need to focus on your primary service or product to start. This is often the one you make the most revenue from. Be very specific. (Don\'t worry, we\'ll be adding your other services later).',
      example: '"Lease negotiation", "Employment law advisory", "Implementing performance management systems"'
    },
    { 
      key: 'whatYouDeliver', 
      label: 'What do you actually deliver?', 
      placeholder: 'Signed lease agreements with improved terms', 
      type: 'textarea', 
      required: true,
      description: 'I need to know the 1-3 tangible outputs of what you do. Many prospects like "things" (They need to know what they\'re paying you for).',
      example: '"Signed lease agreements with improved terms", "A fully-executed office relocation, including vendor coordination and move management"'
    },
    { 
      key: 'topUseCases', 
      label: 'What are the top 3 use cases of your service or product?', 
      placeholder: 'Negotiating lease renewals', 
      type: 'textarea', 
      required: true,
      description: 'These are practical applications of your offering that describe how you deliver value. These should be the most common or most loved way people use your service or product.',
      example: '"Negotiating lease renewals", "Space strategy for hybrid work models", "Managing relocations and build-outs for new offices"'
    },
    { 
      key: 'barriers', 
      label: 'What are all the reasons someone would not take you up on your offer? What gets in their way?', 
      placeholder: 'They\'re locked into long-term leases and don\'t see an immediate need', 
      type: 'textarea', 
      required: true,
      description: 'I need to know this to help you proactively overcome these when I build your playbooks.',
      example: '"They\'re locked into long-term leases and don\'t see an immediate need", "They believe they can handle negotiations internally"'
    },
    { 
      key: 'whyMoveAway', 
      label: 'Why should they move away from the status quo?', 
      placeholder: 'You\'ll be able to show cost savings on leases leadership assumed were fixed', 
      type: 'textarea', 
      required: true,
      description: 'Sometimes, your biggest competitor is inaction. The prospect understands your benefits at a high level, but it can\'t answer the "what\'s in it for them."',
      example: '"You\'ll be able to show cost savings on leases leadership assumed were fixed", "You\'ll make faster, better decisions with clear data instead of guesswork"'
    }
  ],
  icp: [
    { 
      key: 'seniorityLevel', 
      label: 'Role Seniority & Titles: Who specifically makes the buying decision?', 
      placeholder: 'Select seniority levels', 
      type: 'multiselect', 
      required: true,
      options: ['Owner', 'Founder', 'C-Suite', 'Partner', 'Vp', 'Head', 'Director', 'Manager', 'Senior', 'Entry', 'Intern'],
      description: 'This is important for when we start building lists of people to target.',
      example: 'VP / Director — VP of Corporate Real Estate, Director of Workplace Strategy'
    },
    { 
      key: 'jobTitles', 
      label: 'Specific Job Titles', 
      placeholder: 'VP of Corporate Real Estate, Director of Workplace Strategy', 
      type: 'text', 
      required: true,
      description: 'Provide the actual job titles of your decision-makers.',
      example: 'VP of Corporate Real Estate, Director of Workplace Strategy'
    },
    { 
      key: 'companySize', 
      label: 'Which employee size, revenue range (or funding stage) do you typically work with?', 
      placeholder: '1000–8,000 employees and $100M–$1B in annual revenue', 
      type: 'text', 
      required: true,
      description: 'We don\'t want to target people who can\'t afford us, and we also don\'t want to target companies where the roles you just picked aren\'t personally involved in buying our services.',
      example: '"1000–8,000 employees and $100M–$1B in annual revenue"'
    },
    { 
      key: 'geographicMarkets', 
      label: 'What geographic market(s) do you focus on?', 
      placeholder: 'New York, Chicago, and San Francisco', 
      type: 'text', 
      required: true,
      description: 'I don\'t want to launch campaigns in London if you can only service New York, Boston, and Philadelphia.',
      example: '"New York, Chicago, and San Francisco"'
    },
    { 
      key: 'preferredEngagement', 
      label: 'How do these decision-makers prefer to be initially engaged?', 
      placeholder: 'Email Outreach', 
      type: 'text', 
      required: true,
      description: 'Think about how your contacts usually respond to you. Do they answer your calls? Respond to LinkedIn DMs? Email you back?',
      example: '"Email Outreach", "LinkedIn DMs", "Phone calls", "In-person"'
    },
    { 
      key: 'decisionMakerResponsibilities', 
      label: 'What are the main responsibilities of the decision-makers you sell to?', 
      placeholder: 'Overseeing property acquisitions, lease negotiations, and client portfolio management', 
      type: 'textarea', 
      required: true,
      description: 'I need to know this to map the answers to my next questions to their daily realities.',
      example: '"Overseeing property acquisitions, lease negotiations, and client portfolio management"'
    },
    { 
      key: 'prospectChallenges', 
      label: 'What are the main challenges or pain your prospects currently face?', 
      placeholder: 'Difficulty optimizing their real estate footprint while reducing operational costs', 
      type: 'textarea', 
      required: true,
      description: 'Identifying current problems helps me create targeted solutions to solve their problems.',
      example: '"Difficulty optimizing their real estate footprint while reducing operational costs"'
    }
  ],
  socialProof: [
    { 
      key: 'proofPoints', 
      label: 'Why should they believe you?', 
      placeholder: 'Clients typically save 15–25% on occupancy costs through lease renegotiations and portfolio optimization', 
      type: 'textarea', 
      required: true,
      description: 'Proof Points are key pieces of evidence seen across all customers — think quantifiable results like cost savings, x% performance improvements, or even qualitative metrics.',
      example: '"Clients typically save 15–25% on occupancy costs through lease renegotiations and portfolio optimization"'
    },
    { 
      key: 'clientReferences', 
      label: 'Who has gotten these results?', 
      placeholder: 'FedEx (https://www.fedex.com) reduced real estate costs by consolidating regional offices', 
      type: 'textarea', 
      required: true,
      description: 'I need 1-3 client references to start. Creating detailed reference clients will help me showcase how real people are succeeding with our service (or product) offering.',
      example: 'FedEx (https://www.fedex.com) reduced real estate costs by consolidating regional offices'
    },
    { 
      key: 'competitors', 
      label: 'Who else can solve this for them?', 
      placeholder: 'CBRE — https://www.cbre.com', 
      type: 'textarea', 
      required: true,
      description: 'I need a list of your competitors (at least 1–3 to start). All I need is the Company Name and Website.',
      example: 'CBRE — https://www.cbre.com'
    }
  ],
  callToAction: [
    { 
      key: 'leadMagnet', 
      label: 'What can we offer in exchange for someone interacting with us?', 
      placeholder: 'An online lease savings calculator that shows how much they could save based on current square footage, headcount, and location', 
      type: 'textarea', 
      required: true,
      description: 'We need to entice people with something tangible. They don\'t know us yet and have no reason to care unless we give them one.',
      example: '"An online lease savings calculator that shows how much they could save based on current square footage, headcount, and location"'
    },
    { 
      key: 'emailExample1', 
      label: 'What emails have received positive responses in the past? Example 1', 
      placeholder: 'Copy and paste your email example here...', 
      type: 'textarea', 
      required: true,
      description: 'Share emails that have worked well for you in the past.',
      example: 'Copy and paste your email example here...'
    },
    { 
      key: 'emailExample2', 
      label: 'What emails have received positive responses in the past? Example 2', 
      placeholder: 'Copy and paste your email example here...', 
      type: 'textarea', 
      required: false,
      description: 'Share another email that has worked well for you.',
      example: 'Copy and paste your email example here...'
    },
    { 
      key: 'emailExample3', 
      label: 'What emails have received positive responses in the past? Example 3', 
      placeholder: 'Copy and paste your email example here...', 
      type: 'textarea', 
      required: false,
      description: 'Share a third email that has worked well for you.',
      example: 'Copy and paste your email example here...'
    }
  ],
  brand: [
    { 
      key: 'brandDocuments', 
      label: 'Upload any brand documents you have, such as: Tone of Voice, Brand Standards and Guidelines, Writing Guidelines, Core Values, Manifestos, Founder Story', 
      placeholder: 'Upload your brand documents', 
      type: 'file', 
      required: false,
      description: 'We shouldn\'t launch any campaigns or make social content that don\'t sound like you.',
      example: 'Upload files like Tone of Voice, Brand Standards, Writing Guidelines, etc.'
    },
    { 
      key: 'additionalFiles', 
      label: 'You may have other files that didn\'t quite fit into my initial questions. Upload all of them here', 
      placeholder: 'Upload additional files', 
      type: 'file', 
      required: false,
      description: 'Upload any other relevant files that didn\'t fit into the previous questions.',
      example: 'Upload any additional relevant files'
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
  const [formData, setFormData] = useState(data || {});

  useEffect(() => {
    setFormData(data || {});
  }, [data]);

  const handleFieldChange = (key: string, value: string | string[]) => {
    const newData = { ...formData, [key]: value };
    setFormData(newData);
    onDataChange(newData);
  };

  const fields = sectionFields[section.id] || [];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-fo-primary mb-2">{section.title}</h2>
        <p className="text-fo-secondary">{section.description}</p>
      </div>

      <div className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.key} className="bg-white p-6 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-fo-secondary mb-2">
              {`Question ${index + 1}: `}
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {field.description && (
              <p className="text-sm text-gray-600 mb-2">
                {field.description}
              </p>
            )}
            
            {field.example && (
              <p className="text-sm text-gray-500 italic mb-3 bg-gray-50 p-2 rounded">
                {field.example}
              </p>
            )}
            
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-fo-accent focus:border-fo-accent resize-vertical text-fo-primary"
              />
            ) : field.type === 'dropdown' ? (
              <select
                value={formData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-fo-accent focus:border-fo-accent text-fo-primary"
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
                        className="rounded border-gray-300 text-fo-accent focus:ring-fo-accent"
                      />
                      <span className="text-sm text-fo-primary">{option}</span>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-fo-accent focus:border-fo-accent text-fo-primary"
              />
            ) : (
              <input
                type={field.type}
                value={formData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-fo-accent focus:border-fo-accent text-fo-primary"
              />
            )}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onPrevious}
          disabled={isFirstSection}
          className="px-6 py-2 border border-gray-300 rounded-md text-fo-secondary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2 bg-gradient-to-r from-fo-primary to-fo-accent text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-accent"
        >
          {isLastSection ? 'Review & Submit' : 'Next Section'}
        </button>
      </div>
    </div>
  );
}
