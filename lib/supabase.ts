import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('🔧 Supabase: URL configured:', supabaseUrl ? 'Yes' : 'No');
console.log('🔧 Supabase: Anon key configured:', supabaseAnonKey ? 'Yes' : 'No');

// Main client for auth and database (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token'
  }
})

// Authentication functions
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/signin`
    }
  })
  
  // Note: We don't create questionnaire entries here because the user
  // isn't fully authenticated yet (needs email verification first).
  // Initial entries will be created on first sign-in after verification.
  
  return { data, error }
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  // Create initial questionnaire entry for verified user (if it doesn't exist)
  if (data?.user && !error) {
    console.log('📝 Checking if user has questionnaire entry:', data.user.id);
    try {
      // Check if user already has any questionnaire data
      const { data: existingData, error: checkError } = await supabase
        .from('questionnaire_responses')
        .select('user_id')
        .eq('user_id', data.user.id)
        .limit(1);
      
      if (checkError) {
        console.error('📝 Error checking existing questionnaire data:', checkError);
      } else if (!existingData || existingData.length === 0) {
        console.log('📝 No existing data found, creating initial questionnaire entry...');
        
        // Create initial empty entries for all sections
        const initialEntries = [
          { user_id: data.user.id, section: 'companyInfo', field_key: 'companyName', field_value: '' },
          { user_id: data.user.id, section: 'companyInfo', field_key: 'companyDomain', field_value: '' }
        ];
        
        const { error: insertError } = await supabase
          .from('questionnaire_responses')
          .insert(initialEntries);
        
        if (insertError) {
          console.error('📝 Failed to create initial questionnaire entries:', insertError);
          console.error('📝 Insert error details:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });
        } else {
          console.log('📝 Initial questionnaire entries created successfully');
        }
      } else {
        console.log('📝 User already has questionnaire data, skipping initialization');
      }
    } catch (err) {
      console.error('📝 Error in questionnaire initialization:', err);
    }
  }
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  return { data, error }
}

// Questionnaire data functions
export const saveQuestionnaireField = async (
  userId: string,
  section: string,
  fieldKey: string,
  fieldValue: any  // Changed from string to any to accept arrays/objects
) => {
  console.log('💾 Calling API route (uses service key on server)');
  
  // Stringify arrays and objects before saving
  let valueToSave = fieldValue;
  if (typeof fieldValue === 'object' && fieldValue !== null) {
    valueToSave = JSON.stringify(fieldValue);
    console.log(`💾 Stringified ${fieldKey} for storage:`, valueToSave);
  }
  
  try {
    const response = await fetch('/api/save-questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        section,
        fieldKey,
        fieldValue: valueToSave
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('💾 API error:', result.error);
      throw new Error(result.error);
    }
    
    console.log('💾 Save SUCCESS via API!');
    return result.data;
  } catch (error) {
    console.error('💾 Save failed:', error);
    throw error;
  }
}

export const loadUserQuestionnaireData = async (userId: string) => {
  console.log('🔍 Calling API route to load data (uses service key on server)');
  
  try {
    const response = await fetch('/api/load-questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('🔍 API error:', result.error);
      throw new Error(result.error);
    }
    
    const data = result.data;
    console.log('🔍 Raw data from database:', data);
    console.log('🔍 Rows loaded:', data?.length || 0);

    // Transform flat data back to nested structure with default values (new 10-step structure)
    const questionnaireData = {
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
        prospectChallenges: ''
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
        competitors: ''
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
      // Legacy mappings for backward compatibility with existing database data
      basicInfo: {} as any,
      icp: {} as any,
      callToAction: {} as any,
      brand: {} as any
    }

    data?.forEach((row: any) => {
      console.log('🔍 Processing row:', row);
      const section = row.section as keyof typeof questionnaireData;
      if (questionnaireData[section]) {
        // Handle array/object fields (like seniorityLevel and clientReferences)
        if ((row.field_key === 'seniorityLevel' || row.field_key === 'clientReferences') && typeof row.field_value === 'string') {
          try {
            const parsed = JSON.parse(row.field_value);
            (questionnaireData[section] as any)[row.field_key] = parsed;
            console.log(`🔍 Parsed ${row.field_key} as JSON:`, parsed);
          } catch (e) {
            console.warn(`⚠️ Failed to parse ${row.field_key}, using fallback`);
            if (row.field_key === 'seniorityLevel') {
              (questionnaireData[section] as any)[row.field_key] = row.field_value ? [row.field_value] : [];
            } else if (row.field_key === 'clientReferences') {
              (questionnaireData[section] as any)[row.field_key] = [{
                companyName: '',
                companyDomain: '',
                industry: '',
                successStory: row.field_value // Put old text in success story
              }];
            }
          }
        } else {
          (questionnaireData[section] as any)[row.field_key] = row.field_value;
        }
      }
    })

    // Migrate old structure to new structure for backward compatibility
    console.log('🔍 Migrating old data structure to new structure...');
    if (questionnaireData.basicInfo) {
      // Step 2: What You Do (industry, whatYouDo)
      if (questionnaireData.basicInfo.industry) questionnaireData.whatYouDo.industry = questionnaireData.basicInfo.industry;
      if (questionnaireData.basicInfo.whatYouDo) questionnaireData.whatYouDo.whatYouDo = questionnaireData.basicInfo.whatYouDo;
      
      // Step 3: How You Do It (howYouDoIt, uniqueValue)
      if (questionnaireData.basicInfo.howYouDoIt) questionnaireData.howYouDoIt.howYouDoIt = questionnaireData.basicInfo.howYouDoIt;
      if (questionnaireData.basicInfo.uniqueValue) questionnaireData.howYouDoIt.uniqueValue = questionnaireData.basicInfo.uniqueValue;
      
      // Step 4: What You Deliver (mainService, whatYouDeliver, topUseCases)
      if (questionnaireData.basicInfo.mainService) questionnaireData.whatYouDeliver.mainService = questionnaireData.basicInfo.mainService;
      if (questionnaireData.basicInfo.whatYouDeliver) questionnaireData.whatYouDeliver.whatYouDeliver = questionnaireData.basicInfo.whatYouDeliver;
      if (questionnaireData.basicInfo.topUseCases) questionnaireData.whatYouDeliver.topUseCases = questionnaireData.basicInfo.topUseCases;
      
      // Step 5: Creating Desire (barriers, whyMoveAway)
      if (questionnaireData.basicInfo.barriers) questionnaireData.creatingDesire.barriers = questionnaireData.basicInfo.barriers;
      if (questionnaireData.basicInfo.whyMoveAway) questionnaireData.creatingDesire.whyMoveAway = questionnaireData.basicInfo.whyMoveAway;
    }
    
    // Step 6: Your Buyers (from icp)
    if (questionnaireData.icp) {
      questionnaireData.yourBuyers = { ...questionnaireData.yourBuyers, ...questionnaireData.icp };
    }
    
    // Step 8: Positioning (competitors from socialProof)
    if (questionnaireData.socialProof && (questionnaireData.socialProof as any).competitors) {
      questionnaireData.positioning.competitors = (questionnaireData.socialProof as any).competitors;
    }
    
    // Step 9: Lead Magnets (from callToAction)
    if (questionnaireData.callToAction) {
      if ((questionnaireData.callToAction as any).leadMagnet) questionnaireData.leadMagnets.leadMagnet = (questionnaireData.callToAction as any).leadMagnet;
      if ((questionnaireData.callToAction as any).emailExample1) questionnaireData.brandExamples.emailExample1 = (questionnaireData.callToAction as any).emailExample1;
      if ((questionnaireData.callToAction as any).emailExample2) questionnaireData.brandExamples.emailExample2 = (questionnaireData.callToAction as any).emailExample2;
      if ((questionnaireData.callToAction as any).emailExample3) questionnaireData.brandExamples.emailExample3 = (questionnaireData.callToAction as any).emailExample3;
    }
    
    // Step 10: Brand & Examples (from brand)
    if (questionnaireData.brand) {
      if ((questionnaireData.brand as any).brandDocuments) questionnaireData.brandExamples.brandDocuments = (questionnaireData.brand as any).brandDocuments;
      if ((questionnaireData.brand as any).additionalFiles) questionnaireData.brandExamples.additionalFiles = (questionnaireData.brand as any).additionalFiles;
    }
    
    // Remove legacy sections
    delete (questionnaireData as any).basicInfo;
    delete (questionnaireData as any).icp;
    delete (questionnaireData as any).callToAction;
    delete (questionnaireData as any).brand;

    console.log('🔍 Final questionnaire data:', questionnaireData);
    return questionnaireData;
  } catch (error) {
    console.error('🔍 Load failed:', error);
    throw error;
  }
}

export const checkEmailExists = async (email: string) => {
  console.log('🔍 Checking if email exists:', email);
  
  try {
    const response = await fetch('/api/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('🔍 API error:', result.error);
      return false; // Default to false on error to allow signup attempt
    }
    
    console.log('🔍 Email exists result:', result.exists);
    return result.exists;
  } catch (error) {
    console.error('🔍 Error checking email:', error);
    return false; // Default to false on error to allow signup attempt
  }
}

// Test function to verify database table exists and is accessible
export const testDatabaseConnection = async () => {
  console.log('🧪 Testing database connection...');
  console.log('🧪 Supabase URL:', supabaseUrl);
  console.log('🧪 Anon key length:', supabaseAnonKey?.length);
  
  try {
    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection test timeout after 5 seconds')), 5000)
    );
    
    // First test: Simple select to see if table exists
    console.log('🧪 Attempting to query questionnaire_responses table...');
    const selectPromise = supabase
      .from('questionnaire_responses')
      .select('*')
      .limit(1);
    
    const { data, error } = await Promise.race([selectPromise, timeoutPromise]) as any;
    
    console.log('🧪 Database test result:', { data, error });
    
    if (error) {
      console.error('🧪 Database test failed:', error);
      console.error('🧪 Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log('🧪 Database test successful - table exists and is accessible');
    return true;
  } catch (error) {
    console.error('🧪 Database test caught error:', error);
    return false;
  }
}

// Test RLS policy specifically
export const testRLSPolicy = async (userId: string) => {
  console.log('🔒 Testing RLS policy for user:', userId);
  try {
    // First, let's check what auth.uid() returns
    console.log('🔒 Checking auth.uid()...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('🔒 Current user from auth.getUser():', user?.id);
    console.log('🔒 User error:', userError);
    
    // Test if we can insert a record
    console.log('🔒 Attempting insert with user_id:', userId);
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .insert({
        user_id: userId,
        section: 'test',
        field_key: 'test',
        field_value: 'test'
      });
    
    console.log('🔒 RLS insert test result:', { data, error });
    
    if (error) {
      console.error('🔒 RLS insert test failed:', error);
      console.error('🔒 RLS error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    // Clean up test record
    await supabase
      .from('questionnaire_responses')
      .delete()
      .eq('user_id', userId)
      .eq('section', 'test');
    
    console.log('🔒 RLS policy test successful');
    return true;
  } catch (error) {
    console.error('🔒 RLS policy test caught error:', error);
    return false;
  }
}

// Test function to bypass RLS temporarily
export const testBypassRLS = async (userId: string) => {
  console.log('🚫 Testing bypass RLS for user:', userId);
  try {
    // Try to insert without any RLS considerations
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .insert({
        user_id: userId,
        section: 'bypass_test',
        field_key: 'test',
        field_value: 'bypass_test'
      });
    
    console.log('🚫 Bypass RLS test result:', { data, error });
    
    if (error) {
      console.error('🚫 Bypass RLS test failed:', error);
      console.error('🚫 Bypass error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    // Clean up test record
    await supabase
      .from('questionnaire_responses')
      .delete()
      .eq('user_id', userId)
      .eq('section', 'bypass_test');
    
    console.log('🚫 Bypass RLS test successful');
    return true;
  } catch (error) {
    console.error('🚫 Bypass RLS test caught error:', error);
    return false;
  }
}
