export interface QuestionnaireData {
  // Company Information (Required)
  companyInfo: {
    companyName: string;
    companyDomain: string;
  };

  // Service Information (Required for Octave API)
  serviceInfo: {
    industry: string;
    keyResponsibilities: string;
    competitiveEdge: string;
    commonProblems: string;
    serviceDescription: string;
  };

  // Section 1: ICP (Ideal Customer Profile)
  icp: {
    roleTitle: string;
    companyStage: string;
    keyResponsibilities: string;
    locationIndustry: string;
    relationshipDynamics: string;
  };

  // Section 2: ICP Segments
  icpSegments: {
    microSegments: string;
    highestLTGP: string;
    fastestToClose: string;
    specialRequirements: string;
    tailoredMessaging: string;
  };

  // Section 3: ICP Reasons to Buy (RTB)
  reasonsToBuy: {
    pastWins: string;
    compellingEvents: string;
    emotionalDrivers: string;
    competitiveEdge: string;
    proofOutcomes: string;
  };

  // Section 4: ICP Dream Outcome
  dreamOutcome: {
    idealResult: string;
    longTermValue: string;
    strategicAdvantage: string;
    scalability: string;
    visionAlignment: string;
  };

  // Section 5: Problems/Barriers
  problemsBarriers: {
    commonObjections: string;
    internalRoadblocks: string;
    misconceptions: string;
    technicalGaps: string;
    riskFactors: string;
  };

  // Section 6: Your Solutions
  solutions: {
    keyDifferentiators: string;
    technicalIntegration: string;
    implementationSupport: string;
    roiProofPoints: string;
    futureProofing: string;
  };

  // Section 7: Time Delay
  timeDelay: {
    averageDeploymentTimeline: string;
    initialWins: string;
    longTermResults: string;
    bottlenecks: string;
    expeditedOptions: string;
  };

  // Section 8: Measurements
  measurements: {
    coreMetrics: string;
    reportingCadence: string;
    attributionModel: string;
    leadingVsLaggingIndicators: string;
    industryBenchmarks: string;
  };

  // Section 9: KPIs and Current Results
  kpisCurrentResults: {
    currentBaseline: string;
    historicalTrends: string;
    targetsGoals: string;
    conversionBreakdowns: string;
    gapAnalysis: string;
  };

  // Section 10: Existing Tech Stack
  techStack: {
    corePlatforms: string;
    supportTools: string;
    integrationStatus: string;
    analyticsDashboards: string;
    openaiUsage: string;
  };

  // Section 11: Existing Team Members
  teamMembers: {
    orgChart: string;
    keyDecisionMakers: string;
    skillGaps: string;
    trainingNeeds: string;
    handoffPlan: string;
  };

  // Section 12: Outbound GTM Readiness Due Diligence
  outboundGTM: {
    bestCaseStudies: string;
    currentOffer: string;
    clientAcquisitionSales: string;
    idealCustomerProfile: string;
    leadMagnet: string;
    prospectingSignals: string;
    copywriting: string;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface OctaveWorkspaceRequest {
  workspace: {
    name: string;
    url: string;
    addExistingUsers: boolean;
    agentOIds: string[];
  };
  offering: {
    type: string;
    name: string;
    differentiatedValue: string;
    statusQuo: string;
  };
  runtimeContext: string;
  brandVoiceOId: string;
  createDefaultAgents: boolean;
}
