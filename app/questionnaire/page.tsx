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
  console.log('📋 QuestionnairePage: Component mounting...');
  
  const { questionnaireData, updateQuestionnaireData, isSaving, saveCurrentData } = useQuestionnaire();
  const [currentSection, setCurrentSection] = useState(0);
  const router = useRouter();

  console.log('📋 QuestionnairePage: Current questionnaire data:', questionnaireData);
  console.log('📋 QuestionnairePage: Current section:', currentSection);

  const sections = [
    { id: 'companyInfo', title: 'Company Information', description: 'Tell us about your company' },
    { id: 'basicInfo', title: 'Basic Information', description: 'Core business details and positioning' },
    { id: 'icp', title: 'ICP (Ideal Customer Profile)', description: 'Define your ideal customer profile' },
    { id: 'socialProof', title: 'Social Proof', description: 'Proof points and client references' },
    { id: 'callToAction', title: 'Call to Action', description: 'Lead magnets and email examples' },
    { id: 'brand', title: 'Your Brand', description: 'Brand documents and additional materials' }
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
    console.log('📋 QuestionnairePage: handleDataChange called with:', sectionData);
    console.log('📋 QuestionnairePage: Current section ID:', sections[currentSection].id);
    updateQuestionnaireData({
      [sections[currentSection].id]: sectionData
    });
  };

  const handleLogout = () => {
    console.log('🚪 Logout button clicked - clearing session');
    
    // Clear Supabase auth from localStorage
    localStorage.removeItem('supabase.auth.token');
    
    // Clear all Supabase keys just in case
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('🚪 Session cleared, redirecting...');
    window.location.href = '/';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header with Logout Button */}
          <div className="relative text-center mb-8">
            <button
              onClick={handleLogout}
              className="absolute right-0 top-0 text-fo-text-secondary hover:text-fo-primary transition-colors duration-200 text-sm font-medium"
            >
              Log Out
            </button>
            <h1 className="text-3xl font-bold text-fo-primary mb-2">
              Claire&apos;s 25 Questions
            </h1>
            <p className="text-fo-text-secondary font-light mb-2">
              Tactical systems to drive reliable profits and turn chaos into clarity.
            </p>
            <p className="text-fo-text-secondary text-sm">
              Section {currentSection + 1} of {sections.length}: {sections[currentSection].title}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
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

          {/* Form */}
          <div className="bg-white rounded-lg shadow-fo-shadow p-8">
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
