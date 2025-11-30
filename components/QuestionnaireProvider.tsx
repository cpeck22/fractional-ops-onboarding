'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { QuestionnaireData } from '@/types';
import { supabase, saveQuestionnaireField, loadUserQuestionnaireData, testDatabaseConnection, testRLSPolicy, testBypassRLS } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface QuestionnaireContextType {
  questionnaireData: QuestionnaireData;
  updateQuestionnaireData: (data: Partial<QuestionnaireData>) => void;
  resetQuestionnaireData: () => void;
  saveCurrentData: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  currentUser: any;
}

const QuestionnaireContext = createContext<QuestionnaireContextType | undefined>(undefined);

const initialData: QuestionnaireData = {
  // Step 1: Who You Are
  companyInfo: {
    companyName: '',
    companyDomain: ''
  },
  // Step 2: What You Do
  whatYouDo: {
    industry: '',
    whatYouDo: ''
  },
  // Step 3: How You Do It
  howYouDoIt: {
    howYouDoIt: '',
    uniqueValue: ''
  },
  // Step 4: What You Deliver
  whatYouDeliver: {
    mainService: '',
    whatYouDeliver: '',
    topUseCases: ''
  },
  // Step 5: Creating Desire
  creatingDesire: {
    barriers: '',
    whyMoveAway: ''
  },
  // Step 6: Your Buyers
  yourBuyers: {
    seniorityLevel: [],
    jobTitles: '',
    companySize: '',
    geographicMarkets: '',
    preferredEngagement: '',
    decisionMakerResponsibilities: '',
    prospectChallenges: '',
    unqualifiedPersons: ''
  },
  // Step 7: Social Proof
  socialProof: {
    proofPoints: '',
    clientReferences: [{
      companyName: '',
      companyDomain: '',
      industry: '',
      successStory: ''
    }]
  },
  // Step 8: Positioning
  positioning: {
    competitors: []
  },
  // Step 9: Carrots & Lead Magnets
  leadMagnets: {
    leadMagnet: ''
  },
  // Step 10: Brand & Examples
  brandExamples: {
    emailExample1: '',
    emailExample2: '',
    emailExample3: '',
    brandDocuments: '',
    additionalFiles: ''
  }
};

export function QuestionnaireProvider({ children }: { children: ReactNode }) {
  console.log('📊 QuestionnaireProvider: Component mounting...');
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Use refs to track state that needs to be accessed in callbacks
  const userIdRef = useRef<string | null>(null);
  const hasLoadedDataRef = useRef<boolean>(false);

  // Initialize auth and load data ONCE on mount
  useEffect(() => {
    console.log('📊 QuestionnaireProvider: Initializing auth and loading data...');
    
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('📊 QuestionnaireProvider: Initial user check:', user?.email || 'No user');
        console.log('📊 QuestionnaireProvider: Auth error:', error);
        
        if (user && !hasLoadedDataRef.current) {
          console.log('📊 QuestionnaireProvider: User authenticated, loading data ONCE');
          setCurrentUser(user);
          userIdRef.current = user.id;
          hasLoadedDataRef.current = true; // Mark that we're loading/have loaded data
          
          // Load data immediately on mount
          setIsLoading(true);
          try {
            console.log('📊 QuestionnaireProvider: Loading questionnaire data for user ID:', user.id);
            const userData = await loadUserQuestionnaireData(user.id);
            console.log('📊 QuestionnaireProvider: Loaded user data:', userData);
            
            // Migrate old clientReferences format (string) to new format (array)
            if (userData.socialProof?.clientReferences && typeof userData.socialProof.clientReferences === 'string') {
              console.log('📊 Migrating old clientReferences format to new array format');
              (userData.socialProof as any).clientReferences = [{
                companyName: '',
                companyDomain: '',
                industry: '',
                successStory: userData.socialProof.clientReferences // Put old text in success story
              }];
            }
            
            // Ensure clientReferences is an array (either migrated or already array)
            if (!Array.isArray(userData.socialProof?.clientReferences)) {
              (userData.socialProof as any).clientReferences = [{
                companyName: '',
                companyDomain: '',
                industry: '',
                successStory: ''
              }];
            }
            
            setQuestionnaireData(userData as unknown as QuestionnaireData);
          } catch (loadError) {
            console.error('📊 QuestionnaireProvider: Failed to load user data:', loadError);
            toast.error('Failed to load your questionnaire data');
            hasLoadedDataRef.current = false; // Reset on error so it can retry
          } finally {
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('📊 QuestionnaireProvider: Auth initialization error:', error);
      }
    };

    initializeAuth();

    // Listen for auth changes (ONLY for sign in/out, NOT for token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('📊 QuestionnaireProvider: Auth event:', event, '| Current userIdRef:', userIdRef.current, '| Session userId:', session?.user?.id);
        
        // Only react to actual sign in/out events
        if (event === 'SIGNED_IN' && session?.user && session.user.id !== userIdRef.current) {
          console.log('📊 QuestionnaireProvider: NEW user signed in (different from current), loading their data');
          setCurrentUser(session.user);
          userIdRef.current = session.user.id;
          hasLoadedDataRef.current = true;
          
          // Load data for new user
          setIsLoading(true);
          try {
            const userData = await loadUserQuestionnaireData(session.user.id);
            
            // Migrate old clientReferences format (string) to new format (array)
            if (userData.socialProof?.clientReferences && typeof userData.socialProof.clientReferences === 'string') {
              console.log('📊 Migrating old clientReferences format to new array format');
              (userData.socialProof as any).clientReferences = [{
                companyName: '',
                companyDomain: '',
                industry: '',
                successStory: userData.socialProof.clientReferences // Put old text in success story
              }];
            }
            
            // Ensure clientReferences is an array (either migrated or already array)
            if (!Array.isArray(userData.socialProof?.clientReferences)) {
              (userData.socialProof as any).clientReferences = [{
                companyName: '',
                companyDomain: '',
                industry: '',
                successStory: ''
              }];
            }
            
            setQuestionnaireData(userData as unknown as QuestionnaireData);
          } catch (error) {
            console.error('📊 QuestionnaireProvider: Failed to load user data:', error);
            toast.error('Failed to load your questionnaire data');
          } finally {
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('📊 QuestionnaireProvider: User signed out, clearing data');
          setCurrentUser(null);
          userIdRef.current = null;
          hasLoadedDataRef.current = false;
          setQuestionnaireData(initialData);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('📊 QuestionnaireProvider: Token refreshed - IGNORING (no data reload)');
          // Do nothing - just a token refresh, user hasn't changed
        } else if (event === 'SIGNED_IN') {
          console.log('📊 QuestionnaireProvider: SIGNED_IN event but same user - IGNORING');
        } else {
          console.log('📊 QuestionnaireProvider: Auth event ignored:', event);
        }
      }
    );

    return () => {
      console.log('📊 QuestionnaireProvider: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - only run once on mount

  // REMOVED: Debounced auto-save was causing race conditions
  // It would overwrite manual saves with stale data after 5 seconds
  // Manual save buttons are the ONLY way to save now (no auto-save)

  const updateQuestionnaireData = (data: Partial<QuestionnaireData>) => {
    console.log('📊 QuestionnaireProvider: updateQuestionnaireData called with:', data);
    setQuestionnaireData(prev => ({ ...prev, ...data }));
    // No auto-save - user will click Save button manually
  };

  const resetQuestionnaireData = () => {
    setQuestionnaireData(initialData);
  };

  const saveCurrentData = async () => {
    if (!currentUser?.id) {
      toast.error('Please sign in to save your data');
      return;
    }

    console.log('💾 Manual save triggered for user:', currentUser.email);
    console.log('💾 Manual save data:', questionnaireData);
    setIsSaving(true);

    try {
      // Test with just one field first
      console.log('💾 Testing with single field save...');
      await saveQuestionnaireField(currentUser.id, 'companyInfo', 'companyName', questionnaireData.companyInfo?.companyName || '');
      
      console.log('💾 Single field save successful, now saving all fields...');
      
      // Save all sections with defensive checks
      const savePromises = Object.entries(questionnaireData).map(([sectionId, sectionData]) => {
        if (sectionData && typeof sectionData === 'object') {
          return Object.entries(sectionData).map(([fieldKey, fieldValue]) => {
            // Skip undefined/null values
            if (fieldValue === undefined || fieldValue === null) {
              console.log(`💾 Skipping null/undefined field: ${sectionId}.${fieldKey}`);
              return Promise.resolve();
            }
            
            // Skip empty arrays
            if (Array.isArray(fieldValue) && fieldValue.length === 0) {
              console.log(`💾 Skipping empty array: ${sectionId}.${fieldKey}`);
              return Promise.resolve();
            }
            
            console.log('💾 Saving field:', { 
              sectionId, 
              fieldKey, 
              valueType: typeof fieldValue,
              isArray: Array.isArray(fieldValue),
              arrayLength: Array.isArray(fieldValue) ? fieldValue.length : 'N/A',
              value: fieldValue 
            });
            
            return saveQuestionnaireField(currentUser.id, sectionId, fieldKey, fieldValue);
          });
        }
        return [];
      }).flat().filter(Boolean);

      console.log('💾 Total fields to save:', savePromises.length);
      await Promise.all(savePromises);
      console.log('💾 Manual save successful');
      toast.success('Data saved successfully!');
    } catch (error) {
      console.error('💾 Manual save failed:', error);
      toast.error(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <QuestionnaireContext.Provider value={{
      questionnaireData,
      updateQuestionnaireData,
      resetQuestionnaireData,
      saveCurrentData,
      isLoading,
      isSaving,
      currentUser
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
