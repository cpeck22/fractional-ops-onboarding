import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      console.error('❌ Auth error in workspace-data:', authError);
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authError || 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Check for impersonation - if admin is impersonating, use impersonated user's workspace
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    const effectiveUserId = impersonateUserId || user.id;

    // Get workspace API key from octave_outputs
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid, company_name')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (workspaceError || !workspaceData?.workspace_api_key) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Claire API key missing, please contact Fractional Ops to fix.',
          details: workspaceError?.message
        },
        { status: 404 }
      );
    }
    
    const workspaceApiKey = workspaceData.workspace_api_key;
    
    // Fetch personas, use cases, and references from Octave
    const [personasResponse, useCasesResponse, referencesResponse] = await Promise.all([
      axios.get('https://app.octavehq.com/api/v2/persona/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } })),
      
      axios.get('https://app.octavehq.com/api/v2/use-case/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } })),
      
      axios.get('https://app.octavehq.com/api/v2/reference/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } }))
    ]);
    
    const personas = personasResponse.data?.data || [];
    const useCases = useCasesResponse.data?.data || [];
    const references = referencesResponse.data?.data || [];
    
    return NextResponse.json({
      success: true,
      workspace: {
        workspace_oid: workspaceData.workspace_oid,
        company_name: workspaceData.company_name
      },
      personas: personas.map((p: any) => ({
        oId: p.oId,
        name: p.name,
        internalName: p.internalName
      })),
      useCases: useCases.map((uc: any) => ({
        oId: uc.oId,
        name: uc.name,
        internalName: uc.internalName
      })),
      clientReferences: references.map((r: any) => ({
        oId: r.oId,
        name: r.name || r.companyName || 'Unnamed Reference'
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching workspace data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workspace data', details: error.message },
      { status: 500 }
    );
  }
}
