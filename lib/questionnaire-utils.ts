import { QuestionnaireData } from '@/types';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side utility to load and transform questionnaire data from database
 * This is used by admin endpoints to regenerate workspaces
 */
export async function loadQuestionnaireDataForUser(userId: string): Promise<QuestionnaireData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Fetch questionnaire responses
  const { data, error } = await supabaseAdmin
    .from('questionnaire_responses')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    throw new Error(`Failed to load questionnaire data: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    throw new Error('No questionnaire data found for this user');
  }
  
  // Transform flat data back to nested structure
  // Use 'any' type to allow legacy properties for backward compatibility
  const questionnaireData: any = {
    companyInfo: {
      companyName: '',
      companyDomain: ''
    },
    whatYouDo: {
      industry: '',
      whatYouDo: ''
    },
    howYouDoIt: {
      howYouDoIt: '',
      uniqueValue: ''
    },
    whatYouDeliver: {
      mainService: '',
      whatYouDeliver: '',
      topUseCases: ''
    },
    creatingDesire: {
      barriers: '',
      whyMoveAway: ''
    },
    yourBuyers: {
      seniorityLevel: [] as string[],
      jobTitles: '',
      companySize: '',
      geographicMarkets: '',
      preferredEngagement: '',
      decisionMakerResponsibilities: '',
      prospectChallenges: '',
      unqualifiedPersons: ''
    },
    socialProof: {
      proofPoints: '',
      clientReferences: [{
        companyName: '',
        companyDomain: '',
        industry: '',
        successStory: ''
      }]
    },
    positioning: {
      competitors: []
    },
    leadMagnets: {
      leadMagnet: ''
    },
    brandExamples: {
      emailExample1: '',
      emailExample2: '',
      emailExample3: '',
      brandDocuments: '',
      additionalFiles: ''
    },
    // Legacy mappings for backward compatibility
    basicInfo: {},
    icp: {},
    callToAction: {},
    brand: {}
  };

  // Transform flat rows to nested structure
  data.forEach((row: any) => {
    const section = row.section as keyof typeof questionnaireData;
    if (questionnaireData[section]) {
      // Handle array/object fields
      if ((row.field_key === 'seniorityLevel' || row.field_key === 'clientReferences' || row.field_key === 'competitors') && typeof row.field_value === 'string') {
        try {
          const parsed = JSON.parse(row.field_value);
          (questionnaireData[section] as any)[row.field_key] = parsed;
        } catch (e) {
          // Fallback parsing for text content
          if (row.field_key === 'seniorityLevel') {
            (questionnaireData[section] as any)[row.field_key] = row.field_value ? [row.field_value] : [];
          } else if (row.field_key === 'clientReferences') {
            if (row.field_value && typeof row.field_value === 'string' && row.field_value.includes('\n')) {
              const refs = row.field_value.split('\n')
                .filter((line: string) => line.trim().length > 0)
                .map((line: string) => {
                  const cleanLine = line.replace(/^[•\-\*]\s+/, '');
                  const parts = cleanLine.split(/\s+[—–-]\s+/);
                  const name = parts[0]?.trim() || 'Client Reference';
                  const story = parts[1]?.trim() || '';
                  const domainMatch = cleanLine.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/);
                  const domain = domainMatch ? domainMatch[0] : 'example.com';
                  const industry = name.toLowerCase().includes('association') ? 'Non-Profit/Association' :
                                 name.toLowerCase().includes('healthcare') ? 'Healthcare' :
                                 name.toLowerCase().includes('tech') ? 'Technology' :
                                 'General Business';
                  return {
                    companyName: name,
                    companyDomain: domain,
                    industry: industry,
                    successStory: story || cleanLine
                  };
                });
              (questionnaireData[section] as any)[row.field_key] = refs.length > 0 ? refs : [{
                companyName: 'Example Client',
                companyDomain: 'example.com',
                industry: 'General Business',
                successStory: row.field_value
              }];
            } else {
              (questionnaireData[section] as any)[row.field_key] = [{
                companyName: 'Client Reference',
                companyDomain: 'example.com',
                industry: 'General Business',
                successStory: row.field_value
              }];
            }
          } else if (row.field_key === 'competitors') {
            if (row.field_value && typeof row.field_value === 'string' && (row.field_value.includes('\n') || row.field_value.includes('http'))) {
              const comps = row.field_value.split('\n')
                .filter((line: string) => line.trim().length > 0)
                .map((line: string) => {
                  const cleanLine = line.replace(/^[•\-\*]\s+/, '');
                  const urlMatch = cleanLine.match(/(https?:\/\/[^\s]+)|(www\.[^\s]+)/);
                  const url = urlMatch ? urlMatch[0] : '';
                  let name = cleanLine;
                  if (url) {
                    name = cleanLine.replace(url, '').replace(/\s+[—–-]\s*$/, '').trim();
                  } else {
                    const parts = cleanLine.split(/\s+[—–-]\s+/);
                    name = parts[0]?.trim();
                  }
                  return {
                    companyName: name || 'Competitor',
                    companyWebsite: url || 'https://example.com'
                  };
                });
              (questionnaireData[section] as any)[row.field_key] = comps;
            } else {
              (questionnaireData[section] as any)[row.field_key] = [];
            }
          }
        }
      } else {
        (questionnaireData[section] as any)[row.field_key] = row.field_value;
      }
    }
  });

  // Migrate old structure to new structure for backward compatibility
  if (questionnaireData.basicInfo) {
    if (questionnaireData.basicInfo.industry) questionnaireData.whatYouDo.industry = questionnaireData.basicInfo.industry;
    if (questionnaireData.basicInfo.whatYouDo) questionnaireData.whatYouDo.whatYouDo = questionnaireData.basicInfo.whatYouDo;
    if (questionnaireData.basicInfo.howYouDoIt) questionnaireData.howYouDoIt.howYouDoIt = questionnaireData.basicInfo.howYouDoIt;
    if (questionnaireData.basicInfo.uniqueValue) questionnaireData.howYouDoIt.uniqueValue = questionnaireData.basicInfo.uniqueValue;
    if (questionnaireData.basicInfo.mainService) questionnaireData.whatYouDeliver.mainService = questionnaireData.basicInfo.mainService;
    if (questionnaireData.basicInfo.whatYouDeliver) questionnaireData.whatYouDeliver.whatYouDeliver = questionnaireData.basicInfo.whatYouDeliver;
    if (questionnaireData.basicInfo.topUseCases) questionnaireData.whatYouDeliver.topUseCases = questionnaireData.basicInfo.topUseCases;
  }

  // Validate required fields
  if (!questionnaireData.companyInfo?.companyName || !questionnaireData.companyInfo?.companyDomain) {
    throw new Error('Missing required questionnaire data: companyName and companyDomain are required');
  }

  // Return as QuestionnaireData (legacy properties are only used internally for migration)
  return questionnaireData as QuestionnaireData;
}
