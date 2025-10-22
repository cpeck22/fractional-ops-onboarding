'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

const sectionTitles = [
  { id: 'companyInfo', title: 'Company Information', fields: [
    { key: 'companyName', label: 'Company Name' },
    { key: 'companyDomain', label: 'Company Domain' }
  ]},
  { id: 'basicInfo', title: 'Basic Information', fields: [
    { key: 'industry', label: 'What industry does your company operate in?' },
    { key: 'whatYouDo', label: 'Describe what you do. Explain it to me like I\'m 10 years old' },
    { key: 'howYouDoIt', label: 'Describe how you do it. Explain it to me like I\'m 10 years old' },
    { key: 'uniqueValue', label: 'What makes your company unique or different from competitors?' },
    { key: 'mainService', label: 'How would you describe your main service or product?' },
    { key: 'whatYouDeliver', label: 'What do you actually deliver?' },
    { key: 'topUseCases', label: 'What are the top 3 use cases of your service or product?' },
    { key: 'barriers', label: 'What are all the reasons someone would not take you up on your offer? What gets in their way?' },
    { key: 'whyMoveAway', label: 'Why should they move away from the status quo?' }
  ]},
  { id: 'icp', title: 'ICP (Ideal Customer Profile)', fields: [
    { key: 'seniorityLevel', label: 'Role Seniority & Titles: Who specifically makes the buying decision?' },
    { key: 'jobTitles', label: 'Specific Job Titles' },
    { key: 'companySize', label: 'Which employee size, revenue range (or funding stage) do you typically work with?' },
    { key: 'geographicMarkets', label: 'What geographic market(s) do you focus on?' },
    { key: 'preferredEngagement', label: 'How do these decision-makers prefer to be initially engaged?' },
    { key: 'decisionMakerResponsibilities', label: 'What are the main responsibilities of the decision-makers you sell to?' },
    { key: 'prospectChallenges', label: 'What are the main challenges or pain your prospects currently face?' }
  ]},
  { id: 'socialProof', title: 'Social Proof', fields: [
    { key: 'proofPoints', label: 'Why should they believe you?' },
    { key: 'clientReferences', label: 'Who has gotten these results?' },
    { key: 'competitors', label: 'Who else can solve this for them?' }
  ]},
  { id: 'callToAction', title: 'Call to Action', fields: [
    { key: 'leadMagnet', label: 'What can we offer in exchange for someone interacting with us?' },
    { key: 'emailExample1', label: 'What emails have received positive responses in the past? Example 1' },
    { key: 'emailExample2', label: 'What emails have received positive responses in the past? Example 2' },
    { key: 'emailExample3', label: 'What emails have received positive responses in the past? Example 3' }
  ]},
  { id: 'brand', title: 'Your Brand', fields: [
    { key: 'brandDocuments', label: 'Upload any brand documents you have' },
    { key: 'additionalFiles', label: 'You may have other files that didn\'t quite fit into my initial questions' }
  ]}
];

export default function ReviewPage() {
  const { questionnaireData } = useQuestionnaire();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const router = useRouter();

  // Get user email on mount
  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        console.log('👤 User email:', user.email);
      }
    };
    getUserEmail();
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      console.log('Submitting questionnaire data to server...');
      console.log('User email:', userEmail);
      
      const response = await fetch('/api/octave/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          questionnaireData
        }),
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
            Review Your Ops Transformation System™
          </h1>
          <p className="text-fo-text-secondary font-light mb-2">
            Tactical systems to drive reliable profits and turn chaos into clarity.
          </p>
          <p className="text-fo-text-secondary text-sm">
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
                  <h3 className="text-xl font-bold text-fo-primary mb-4">
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
                          <span className="font-semibold text-fo-text">{field.label}:</span>
                          <p className="text-fo-text-secondary mt-1 whitespace-pre-wrap font-light">
                            {displayValue}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {index < sectionTitles.length - 1 && (
                    <div className="border-t border-fo-light mt-6"></div>
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
            className="px-6 py-2 border border-fo-light rounded-md text-fo-text-secondary hover:bg-fo-light font-medium"
          >
            Edit Responses
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8 py-2 bg-gradient-to-r from-fo-primary to-fo-secondary text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-primary disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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