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
    { id: 'icp', title: 'ICP (Ideal Customer Profile)', description: 'Define your ideal customer profile' },
    { id: 'icpSegments', title: 'ICP Segments', description: 'Break down your customer segments' },
    { id: 'reasonsToBuy', title: 'Reasons to Buy', description: 'Understand what drives purchases' },
    { id: 'dreamOutcome', title: 'Dream Outcome', description: 'Define the ideal client result' },
    { id: 'problemsBarriers', title: 'Problems & Barriers', description: 'Identify common obstacles' },
    { id: 'solutions', title: 'Your Solutions', description: 'Describe your solution approach' },
    { id: 'timeDelay', title: 'Time Delay', description: 'Timeline and deployment expectations' },
    { id: 'measurements', title: 'Measurements', description: 'How clients measure success' },
    { id: 'kpisCurrentResults', title: 'KPIs & Current Results', description: 'Current performance metrics' },
    { id: 'techStack', title: 'Existing Tech Stack', description: 'Current technology infrastructure' },
    { id: 'teamMembers', title: 'Team Members', description: 'Organizational structure and roles' },
    { id: 'outboundGTM', title: 'Outbound GTM Readiness', description: 'Go-to-market readiness assessment' }
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
              className="bg-fo-gradient h-2 rounded-full transition-all duration-300"
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
