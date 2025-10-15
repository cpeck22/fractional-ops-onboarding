'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import toast from 'react-hot-toast';

const sectionTitles = [
  { id: 'companyInfo', title: 'Company Information', fields: [
    { key: 'companyName', label: 'Company Name' },
    { key: 'companyDomain', label: 'Company Domain' }
  ]},
  { id: 'icp', title: 'ICP (Ideal Customer Profile)', fields: [
    { key: 'roleTitle', label: 'Role & Title' },
    { key: 'companyStage', label: 'Company Stage' },
    { key: 'keyResponsibilities', label: 'Key Responsibilities' },
    { key: 'locationIndustry', label: 'Location & Industry' },
    { key: 'relationshipDynamics', label: 'Relationship Dynamics' }
  ]},
  { id: 'icpSegments', title: 'ICP Segments', fields: [
    { key: 'microSegments', label: 'Micro-Segments' },
    { key: 'highestLTGP', label: 'Highest Lifetime Gross Profit' },
    { key: 'fastestToClose', label: 'Fastest to Close' },
    { key: 'specialRequirements', label: 'Special Requirements' },
    { key: 'tailoredMessaging', label: 'Tailored Messaging' }
  ]},
  { id: 'reasonsToBuy', title: 'Reasons to Buy', fields: [
    { key: 'pastWins', label: 'Past Wins' },
    { key: 'compellingEvents', label: 'Compelling Events' },
    { key: 'emotionalDrivers', label: 'Emotional Drivers' },
    { key: 'competitiveEdge', label: 'Competitive Edge' },
    { key: 'proofOutcomes', label: 'Proof & Outcomes' }
  ]},
  { id: 'dreamOutcome', title: 'Dream Outcome', fields: [
    { key: 'idealResult', label: 'Ideal Result' },
    { key: 'longTermValue', label: 'Long-Term Value' },
    { key: 'strategicAdvantage', label: 'Strategic Advantage' },
    { key: 'scalability', label: 'Scalability' },
    { key: 'visionAlignment', label: 'Vision Alignment' }
  ]},
  { id: 'problemsBarriers', title: 'Problems & Barriers', fields: [
    { key: 'commonObjections', label: 'Common Objections' },
    { key: 'internalRoadblocks', label: 'Internal Roadblocks' },
    { key: 'misconceptions', label: 'Misconceptions' },
    { key: 'technicalGaps', label: 'Technical Gaps' },
    { key: 'riskFactors', label: 'Risk Factors' }
  ]},
  { id: 'solutions', title: 'Your Solutions', fields: [
    { key: 'keyDifferentiators', label: 'Key Differentiators' },
    { key: 'technicalIntegration', label: 'Technical Integration' },
    { key: 'implementationSupport', label: 'Implementation Support' },
    { key: 'roiProofPoints', label: 'ROI Proof Points' },
    { key: 'futureProofing', label: 'Future-Proofing' }
  ]},
  { id: 'timeDelay', title: 'Time Delay', fields: [
    { key: 'averageDeploymentTimeline', label: 'Average Deployment Timeline' },
    { key: 'initialWins', label: 'Initial Wins' },
    { key: 'longTermResults', label: 'Long-Term Results' },
    { key: 'bottlenecks', label: 'Bottlenecks' },
    { key: 'expeditedOptions', label: 'Expedited Options' }
  ]},
  { id: 'measurements', title: 'Measurements', fields: [
    { key: 'coreMetrics', label: 'Core Metrics' },
    { key: 'reportingCadence', label: 'Reporting Cadence' },
    { key: 'attributionModel', label: 'Attribution Model' },
    { key: 'leadingVsLaggingIndicators', label: 'Leading vs. Lagging Indicators' },
    { key: 'industryBenchmarks', label: 'Industry Benchmarks' }
  ]},
  { id: 'kpisCurrentResults', title: 'KPIs & Current Results', fields: [
    { key: 'currentBaseline', label: 'Current Baseline' },
    { key: 'historicalTrends', label: 'Historical Trends' },
    { key: 'targetsGoals', label: 'Targets & Goals' },
    { key: 'conversionBreakdowns', label: 'Conversion Breakdowns' },
    { key: 'gapAnalysis', label: 'Gap Analysis' }
  ]},
  { id: 'techStack', title: 'Existing Tech Stack', fields: [
    { key: 'corePlatforms', label: 'Core Platforms' },
    { key: 'supportTools', label: 'Support Tools' },
    { key: 'integrationStatus', label: 'Integration Status' },
    { key: 'analyticsDashboards', label: 'Analytics & Dashboards' },
    { key: 'openaiUsage', label: 'OpenAI Usage' }
  ]},
  { id: 'teamMembers', title: 'Team Members', fields: [
    { key: 'orgChart', label: 'Org Chart' },
    { key: 'keyDecisionMakers', label: 'Key Decision-Makers' },
    { key: 'skillGaps', label: 'Skill Gaps' },
    { key: 'trainingNeeds', label: 'Training Needs' },
    { key: 'handoffPlan', label: 'Handoff Plan' }
  ]},
  { id: 'outboundGTM', title: 'Outbound GTM Readiness', fields: [
    { key: 'bestCaseStudies', label: 'Best Case Studies' },
    { key: 'currentOffer', label: 'Current Offer' },
    { key: 'clientAcquisitionSales', label: 'Client Acquisition & Sales' },
    { key: 'idealCustomerProfile', label: 'Ideal Customer Profile' },
    { key: 'leadMagnet', label: 'Lead Magnet' },
    { key: 'prospectingSignals', label: 'Prospecting Signals' },
    { key: 'copywriting', label: 'Copywriting' }
  ]}
];

export default function ReviewPage() {
  const { questionnaireData } = useQuestionnaire();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting questionnaire data to server...');
      
      const response = await fetch('/api/octave/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionnaireData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Onboarding completed successfully!');
        router.push('/thank-you');
      } else {
        toast.error(result.error || 'Failed to submit onboarding data. Please try again.');
        console.error('API Error:', result);
      }
    } catch (error) {
      toast.error('Failed to submit onboarding data. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    router.push('/questionnaire');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fo-primary mb-2">
            Review Your Onboarding Information
          </h1>
          <p className="text-fo-secondary">
            Please review all your answers before submitting to create your Octave workspace.
          </p>
        </div>

        {/* Review Content */}
        <div className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <div className="space-y-8">
            {sectionTitles.map((section, index) => {
              const sectionData = questionnaireData[section.id as keyof typeof questionnaireData] as any;
              
              return (
                <div key={section.id}>
                  <h3 className="text-xl font-semibold text-fo-primary mb-4">
                    {index + 1}. {section.title}
                  </h3>
                  <div className="space-y-3 text-sm">
                    {section.fields.map((field) => (
                      <div key={field.key}>
                        <span className="font-medium text-fo-secondary">{field.label}:</span>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                          {sectionData?.[field.key] || 'Not provided'}
                        </p>
                      </div>
                    ))}
                  </div>
                  {index < sectionTitles.length - 1 && (
                    <div className="border-t border-gray-200 mt-6"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleEdit}
            className="px-6 py-2 border border-gray-300 rounded-md text-fo-secondary hover:bg-gray-50"
          >
            Edit Responses
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-2 bg-gradient-to-r from-fo-primary to-fo-accent text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Workspace...
              </div>
            ) : (
              'Submit & Create Workspace'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}