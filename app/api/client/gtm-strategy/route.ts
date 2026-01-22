import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Log request details for debugging
    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');
    console.log('📥 GTM Strategy request:', {
      hasAuthHeader: !!authHeader,
      hasCookies: !!cookieHeader,
      url: request.url,
      method: request.method
    });

    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      console.error('❌ Auth error in gtm-strategy:', {
        error: authError,
        hasAuthHeader: !!authHeader,
        hasCookies: !!cookieHeader,
        url: request.url
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authError || 'Authentication failed' },
        { status: 401 }
      );
    }
    
    console.log('✅ Auth successful in gtm-strategy:', { userId: user.id, email: user.email });
    
    // Check for impersonation - if admin is impersonating, use impersonated user's workspace
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    
    // Verify admin access if impersonating
    if (impersonateUserId) {
      const ADMIN_EMAILS = [
        'ali.hassan@fractionalops.com',
        'sharifali1000@gmail.com',
        'corey@fractionalops.com',
      ];
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
    
    const effectiveUserId = impersonateUserId || user.id;

    // Get workspace API key and product OId from octave_outputs
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid, product_oid, company_name, service_offering')
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
    const productOId = workspaceData.product_oid;
    
    // Fetch all Octave workspace elements in parallel
    const [
      personasResponse,
      useCasesResponse,
      referencesResponse,
      segmentsResponse,
      playbooksResponse,
      productResponse
    ] = await Promise.all([
      // Personas
      axios.get('https://app.octavehq.com/api/v2/persona/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } })),
      
      // Use Cases
      axios.get('https://app.octavehq.com/api/v2/use-case/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } })),
      
      // References
      axios.get('https://app.octavehq.com/api/v2/reference/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } })),
      
      // Segments
      axios.get('https://app.octavehq.com/api/v2/segment/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } })),
      
      // Playbooks
      axios.get('https://app.octavehq.com/api/v2/playbook/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch(() => ({ data: { data: [] } })),
      
      // Service Offering/Product (if productOId exists)
      productOId ? axios.get(`https://app.octavehq.com/api/v2/product/get?oId=${productOId}`, {
        headers: { 'api_key': workspaceApiKey }
      }).catch(() => ({ data: null })) : Promise.resolve({ data: null })
    ]);
    
    const personas = personasResponse.data?.data || [];
    const useCases = useCasesResponse.data?.data || [];
    const references = referencesResponse.data?.data || [];
    const segments = segmentsResponse.data?.data || [];
    const playbooks = playbooksResponse.data?.data || [];
    const serviceOffering = productResponse.data || workspaceData.service_offering || null;
    
    return NextResponse.json({
      success: true,
      workspace: {
        workspace_oid: workspaceData.workspace_oid,
        company_name: workspaceData.company_name
      },
      personas: personas.map((p: any) => ({
        oId: p.oId,
        name: p.name,
        internalName: p.internalName,
        description: p.description || p.data?.description || null
      })),
      useCases: useCases.map((uc: any) => ({
        oId: uc.oId,
        name: uc.name,
        internalName: uc.internalName,
        description: uc.description || uc.data?.description || null
      })),
      clientReferences: references.map((r: any) => ({
        oId: r.oId,
        name: r.name || r.companyName || 'Unnamed Reference',
        companyName: r.companyName,
        companyDomain: r.companyDomain,
        industry: r.industry
      })),
      segments: segments.map((s: any) => ({
        oId: s.oId,
        name: s.name,
        description: s.description || s.data?.description || null
      })),
      playbooks: playbooks.map((pb: any) => ({
        oId: pb.oId,
        name: pb.name,
        description: pb.description || pb.data?.description || null
      })),
      serviceOffering: serviceOffering ? {
        oId: serviceOffering.oId,
        name: serviceOffering.name,
        description: serviceOffering.description,
        data: serviceOffering.data
      } : null
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching GTM Strategy data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GTM Strategy data', details: error.message },
      { status: 500 }
    );
  }
}

