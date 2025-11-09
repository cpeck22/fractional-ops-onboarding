export interface ClientReference {
  companyName: string;
  companyDomain: string;
  industry: string;
  successStory?: string; // Optional
}

export interface QuestionnaireData {
  // Step 1: Who You Are (Q1-2)
  companyInfo: {
    companyName: string;
    companyDomain: string;
  };

  // Step 2: What You Do (Q3-4)
  whatYouDo: {
    industry: string;
    whatYouDo: string;
  };

  // Step 3: How You Do It (Q5-6)
  howYouDoIt: {
    howYouDoIt: string;
    uniqueValue: string;
  };

  // Step 4: What You Deliver (Q7-9)
  whatYouDeliver: {
    mainService: string;
    whatYouDeliver: string;
    topUseCases: string;
  };

  // Step 5: Creating Desire (Q10-11)
  creatingDesire: {
    barriers: string;
    whyMoveAway: string;
  };

  // Step 6: Your Buyers (Q12-18)
  yourBuyers: {
    seniorityLevel: string[];
    jobTitles: string;
    companySize: string;
    geographicMarkets: string;
    preferredEngagement: string;
    decisionMakerResponsibilities: string;
    prospectChallenges: string;
  };

  // Step 7: Social Proof (Q19-20)
  socialProof: {
    proofPoints: string;
    clientReferences: ClientReference[];
  };

  // Step 8: Positioning (Q21)
  positioning: {
    competitors: string;
  };

  // Step 9: Carrots & Lead Magnets (Q22)
  leadMagnets: {
    leadMagnet: string;
  };

  // Step 10: Brand & Examples (Q23-27)
  brandExamples: {
    emailExample1: string;
    emailExample2: string;
    emailExample3: string;
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
