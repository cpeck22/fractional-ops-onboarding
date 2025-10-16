'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import QuestionnaireForm from '@/components/QuestionnaireForm';
import { QuestionnaireData } from '@/types';

export default function QuestionnairePage() {
  const { questionnaireData, updateQuestionnaireData } = useQuestionnaire();
  const [currentSection, setCurrentSection] = useState(0);
  const router = useRouter();

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
    updateQuestionnaireData({
      [sections[currentSection].id]: sectionData
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fo-primary mb-2">
            Allbound GTM Campaign – Quick Launch Questionnaire
          </h1>
          <p className="text-fo-secondary">
            Section {currentSection + 1} of {sections.length}: {sections[currentSection].title}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-fo-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-fo-secondary mt-2">
            <span>Progress</span>
            <span>{Math.round(((currentSection + 1) / sections.length) * 100)}%</span>
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
      </div>
    </div>
  );
}
