import axios from 'axios';
import { QuestionnaireData, OctaveWorkspaceRequest } from '@/types';

const OCTAVE_API_URL = 'https://app.octavehq.com/api/v2/agents/workspace/build';

export const createOctaveWorkspace = async (
  questionnaireData: QuestionnaireData,
  apiKey: string
): Promise<any> => {
  try {
    console.log('API Key being used:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT PROVIDED');
    const workspaceRequest: OctaveWorkspaceRequest = {
      workspace: {
        name: "Fractional Ops Client Workspace",
        url: "https://fractionalops.com",
        addExistingUsers: true,
        agentOIds: []
      },
      offering: {
        type: "SERVICE",
        name: "Fractional Revenue Officer Services",
        differentiatedValue: "Our unique approach to fractional revenue leadership combines strategic expertise with hands-on execution to drive measurable growth for B2B clients.",
        statusQuo: "Companies struggle with revenue growth due to lack of experienced revenue leadership and systematic go-to-market execution."
      },
      runtimeContext: JSON.stringify(questionnaireData),
      brandVoiceOId: "bv_fractional_ops",
      createDefaultAgents: true
    };

    const response = await axios.post(OCTAVE_API_URL, workspaceRequest, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error creating Octave workspace:', error);
    throw new Error('Failed to create Octave workspace');
  }
};

// Simple in-memory user store (in production, use a database)
interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  companyName: string;
  createdAt: Date;
}

// In-memory user storage (in production, this would be a database)
let users: User[] = [
  {
    id: '1',
    username: 'revops.client@fractionalops.com',
    password: 'FractionalOps',
    email: 'revops.client@fractionalops.com',
    companyName: 'Fractional Ops Client',
    createdAt: new Date()
  },
  {
    id: '2',
    username: 'client@fractionalops.com',
    password: 'onboarding2024',
    email: 'client@fractionalops.com',
    companyName: 'Demo Company',
    createdAt: new Date()
  }
];

export const validateCredentials = (username: string, password: string): boolean => {
  const user = users.find(u => u.username === username || u.email === username);
  return user ? user.password === password : false;
};

export const createUser = async (userData: {
  username: string;
  password: string;
  email: string;
  companyName: string;
}): Promise<{ success: boolean; message: string; userId?: string }> => {
  try {
    // Check if user already exists
    const existingUser = users.find(u => u.username === userData.username || u.email === userData.email);
    if (existingUser) {
      return { success: false, message: 'User already exists with this email or username' };
    }

    // Create new user
    const newUser: User = {
      id: (users.length + 1).toString(),
      username: userData.username,
      password: userData.password,
      email: userData.email,
      companyName: userData.companyName,
      createdAt: new Date()
    };

    users.push(newUser);
    
    return { 
      success: true, 
      message: 'Account created successfully! You can now log in.',
      userId: newUser.id
    };
  } catch (error) {
    return { success: false, message: 'Failed to create account. Please try again.' };
  }
};

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(u => u.email === email || u.username === email);
};
