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
  { id: 'serviceInfo', title: 'Service Information', fields: [
    { key: 'industry', label: 'Industry' },
    { key: 'keyResponsibilities', label: 'Key Responsibilities' },
    { key: 'competitiveEdge', label: 'Competitive Edge' },
    { key: 'commonProblems', label: 'Common Problems' },
    { key: 'serviceDescription', label: 'Service Description' }
  ]},
  { id: 'basicInfo', title: 'Basic Information', fields: [
    { key: 'industry', label: 'Industry' },
    { key: 'whatYouDo', label: 'What You Do' },
    { key: 'howYouDoIt', label: 'How You Do It' },
    { key: 'uniqueValue', label: 'Unique Value' },
    { key: 'mainService', label: 'Main Service' },
    { key: 'whatYouDeliver', label: 'What You Deliver' },
    { key: 'topUseCases', label: 'Top Use Cases' },
    { key: 'barriers', label: 'Barriers' },
    { key: 'whyMoveAway', label: 'Why Move Away' }
  ]},
  { id: 'icp', title: 'ICP (Ideal Customer Profile)', fields: [
    { key: 'seniorityLevel', label: 'Seniority Level' },
    { key: 'jobTitles', label: 'Job Titles' },
    { key: 'companySize', label: 'Company Size' },
    { key: 'geographicMarkets', label: 'Geographic Markets' },
    { key: 'preferredEngagement', label: 'Preferred Engagement' },
    { key: 'decisionMakerResponsibilities', label: 'Decision Maker Responsibilities' },
    { key: 'prospectChallenges', label: 'Prospect Challenges' }
  ]},
  { id: 'socialProof', title: 'Social Proof', fields: [
    { key: 'proofPoints', label: 'Proof Points' },
    { key: 'clientReferences', label: 'Client References' },
    { key: 'competitors', label: 'Competitors' }
  ]},
  { id: 'callToAction', title: 'Call to Action', fields: [
    { key: 'leadMagnet', label: 'Lead Magnet' },
    { key: 'emailExample1', label: 'Email Example 1' },
    { key: 'emailExample2', label: 'Email Example 2' },
    { key: 'emailExample3', label: 'Email Example 3' }
  ]},
  { id: 'brand', title: 'Your Brand', fields: [
    { key: 'brandDocuments', label: 'Brand Documents' },
    { key: 'additionalFiles', label: 'Additional Files' }
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
                    {section.fields.map((field) => {
                      const value = sectionData?.[field.key];
                      let displayValue = 'Not provided';
                      
                      if (value) {
                        if (Array.isArray(value)) {
                          displayValue = value.join(', ');
                        } else {
                          displayValue = value;
                        }
                      }
                      
                      return (
                        <div key={field.key}>
                          <span className="font-medium text-fo-secondary">{field.label}:</span>
                          <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                            {displayValue}
                          </p>
                        </div>
                      );
                    })}
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