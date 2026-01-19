import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

// Admin emails that can impersonate clients
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

/**
 * Find agent in workspace by name pattern matching
 * e.g., code "0002" will find agent named "0002_*" or "*0002*"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playCode } = body; // e.g., "0002", "2001", "1003"
    
    if (!playCode) {
      return NextResponse.json(
        { success: false, error: 'playCode is required' },
        { status: 400 }
      );
    }
    
    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check for impersonation parameter
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    
    // Verify admin access if impersonating
    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
    }
    
    // Use impersonated user ID if provided, otherwise use authenticated user ID
    const effectiveUserId = impersonateUserId || user.id;
    
    // Get workspace API key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (workspaceError || !workspaceData?.workspace_api_key) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Claire API key missing, please contact Fractional Ops to fix.'
        },
        { status: 404 }
      );
    }
    
    const workspaceApiKey = workspaceData.workspace_api_key;
    
    // List all agents in workspace with pagination
    const allAgents = [];
    let offset = 0;
    const limit = 50;
    let hasNext = true;
    
    while (hasNext) {
      try {
        const response = await axios.get(
          'https://app.octavehq.com/api/v2/agents/list',
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            },
            params: {
              offset,
              limit,
              orderField: 'createdAt',
              orderDirection: 'DESC'
            }
          }
        );
        
        const pageAgents = response.data?.data || [];
        allAgents.push(...pageAgents);
        hasNext = response.data?.hasNext || false;
        offset += limit;
        
        if (!hasNext) break;
      } catch (error: any) {
        console.error('❌ Error fetching agents:', error.message);
        break;
      }
    }
    
    console.log(`📋 Found ${allAgents.length} total agents in workspace`);
    console.log(`🔍 Searching for agent matching code: ${playCode}`);
    
    // Search for agent by name pattern matching
    // Priority: exact code match at start > code anywhere in name
    const codePattern = playCode.toLowerCase();
    
    let matchedAgent = null;
    
    // First try: exact match at start (e.g., "0002" matches "0002_Activities_Website Visitor")
    matchedAgent = allAgents.find((agent: any) => {
      const agentName = (agent.name || '').toLowerCase();
      return agentName.startsWith(codePattern + '_') || agentName.startsWith(codePattern + ' ');
    });
    
    // Second try: code anywhere in name
    if (!matchedAgent) {
      matchedAgent = allAgents.find((agent: any) => {
        const agentName = (agent.name || '').toLowerCase();
        return agentName.includes(codePattern);
      });
    }
    
    if (matchedAgent) {
      console.log(`✅ Found agent: ${matchedAgent.name} (${matchedAgent.oId})`);
      return NextResponse.json({
        success: true,
        agent: {
          oId: matchedAgent.oId,
          name: matchedAgent.name,
          type: matchedAgent.type,
          description: matchedAgent.description
        }
      });
    } else {
      console.warn(`⚠️ No agent found matching code: ${playCode}`);
      console.log('Available agent names:', allAgents.slice(0, 10).map((a: any) => a.name).join(', '));
      
      return NextResponse.json(
        { 
          success: false, 
          error: `No agent found matching play code "${playCode}" in your workspace`,
          availableAgents: allAgents.slice(0, 20).map((a: any) => ({
            name: a.name,
            oId: a.oId
          }))
        },
        { status: 404 }
      );
    }
    
  } catch (error: any) {
    console.error('❌ Error finding agent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to find agent', details: error.message },
      { status: 500 }
    );
  }
}

