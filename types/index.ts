export interface QuestionnaireData {
  // Company Information (Required for Octave API)
  companyInfo: {
    companyName: string;
    companyDomain: string;
  };

  // Basic Information (Corey's Section 1)
  basicInfo: {
    industry: string;
    whatYouDo: string;
    howYouDoIt: string;
    uniqueValue: string;
    mainService: string;
    whatYouDeliver: string;
    topUseCases: string;
    barriers: string;
    whyMoveAway: string;
  };

  // ICP (Ideal Customer Profile) (Corey's Section 2)
  icp: {
    seniorityLevel: string[];
    jobTitles: string;
    companySize: string;
    geographicMarkets: string;
    preferredEngagement: string;
    decisionMakerResponsibilities: string;
    prospectChallenges: string;
  };

  // Social Proof (Corey's Section 3)
  socialProof: {
    proofPoints: string;
    clientReferences: string;
    competitors: string;
  };

  // Call to Action (Corey's Section 4)
  callToAction: {
    leadMagnet: string;
    emailExample1: string;
    emailExample2: string;
    emailExample3: string;
  };

  // Brand (Corey's Section 5)
  brand: {
    brandDocuments: string;
    additionalFiles: string;
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
