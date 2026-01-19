'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import QuestionnaireForm from '@/components/QuestionnaireForm';
import ProtectedRoute from '@/components/ProtectedRoute';
import { QuestionnaireData } from '@/types';
import { signOut } from '@/lib/supabase';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function QuestionnairePage() {
  
  const { questionnaireData, updateQuestionnaireData, isSaving, saveCurrentData } = useQuestionnaire();
  const [currentSection, setCurrentSection] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const router = useRouter();


  const sections = [
    { id: 'companyInfo', title: 'Step 1: Who We Are', description: "Let's start with the basics about our company" },
    { id: 'whatYouDo', title: 'Step 2: What We Do', description: 'Tell me about our industry and what we do' },
    { id: 'howYouDoIt', title: 'Step 3: How We Do It', description: 'Explain our process and what makes us unique' },
    { id: 'whatYouDeliver', title: 'Step 4: What We Deliver', description: 'Describe our main offerings and deliverables' },
    { id: 'creatingDesire', title: 'Step 5: Creating Desire', description: 'Help our prospects understand why they need to act now' },
    { id: 'yourBuyers', title: 'Step 6: Our Buyers', description: 'Define who our ideal customers are and how to reach them' },
    { id: 'socialProof', title: 'Step 7: Social Proof', description: 'Show why prospects should trust us' },
    { id: 'positioning', title: 'Step 8: Positioning', description: 'Understand our competitive landscape' },
    { id: 'leadMagnets', title: 'Step 9: Carrots & Lead Magnets', description: 'What can we offer to attract prospects?' },
    { id: 'brandExamples', title: 'Step 10: Brand & Examples', description: 'Share our brand voice and proven email examples' }
  ];

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      // Navigate to review page
      router.push('/review');
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleDataChange = (sectionData: any) => {
    updateQuestionnaireData({
      [sections[currentSection].id]: sectionData
    });
  };

  const handleLogout = () => {
    
    // Clear Supabase auth from localStorage
    localStorage.removeItem('supabase.auth.token');
    
    // Clear all Supabase keys just in case
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    window.location.href = '/';
  };

  const handleStart = () => {
    setShowIntro(false);
  };

  if (showIntro) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-fo-bg-light flex items-center justify-center">
          <div className="max-w-4xl w-full mx-auto px-4 py-8 flex flex-col items-center">
            <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8 w-full">
              {/* Header with Logout Button */}
              <div className="w-full relative text-center mb-8">
                <button
                  onClick={handleLogout}
                  className="absolute right-0 top-0 text-fo-text-secondary hover:text-fo-primary transition-colors duration-200 text-sm font-medium"
                >
                  Log Out
                </button>
              </div>

              <div className="w-full bg-black rounded-lg overflow-hidden shadow-md mb-8 aspect-video">
                <iframe 
                  src="https://drive.google.com/file/d/1mK4Z7Sp8_t9gU3_WCO5QWmORl4dQXekw/preview" 
                  className="w-full h-full" 
                  allow="autoplay"
                  style={{ border: 'none' }}
                />
              </div>

              <div className="flex justify-center w-full">
                <button
                  onClick={handleStart}
                  className="bg-fo-primary hover:bg-fo-primary/90 text-white text-xl font-bold py-4 px-12 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1"
                >
                  Start Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-fo-bg-light">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header with Logout Button */}
          <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 mb-6">
            <div className="relative text-center">
              <button
                onClick={handleLogout}
                className="absolute right-0 top-0 text-fo-text-secondary hover:text-fo-primary transition-colors duration-200 text-sm font-medium"
              >
                Log Out
              </button>
              <h1 className="text-3xl font-bold text-fo-primary mb-2">
                10-Steps to Sales Excellence
              </h1>
              <p className="text-fo-text-secondary text-sm">
                {sections[currentSection].title}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="bg-fo-light rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-fo-primary to-fo-secondary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-fo-text-secondary mt-2 font-medium">
                <span>Estimated Time To Finish: {Math.round((25 * (sections.length - currentSection - 1)) / sections.length)} minutes</span>
                <span>{Math.round(((sections.length - currentSection - 1) / sections.length) * 100)}% Remaining</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8">
            <QuestionnaireForm
              section={sections[currentSection]}
              data={questionnaireData[sections[currentSection].id as keyof QuestionnaireData] || {}}
              onDataChange={handleDataChange}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isFirstSection={currentSection === 0}
              isLastSection={currentSection === sections.length - 1}
            />
          </div>

          {/* Save Button */}
          <div className="mt-6 text-center">
            <button
              onClick={saveCurrentData}
              disabled={isSaving}
              className="bg-fo-primary hover:bg-fo-primary-dark text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Progress'}
            </button>
            <p className="text-sm text-fo-text-secondary mt-2">
              Click &quot;Save Progress&quot; to save your answers
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
