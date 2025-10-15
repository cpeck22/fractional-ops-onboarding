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
  icp: {
    roleTitle: '',
    companyStage: '',
    keyResponsibilities: '',
    locationIndustry: '',
    relationshipDynamics: ''
  },
  icpSegments: {
    microSegments: '',
    highestLTGP: '',
    fastestToClose: '',
    specialRequirements: '',
    tailoredMessaging: ''
  },
  reasonsToBuy: {
    pastWins: '',
    compellingEvents: '',
    emotionalDrivers: '',
    competitiveEdge: '',
    proofOutcomes: ''
  },
  dreamOutcome: {
    idealResult: '',
    longTermValue: '',
    strategicAdvantage: '',
    scalability: '',
    visionAlignment: ''
  },
  problemsBarriers: {
    commonObjections: '',
    internalRoadblocks: '',
    misconceptions: '',
    technicalGaps: '',
    riskFactors: ''
  },
  solutions: {
    keyDifferentiators: '',
    technicalIntegration: '',
    implementationSupport: '',
    roiProofPoints: '',
    futureProofing: ''
  },
  timeDelay: {
    averageDeploymentTimeline: '',
    initialWins: '',
    longTermResults: '',
    bottlenecks: '',
    expeditedOptions: ''
  },
  measurements: {
    coreMetrics: '',
    reportingCadence: '',
    attributionModel: '',
    leadingVsLaggingIndicators: '',
    industryBenchmarks: ''
  },
  kpisCurrentResults: {
    currentBaseline: '',
    historicalTrends: '',
    targetsGoals: '',
    conversionBreakdowns: '',
    gapAnalysis: ''
  },
  techStack: {
    corePlatforms: '',
    supportTools: '',
    integrationStatus: '',
    analyticsDashboards: '',
    openaiUsage: ''
  },
  teamMembers: {
    orgChart: '',
    keyDecisionMakers: '',
    skillGaps: '',
    trainingNeeds: '',
    handoffPlan: ''
  },
  outboundGTM: {
    bestCaseStudies: '',
    currentOffer: '',
    clientAcquisitionSales: '',
    idealCustomerProfile: '',
    leadMagnet: '',
    prospectingSignals: '',
    copywriting: ''
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
