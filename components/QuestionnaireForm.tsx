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

const sectionFields: Record<string, Array<{key: string, label: string, placeholder: string, type: 'text' | 'textarea', required?: boolean, description?: string, example?: string}>> = {
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
  icp: [
    { key: 'roleTitle', label: 'Role & Title: Who specifically makes the buying decision?', placeholder: 'Typically C-Level or VP-Level Executives...', type: 'textarea' },
    { key: 'companyStage', label: 'Company Stage: Which company size, revenue range, or funding stage do you typically target?', placeholder: 'See Spreadsheet', type: 'textarea' },
    { key: 'keyResponsibilities', label: 'Key Responsibilities: What do these decision-makers do on a day-to-day basis?', placeholder: 'Our Services are only needed during very finite portions...', type: 'textarea' },
    { key: 'locationIndustry', label: 'Location & Industry: Are there geographic or vertical markets you focus on?', placeholder: 'Most of our services are concentrated on companies operating in North America...', type: 'textarea' },
    { key: 'relationshipDynamics', label: 'Relationship Dynamics: How do these decision-makers prefer to be engaged?', placeholder: 'Quick view content, whitepapers, blogs, and other industry trends...', type: 'textarea' }
  ],
  icpSegments: [
    { key: 'microSegments', label: 'Micro-Segments: Within your ICP, do you have sub-groups that buy for different reasons?', placeholder: 'Yes, depending on the target industry and campaign...', type: 'textarea' },
    { key: 'highestLTGP', label: 'Highest Lifetime Gross Profit (LTGP): Which segment delivers the highest LTGP?', placeholder: 'Projects that utilize all of our core services are the largest profit driver...', type: 'textarea' },
    { key: 'fastestToClose', label: 'Fastest to Close: Which segment moves through your pipeline quickest?', placeholder: 'The lifecycle of a project typically is 6 to 12 months...', type: 'textarea' },
    { key: 'specialRequirements', label: 'Special Requirements: Do certain segments require compliance or specialized features?', placeholder: 'Enter any special requirements...', type: 'textarea' },
    { key: 'tailoredMessaging', label: 'Tailored Messaging: What are the 1–2 key differentiators for each sub-group?', placeholder: 'We will provide our scripts and email templates...', type: 'textarea' }
  ],
  reasonsToBuy: [
    { key: 'pastWins', label: 'Past Wins: Why have your top 5 customers historically chosen you over competitors?', placeholder: '1. Conflict free advisory services and solutions...', type: 'textarea' },
    { key: 'compellingEvents', label: 'Compelling Events: What triggers urgency in their decision to purchase?', placeholder: 'There are triggering events such as a lease expiration...', type: 'textarea' },
    { key: 'emotionalDrivers', label: 'Emotional Drivers: What emotional factors push them to say "yes"?', placeholder: 'Lack market knowledge or ability to find the information...', type: 'textarea' },
    { key: 'competitiveEdge', label: 'Competitive Edge: What is one thing only you can do for them?', placeholder: 'Helping companies make unbiased location decisions...', type: 'textarea' },
    { key: 'proofOutcomes', label: 'Proof & Outcomes: What hard data or results do you use to validate?', placeholder: 'Case studies, track records, client recommendations...', type: 'textarea' }
  ],
  dreamOutcome: [
    { key: 'idealResult', label: 'Ideal Result: If your client woke up in 12 months with perfect outcome, what does that look like?', placeholder: 'Industrial – Our facility is fully operational...', type: 'textarea' },
    { key: 'longTermValue', label: 'Long-Term Value: What\'s the impact on their revenue, time saved, or process improvement?', placeholder: 'Similar to the above.', type: 'textarea' },
    { key: 'strategicAdvantage', label: 'Strategic Advantage: How does this "dream outcome" position them against competitors?', placeholder: 'SSG\'s strategic advice on where to locate allowed us...', type: 'textarea' },
    { key: 'scalability', label: 'Scalability: How does success open up future growth opportunities?', placeholder: 'SSG allows us to be more scalable as we are able...', type: 'textarea' },
    { key: 'visionAlignment', label: 'Vision Alignment: How does your solution tie into their broader vision?', placeholder: 'Creating a better workplace for their employees and customers', type: 'textarea' }
  ],
  problemsBarriers: [
    { key: 'commonObjections', label: 'Common Objections: What do prospects usually say that stops them?', placeholder: '"We have a broker or someone who handles real estate already"', type: 'textarea' },
    { key: 'internalRoadblocks', label: 'Internal Roadblocks: Are there political or organizational barriers?', placeholder: 'It is important that we are speaking to a decision maker...', type: 'textarea' },
    { key: 'misconceptions', label: 'Misconceptions: Are there industry myths that hurt conversions?', placeholder: 'Sometimes people mistake us for a software as a service firm.', type: 'textarea' },
    { key: 'technicalGaps', label: 'Technical Gaps: Do prospects worry about integrations or compatibility?', placeholder: 'No', type: 'textarea' },
    { key: 'riskFactors', label: 'Risk Factors: What potential pitfalls make them hesitant?', placeholder: 'They think they can do it themselves inhouse.', type: 'textarea' }
  ],
  solutions: [
    { key: 'keyDifferentiators', label: 'Key Differentiators: How does your product/service address major problems?', placeholder: 'SSG offers a broader service platform than a traditional...', type: 'textarea' },
    { key: 'technicalIntegration', label: 'Technical Integration: What built-in integrations or APIs do you have?', placeholder: 'N/A', type: 'textarea' },
    { key: 'implementationSupport', label: 'Implementation Support: How do you ensure smooth onboarding?', placeholder: 'N/A', type: 'textarea' },
    { key: 'roiProofPoints', label: 'ROI Proof Points: What hard metrics or case studies do you share?', placeholder: 'Provided in marketing material and website content...', type: 'textarea' },
    { key: 'futureProofing', label: 'Future-Proofing: How will your solution evolve to meet changing needs?', placeholder: 'We typically start with a pilot project...', type: 'textarea' }
  ],
  timeDelay: [
    { key: 'averageDeploymentTimeline', label: 'Average Deployment Timeline: From contract signing to implementation?', placeholder: '1 week to have a kick off call. A typically engagement takes 6 to 12 months.', type: 'textarea' },
    { key: 'initialWins', label: 'Initial Wins: When do clients start seeing noticeable results?', placeholder: 'We can typically provide some preliminary saving estimates...', type: 'textarea' },
    { key: 'longTermResults', label: 'Long-Term Results: How long before they see full ROI?', placeholder: 'Our clients are easily break-even on the cost of our services...', type: 'textarea' },
    { key: 'bottlenecks', label: 'Bottlenecks: What common delays occur in onboarding?', placeholder: 'The clients are not ready. Internal delays on their side.', type: 'textarea' },
    { key: 'expeditedOptions', label: 'Expedited Options: Do you have "fast-track" pathways?', placeholder: 'We can circumvent project questionnaires and dive into the project...', type: 'textarea' }
  ],
  measurements: [
    { key: 'coreMetrics', label: 'Core Metrics: Which 1–3 KPIs are most important for your clients?', placeholder: 'It depends on the project type...', type: 'textarea' },
    { key: 'reportingCadence', label: 'Reporting Cadence: How often do clients expect updates?', placeholder: 'Varies by project type', type: 'textarea' },
    { key: 'attributionModel', label: 'Attribution Model: How do they attribute success to your solution?', placeholder: '?', type: 'textarea' },
    { key: 'leadingVsLaggingIndicators', label: 'Leading vs. Lagging Indicators: What leading indicators do they watch?', placeholder: 'CRE & DFW - Real estate vacancy rates...', type: 'textarea' },
    { key: 'industryBenchmarks', label: 'Industry Benchmarks: Are there standard performance benchmarks?', placeholder: '???', type: 'textarea' }
  ],
  kpisCurrentResults: [
    { key: 'currentBaseline', label: 'Current Baseline: What are their existing KPIs and where are they now?', placeholder: 'We target 200 warm leads per month with 70% conversion...', type: 'textarea' },
    { key: 'historicalTrends', label: 'Historical Trends: How have these KPIs changed in the last 6–12 months?', placeholder: 'Slightly below', type: 'textarea' },
    { key: 'targetsGoals', label: 'Targets & Goals: What are their short-term and long-term targets?', placeholder: 'Target 50% increase and warm leads and appointments', type: 'textarea' },
    { key: 'conversionBreakdowns', label: 'Conversion Breakdowns: Which funnel stages are strongest and weakest?', placeholder: 'DFW and Economic Incentive campaigns perform the worst.', type: 'textarea' },
    { key: 'gapAnalysis', label: 'Gap Analysis: What prevents them from hitting current KPIs?', placeholder: 'DFW is very competitive and our value proposition is relatively weak.', type: 'textarea' }
  ],
  techStack: [
    { key: 'corePlatforms', label: 'Core Platforms: Which CRM, marketing automation tools do you use?', placeholder: 'Already provided.', type: 'textarea' },
    { key: 'supportTools', label: 'Support Tools: Do you use LinkedIn automation, cold email tools?', placeholder: 'Already provided', type: 'textarea' },
    { key: 'integrationStatus', label: 'Integration Status: How well are these tools integrated?', placeholder: 'Enter integration status...', type: 'textarea' },
    { key: 'analyticsDashboards', label: 'Analytics & Dashboards: How do you aggregate metrics?', placeholder: 'Enter analytics setup...', type: 'textarea' },
    { key: 'openaiUsage', label: 'OpenAI Usage: Have you experimented with AI-driven content?', placeholder: 'Enter AI usage details...', type: 'textarea' }
  ],
  teamMembers: [
    { key: 'orgChart', label: 'Org Chart: Who\'s responsible for marketing, sales, ops, and analytics?', placeholder: 'King White, CEO oversees all of the above...', type: 'textarea' },
    { key: 'keyDecisionMakers', label: 'Key Decision-Makers: Which team members have final say?', placeholder: 'King has final say on budget and strategy...', type: 'textarea' },
    { key: 'skillGaps', label: 'Skill Gaps: Where might they lack expertise?', placeholder: 'Patrick is technically savvy when it comes to CRM\'s...', type: 'textarea' },
    { key: 'trainingNeeds', label: 'Training Needs: Who needs ongoing training after implementation?', placeholder: 'Patrick will lead post-implementation functions too...', type: 'textarea' },
    { key: 'handoffPlan', label: 'Handoff Plan: How do they prefer knowledge transfer?', placeholder: 'All of the above work but live trainings would likely go the farthest...', type: 'textarea' }
  ],
  outboundGTM: [
    { key: 'bestCaseStudies', label: 'Best Case Studies: Company names and their stories', placeholder: 'Enter case study details...', type: 'textarea' },
    { key: 'currentOffer', label: 'Current Offer: What do customers get in exchange for their money?', placeholder: 'We provide companies with services that allow them...', type: 'textarea' },
    { key: 'clientAcquisitionSales', label: 'Client Acquisition & Sales: How are you getting new clients?', placeholder: 'We currently have a call center in the Dominican Republic...', type: 'textarea' },
    { key: 'idealCustomerProfile', label: 'Ideal Customer Profile: Describe your ideal customer', placeholder: 'See Spreadsheet, varies based on industry.', type: 'textarea' },
    { key: 'leadMagnet', label: 'Lead Magnet: What could your company offer for free?', placeholder: 'Enter lead magnet ideas...', type: 'textarea' },
    { key: 'prospectingSignals', label: 'Prospecting Signals: What company signals indicate need?', placeholder: 'Enter prospecting signals...', type: 'textarea' },
    { key: 'copywriting', label: 'Copywriting: Research and email writing approach', placeholder: 'Typically, we are researching their linkedin, company website...', type: 'textarea' }
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

  const handleFieldChange = (key: string, value: string) => {
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
