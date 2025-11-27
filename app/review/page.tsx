'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import ClaireImage from '../Claire_v2.png';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

const sectionTitles = [
  { id: 'companyInfo', title: 'Step 1: Who We Are', fields: [
    { key: 'companyName', label: 'Company Name' },
    { key: 'companyDomain', label: 'Company Domain' }
  ]},
  { id: 'whatYouDo', title: 'Step 2: What We Do', fields: [
    { key: 'industry', label: 'What industry do we operate in?' },
    { key: 'whatYouDo', label: 'Describe what we do. Explain it to me like I\'m 10 years old' }
  ]},
  { id: 'howYouDoIt', title: 'Step 3: How We Do It', fields: [
    { key: 'howYouDoIt', label: 'Describe how we do it. Explain it to me like I\'m 10 years old' },
    { key: 'uniqueValue', label: 'What makes our company unique or different from competitors?' }
  ]},
  { id: 'whatYouDeliver', title: 'Step 4: What We Deliver', fields: [
    { key: 'mainService', label: 'How would we describe our main service or product?' },
    { key: 'whatYouDeliver', label: 'What do we actually deliver?' },
    { key: 'topUseCases', label: 'What are the top 3 use cases of our service or product?' }
  ]},
  { id: 'creatingDesire', title: 'Step 5: Creating Desire', fields: [
    { key: 'barriers', label: 'What are all the reasons someone would not take us up on our offer? What gets in their way?' },
    { key: 'whyMoveAway', label: 'Why should they move away from the status quo?' }
  ]},
  { id: 'yourBuyers', title: 'Step 6: Our Buyers', fields: [
    { key: 'seniorityLevel', label: 'Role Seniority & Titles: Who specifically makes the buying decision?' },
    { key: 'jobTitles', label: 'Specific Job Titles' },
    { key: 'companySize', label: 'Which employee size, revenue range (or funding stage) do we typically work with?' },
    { key: 'geographicMarkets', label: 'What geographic market(s) do we focus on?' },
    { key: 'preferredEngagement', label: 'How do these decision-makers prefer to be initially engaged?' },
    { key: 'decisionMakerResponsibilities', label: 'What are the main responsibilities of the decision-makers we sell to?' },
    { key: 'prospectChallenges', label: 'What are the main challenges or pain our prospects currently face?' }
  ]},
  { id: 'socialProof', title: 'Step 7: Social Proof', fields: [
    { key: 'proofPoints', label: 'Why should they believe us?' },
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
    { key: 'brandDocuments', label: 'Upload any brand documents we have' },
    { key: 'additionalFiles', label: 'We may have other files that didn\'t quite fit into my initial questions' }
  ]}
];

export default function ReviewPage() {
  const { questionnaireData } = useQuestionnaire();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const router = useRouter();

  // Get user email and ID on mount
  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setUserId(user.id);
        console.log('👤 User email:', user.email);
        console.log('👤 User ID:', user.id);
      }
    };
    getUserInfo();
  }, []);

  const handleSubmit = async () => {
    setShowModal(true);
    setIsSubmitting(true);
    
    try {
      console.log('🚀 Starting Two-Phase Workspace Creation...');
      console.log('User email:', userEmail);
      console.log('User ID:', userId);
      
      // ============================================
      // PHASE 1: Core Workspace Creation
      // ============================================
      console.log('⚙️ Phase 1: Creating core workspace (workspace, offering, personas, use cases)...');
      const phase1Response = await fetch('/api/octave/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          userId: userId,
          questionnaireData
        }),
      });

      const phase1Result = await phase1Response.json();

      if (!phase1Response.ok || !phase1Result.success) {
        console.error('❌ Phase 1 failed:', phase1Result.error);
        throw new Error(phase1Result.error || 'Phase 1 failed');
      }

      console.log('✅ Phase 1 complete!');
      console.log('   Workspace OId:', phase1Result.workspaceOId);
      console.log('   Product OId:', phase1Result.productOId);
      console.log('   Personas:', phase1Result.personas?.length || 0);
      console.log('   Use Cases:', phase1Result.useCases?.length || 0);

      // ============================================
      // PHASE 2: References, Segments, Playbooks
      // ============================================
      console.log('⚙️ Phase 2: Creating references, segments, and playbooks...');
      
      try {
        const phase2Response = await fetch('/api/octave/workspace-extras', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            workspaceOId: phase1Result.workspaceOId,
            workspaceApiKey: phase1Result.workspaceApiKey,
            productOId: phase1Result.productOId,
            personas: phase1Result.personas,
            useCases: phase1Result.useCases,
            clientReferences: phase1Result.clientReferences,
            competitors: questionnaireData.positioning?.competitors || []
          }),
        });

        const phase2Result = await phase2Response.json();

        if (phase2Response.ok && phase2Result.success) {
          console.log('✅ Phase 2 complete!');
          console.log('   References created:', phase2Result.referencesCreated || 0);
          console.log('   Segments created:', phase2Result.segmentsCreated || 0);
          console.log('   Competitors created:', phase2Result.competitorsCreated || 0);
          console.log('   Playbooks created:', phase2Result.playbooksCreated || 0);
        } else {
          console.warn('⚠️ Phase 2 failed (non-critical):', phase2Result.error);
          // Don't fail the whole flow if Phase 2 fails - it's nice-to-have
        }
      } catch (phase2Error) {
        console.warn('⚠️ Phase 2 error (non-critical):', phase2Error);
        // Don't fail the whole flow if Phase 2 fails
      }

      console.log('🎉 ===== ALL PHASES COMPLETE =====');
      setShowModal(false); // Close the modal
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
            userId: userId,
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
    } catch (error) {
      // Show persistent error modal
      setShowModal(false); // Close processing modal
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred during submission.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true); // Show error modal
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
            Review Our Ops Transformation System™
          </h1>
          <p className="text-fo-text-secondary text-sm">
            Please review all our answers before submitting to create our Octave workspace.
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
                      let isFileField = false;
                      let isClientReferences = false;
                      let isCompetitors = false;
                      
                      // Check if this is a file upload field (brandDocuments or additionalFiles)
                      if (field.key === 'brandDocuments' || field.key === 'additionalFiles') {
                        isFileField = true;
                      }
                      
                      // Check if this is the client references field
                      if (field.key === 'clientReferences') {
                        isClientReferences = true;
                      }
                      
                      // Check if this is the competitors field
                      if (field.key === 'competitors') {
                        isCompetitors = true;
                      }
                      
                      if (value) {
                        if ((isClientReferences || isCompetitors) && Array.isArray(value)) {
                          // Don't compute displayValue for client references or competitors, we'll render them specially
                        } else if (Array.isArray(value)) {
                          displayValue = value.join(', ');
                        } else if (isFileField && typeof value === 'string' && value.includes('http')) {
                          // Extract filenames from URLs for file fields
                          const urls = value.split(', ').filter(url => url.trim());
                          const fileNames = urls.map(url => {
                            try {
                              // Extract filename from URL path (after the last slash and before query params)
                              const urlPath = url.split('?')[0]; // Remove query parameters
                              const pathParts = urlPath.split('/');
                              const fileNameWithTimestamp = pathParts[pathParts.length - 1];
                              // Remove timestamp prefix (e.g., "1761611965696_" from the filename)
                              const fileName = fileNameWithTimestamp.replace(/^\d+_/, '');
                              return decodeURIComponent(fileName);
                            } catch (e) {
                              return url; // Fallback to full URL if parsing fails
                            }
                          });
                          displayValue = fileNames.join('\n');
                        } else {
                          displayValue = value;
                        }
                      }
                      
                      return (
                        <div key={field.key}>
                          <span className="font-semibold text-fo-text">{field.label}:</span>
                          {isClientReferences && value && Array.isArray(value) ? (
                            <div className="mt-2 space-y-3">
                              {value.map((ref: any, refIndex: number) => (
                                <div key={refIndex} className="bg-gray-50 p-3 rounded border border-fo-light">
                                  <div className="font-medium text-fo-primary text-xs mb-2">Client Reference #{refIndex + 1}</div>
                                  <div className="space-y-1 text-xs text-gray-900">
                                    <div><span className="font-medium">Company:</span> {ref.companyName || 'Not provided'}</div>
                                    <div><span className="font-medium">Website:</span> {ref.companyDomain || 'Not provided'}</div>
                                    <div><span className="font-medium">Industry:</span> {ref.industry || 'Not provided'}</div>
                                    {ref.successStory && (
                                      <div><span className="font-medium">Success Story:</span> {ref.successStory}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : isCompetitors && value && Array.isArray(value) ? (
                            <div className="mt-2 space-y-3">
                              {value.map((comp: any, compIndex: number) => (
                                <div key={compIndex} className="bg-orange-50 p-3 rounded border border-orange-200">
                                  <div className="font-medium text-orange-700 text-xs mb-2">Competitor #{compIndex + 1}</div>
                                  <div className="space-y-1 text-xs text-gray-900">
                                    <div><span className="font-medium">Company:</span> {comp.companyName || 'Not provided'}</div>
                                    <div><span className="font-medium">Website:</span> {comp.companyWebsite || 'Not provided'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : isFileField && value && typeof value === 'string' && value.includes('http') ? (
                            <div className="text-fo-text-secondary mt-1 font-light">
                              {value.split(', ').filter(url => url.trim()).map((url, idx) => {
                                const urlPath = url.split('?')[0];
                                const pathParts = urlPath.split('/');
                                const fileNameWithTimestamp = pathParts[pathParts.length - 1];
                                const fileName = decodeURIComponent(fileNameWithTimestamp.replace(/^\d+_/, ''));
                                return (
                                  <div key={idx} className="flex items-center gap-2 py-1">
                                    <svg className="w-4 h-4 text-fo-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="break-all">{fileName}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-fo-text-secondary mt-1 whitespace-pre-wrap font-light">
                              {displayValue}
                            </p>
                          )}
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
              "We're Good To Go Claire!"
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
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden p-1">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={ClaireImage}
                    alt="Claire"
                    width={140}
                    height={140}
                    className="object-cover w-full h-full scale-110"
                    style={{ objectPosition: 'center 20%' }}
                    priority
                  />
                </div>
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

      {/* Error Modal - Persistent */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-8 relative">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            
            {/* Message */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Submission Error
              </h2>
              <p className="text-gray-700 text-lg mb-6">
                Please try submitting again, something went wrong.
              </p>
              
              {/* Error Details */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 mb-2">
                  <strong>Error:</strong> {errorMessage}
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-900 mb-3">
                  <strong>✓ Your progress is saved up until now.</strong>
                </p>
                <p className="text-sm text-blue-800">
                  If the issue persists, please contact Fractional Ops at{' '}
                  <a href="mailto:support@fractionalops.com" className="underline font-semibold">
                    support@fractionalops.com
                  </a>
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowErrorModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    handleSubmit();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-fo-primary to-fo-secondary text-white rounded-md hover:opacity-90 font-semibold transition-opacity"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}