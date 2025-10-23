'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import ClaireImage from '../Claire_v1.png';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

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

export default function ReviewPage() {
  const { questionnaireData } = useQuestionnaire();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
    setShowModal(true);
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
        
        // Download PDF
        console.log('📥 Downloading PDF...');
        try {
          const pdfResponse = await fetch('/api/download-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: userEmail,
              questionnaireData
            }),
          });

          if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `RevOps_Onboarding_${questionnaireData.companyInfo?.companyName || 'Client'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            console.log('✅ PDF downloaded successfully');
            toast.success('PDF downloaded!');
          } else {
            console.error('⚠️ PDF download failed (non-critical)');
            toast.error('PDF download failed, but data was submitted successfully');
          }
        } catch (pdfError) {
          console.error('⚠️ PDF download error (non-critical):', pdfError);
          // Don't fail the whole flow if PDF download fails
        }
        
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

      {/* Claire's Processing Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 relative">
            {/* Claire Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
                <Image
                  src={ClaireImage}
                  alt="Claire"
                  width={128}
                  height={128}
                  className="object-cover scale-110"
                  style={{ objectPosition: 'center 30%' }}
                  priority
                />
              </div>
            </div>
            
            {/* Message */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-blue-600 mb-4">
                Thank You!
              </h2>
              <p className="text-gray-700 text-lg mb-4">
                Thank you for answering all my questions. I&apos;m going to start creating your AI Sales workspaces now.
              </p>
              <p className="text-gray-600 text-base mb-6">
                This may take up to 5 minutes.
              </p>
              
              {/* Loading Animation */}
              <div className="flex justify-center items-center space-x-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}