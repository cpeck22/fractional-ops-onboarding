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
    console.log(`🔑 Using workspace API key: ${workspaceApiKey?.substring(0, 15)}...`);
    
    // Fetch all Octave workspace elements in parallel
    const [
      personasResponse,
      useCasesResponse,
      referencesResponse,
      segmentsResponse,
      playbooksResponse,
      competitorsResponse,
      proofPointsResponse,
      productsResponse
    ] = await Promise.all([
      // Personas - fetch ALL data
      axios.get('https://app.octavehq.com/api/v2/persona/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching personas from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      }),
      
      // Use Cases - fetch ALL data
      axios.get('https://app.octavehq.com/api/v2/use-case/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching use cases from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      }),
      
      // References - fetch ALL data
      axios.get('https://app.octavehq.com/api/v2/reference/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching references from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      }),
      
      // Segments - fetch ALL data
      axios.get('https://app.octavehq.com/api/v2/segment/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching segments from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      }),
      
      // Playbooks - fetch ALL data
      axios.get('https://app.octavehq.com/api/v2/playbook/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching playbooks from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      }),
      
      // Competitors - NEW: fetch ALL competitor data
      axios.get('https://app.octavehq.com/api/v2/competitor/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching competitors from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      }),
      
      // Proof Points - NEW: fetch ALL proof point data
      axios.get('https://app.octavehq.com/api/v2/proof-point/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching proof points from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      }),
      
      // Products/Services - NEW: fetch ALL products (not just one)
      axios.get('https://app.octavehq.com/api/v2/product/list', {
        headers: { 'api_key': workspaceApiKey },
        params: { limit: 100 }
      }).catch((error: any) => {
        console.error('❌ Error fetching products from Octave:', error.response?.status, error.response?.data || error.message);
        return { data: { data: [] } };
      })
    ]);
    
    const personas = personasResponse.data?.data || [];
    const useCases = useCasesResponse.data?.data || [];
    const references = referencesResponse.data?.data || [];
    const segments = segmentsResponse.data?.data || [];
    const playbooks = playbooksResponse.data?.data || [];
    const competitors = competitorsResponse.data?.data || [];
    const proofPoints = proofPointsResponse.data?.data || [];
    const products = productsResponse.data?.data || [];
    
    console.log('📊 Octave API Results:', {
      personas: personas.length,
      useCases: useCases.length,
      references: references.length,
      segments: segments.length,
      playbooks: playbooks.length,
      competitors: competitors.length,
      proofPoints: proofPoints.length,
      products: products.length
    });
    
    return NextResponse.json({
      success: true,
      workspace: {
        workspace_oid: workspaceData.workspace_oid,
        company_name: workspaceData.company_name,
        workspace_api_key: workspaceApiKey // Include for frontend API calls
      },
      // Return ALL persona data
      personas: personas.map((p: any) => ({
        oId: p.oId,
        name: p.name,
        internalName: p.internalName,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        active: p.active,
        data: p.data, // Full data object with all fields
        qualifyingQuestions: p.qualifyingQuestions,
        user: p.user,
        workspace: p.workspace
      })),
      // Return ALL use case data
      useCases: useCases.map((uc: any) => ({
        oId: uc.oId,
        name: uc.name,
        internalName: uc.internalName,
        description: uc.description,
        primaryUrl: uc.primaryUrl,
        createdAt: uc.createdAt,
        updatedAt: uc.updatedAt,
        active: uc.active,
        data: uc.data, // Full data object
        scenarios: uc.scenarios,
        desiredOutcomes: uc.desiredOutcomes,
        user: uc.user,
        workspace: uc.workspace
      })),
      // Return ALL reference data
      clientReferences: references.map((r: any) => ({
        oId: r.oId,
        name: r.name,
        internalName: r.internalName,
        description: r.description,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        active: r.active,
        data: r.data, // Full data object
        user: r.user,
        workspace: r.workspace,
        unrecognized: r.unrecognized
      })),
      // Return ALL segment data
      segments: segments.map((s: any) => ({
        oId: s.oId,
        name: s.name,
        internalName: s.internalName,
        description: s.description,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        active: s.active,
        data: s.data, // Full data object
        qualifyingQuestions: s.qualifyingQuestions,
        user: s.user,
        workspace: s.workspace,
        unrecognized: s.unrecognized,
        rejected: s.rejected
      })),
      // Return ALL playbook data
      playbooks: playbooks.map((pb: any) => ({
        oId: pb.oId,
        name: pb.name,
        description: pb.description,
        createdAt: pb.createdAt,
        updatedAt: pb.updatedAt,
        active: pb.active,
        shared: pb.shared,
        type: pb.type,
        framework: pb.framework,
        status: pb.status,
        referenceMode: pb.referenceMode,
        proofPointMode: pb.proofPointMode,
        data: pb.data, // Full data object
        qualifyingQuestions: pb.qualifyingQuestions,
        user: pb.user,
        workspace: pb.workspace,
        product: pb.product,
        buyerPersonas: pb.buyerPersonas,
        useCases: pb.useCases,
        references: pb.references,
        segment: pb.segment,
        competitor: pb.competitor,
        proofPoints: pb.proofPoints
      })),
      // Return ALL competitor data
      competitors: competitors.map((c: any) => ({
        oId: c.oId,
        name: c.name,
        internalName: c.internalName,
        description: c.description,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        active: c.active,
        shared: c.shared,
        data: c.data, // Full data object
        user: c.user,
        workspace: c.workspace
      })),
      // Return ALL proof point data
      proofPoints: proofPoints.map((pp: any) => ({
        oId: pp.oId,
        name: pp.name,
        internalName: pp.internalName,
        description: pp.description,
        createdAt: pp.createdAt,
        updatedAt: pp.updatedAt,
        active: pp.active,
        data: pp.data, // Full data object
        user: pp.user,
        workspace: pp.workspace
      })),
      // Return ALL products/services (max 3 for UI)
      services: products.map((p: any) => ({
        oId: p.oId,
        name: p.name,
        internalName: p.internalName,
        description: p.description,
        primaryUrl: p.primaryUrl,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        active: p.active,
        data: p.data, // Full data object
        qualifyingQuestions: p.qualifyingQuestions,
        user: p.user,
        workspace: p.workspace
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching GTM Strategy data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GTM Strategy data', details: error.message },
      { status: 500 }
    );
  }
}

