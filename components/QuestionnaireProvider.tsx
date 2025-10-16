'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { QuestionnaireData } from '@/types';

interface QuestionnaireContextType {
  questionnaireData: QuestionnaireData;
  updateQuestionnaireData: (data: Partial<QuestionnaireData>) => void;
  resetQuestionnaireData: () => void;
}

const QuestionnaireContext = createContext<QuestionnaireContextType | undefined>(undefined);

const initialData: QuestionnaireData = {
  companyInfo: {
    companyName: '',
    companyDomain: ''
  },
  serviceInfo: {
    industry: '',
    keyResponsibilities: '',
    competitiveEdge: '',
    commonProblems: '',
    serviceDescription: ''
  },
  basicInfo: {
    industry: '',
    whatYouDo: '',
    howYouDoIt: '',
    uniqueValue: '',
    mainService: '',
    whatYouDeliver: '',
    topUseCases: '',
    barriers: '',
    whyMoveAway: ''
  },
  icp: {
    seniorityLevel: [],
    jobTitles: '',
    companySize: '',
    geographicMarkets: '',
    preferredEngagement: '',
    decisionMakerResponsibilities: '',
    prospectChallenges: ''
  },
  socialProof: {
    proofPoints: '',
    clientReferences: '',
    competitors: ''
  },
  callToAction: {
    leadMagnet: '',
    emailExample1: '',
    emailExample2: '',
    emailExample3: ''
  },
  brand: {
    brandDocuments: '',
    additionalFiles: ''
  }
};

export function QuestionnaireProvider({ children }: { children: ReactNode }) {
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>(initialData);

  const updateQuestionnaireData = (data: Partial<QuestionnaireData>) => {
    setQuestionnaireData(prev => ({ ...prev, ...data }));
  };

  const resetQuestionnaireData = () => {
    setQuestionnaireData(initialData);
  };

  return (
    <QuestionnaireContext.Provider value={{
      questionnaireData,
      updateQuestionnaireData,
      resetQuestionnaireData
    }}>
      {children}
    </QuestionnaireContext.Provider>
  );
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);
  if (context === undefined) {
    throw new Error('useQuestionnaire must be used within a QuestionnaireProvider');
  }
  return context;
}
