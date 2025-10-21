'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { QuestionnaireData } from '@/types';
import { supabase, saveQuestionnaireField, loadUserQuestionnaireData, testDatabaseConnection, testRLSPolicy, testBypassRLS } from '@/lib/supabase';
import { debounce } from 'lodash';
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
  companyInfo: {
    companyName: '',
    companyDomain: ''
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
  console.log('📊 QuestionnaireProvider: Component mounting...');
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Initialize auth on mount
  useEffect(() => {
    console.log('📊 QuestionnaireProvider: Initializing auth...');
    
    const initializeAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('📊 QuestionnaireProvider: Initial user check:', user?.email || 'No user');
        console.log('📊 QuestionnaireProvider: Auth error:', error);
        
        if (user) {
          console.log('📊 QuestionnaireProvider: User authenticated');
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('📊 QuestionnaireProvider: Auth initialization error:', error);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('📊 QuestionnaireProvider: Auth state change:', event, session?.user?.email || 'No user');
        if (session?.user) {
          setCurrentUser(session.user);
        } else {
          setCurrentUser(null);
          setQuestionnaireData(initialData);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load data whenever currentUser changes
  useEffect(() => {
    if (!currentUser?.id) {
      console.log('📊 QuestionnaireProvider: No user, skipping data load');
      return;
    }

    console.log('📊 QuestionnaireProvider: currentUser changed, loading data for:', currentUser.email);
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        console.log('📊 QuestionnaireProvider: Loading questionnaire data for user ID:', currentUser.id);
        const userData = await loadUserQuestionnaireData(currentUser.id);
        console.log('📊 QuestionnaireProvider: Loaded user data:', userData);
        setQuestionnaireData(userData);
      } catch (error) {
        console.error('📊 QuestionnaireProvider: Failed to load user data:', error);
        toast.error('Failed to load your questionnaire data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Debounced save function - saves entire current section
  const debouncedSave = debounce(async (userId: string, sectionId: string) => {
    console.log('💾 QuestionnaireProvider: Debounced save triggered for section:', sectionId);
    
    // Get the current data for this section from state
    const currentSectionData = questionnaireData[sectionId as keyof QuestionnaireData];
    console.log('💾 QuestionnaireProvider: Current section data:', currentSectionData);
    
    setIsSaving(true);
    
    try {
      // Save all fields in the current section
      const savePromises = Object.entries(currentSectionData || {}).map(([fieldKey, fieldValue]) => 
        saveQuestionnaireField(userId, sectionId, fieldKey, fieldValue as string)
      );
      
      await Promise.all(savePromises);
      console.log('💾 QuestionnaireProvider: Section save successful');
      toast.success('Progress saved!');
    } catch (error) {
      console.error('💾 QuestionnaireProvider: Failed to save section data:', error);
      toast.error('Failed to save your progress');
    } finally {
      setIsSaving(false);
    }
  }, 5000);

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
      
      // Save all sections
      const savePromises = Object.entries(questionnaireData).map(([sectionId, sectionData]) => {
        if (sectionData && typeof sectionData === 'object') {
          return Object.entries(sectionData).map(([fieldKey, fieldValue]) => {
            console.log('💾 Saving field:', { sectionId, fieldKey, fieldValue });
            return saveQuestionnaireField(currentUser.id, sectionId, fieldKey, fieldValue as string);
          });
        }
        return [];
      }).flat();

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
