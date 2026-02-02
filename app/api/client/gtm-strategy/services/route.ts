import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', details: authError },
        { status: 401 }
      );
    }
    
    // Check for impersonation
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

    // Get workspace API key from octave_outputs
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid')
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

    // Parse request body
    const body = await request.json();
    const {
      oId,
      name,
      internalName,
      description,
      primaryUrl,
      summary,
      capabilities,
      differentiatedValue,
      statusQuo,
      challengesAddressed,
      customerBenefits
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 }
      );
    }

    // Prepare update payload for Octave
    const updatePayload: any = {
      name: name.trim(),
      internalName: internalName?.trim() || undefined,
      description: description?.trim() || undefined,
      primaryUrl: primaryUrl?.trim() || undefined,
      summary: summary?.trim() || undefined,
      capabilities: capabilities?.filter((c: string) => c.trim()) || [],
      differentiatedValue: differentiatedValue?.filter((v: string) => v.trim()) || [],
      statusQuo: statusQuo?.filter((s: string) => s.trim()) || [],
      challengesAddressed: challengesAddressed?.filter((c: string) => c.trim()) || [],
      customerBenefits: customerBenefits?.filter((b: string) => b.trim()) || []
    };

    // If oId exists, update existing product; otherwise create new
    let response;
    if (oId) {
      // Update existing product/service via Octave API
      response = await axios.post(
        'https://app.octavehq.com/api/v2/product/update',
        {
          oId,
          ...updatePayload
        },
        {
          headers: {
            'api_key': workspaceApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // Create new product/service via Octave API
      // Note: Octave's create endpoint may have different required fields
      // Adjust as needed based on API documentation
      response = await axios.post(
        'https://app.octavehq.com/api/v2/product/create',
        {
          ...updatePayload,
          type: 'SERVICE' // Assuming services are a product type
        },
        {
          headers: {
            'api_key': workspaceApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log('✅ Octave API response:', {
      status: response.status,
      hasData: !!response.data
    });

    return NextResponse.json({
      success: true,
      data: response.data?.data || response.data
    });

  } catch (error: any) {
    console.error('❌ Error updating service:', error.response?.data || error.message);
    
    // Return Octave API error if available
    if (error.response?.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.response.data.message || 'Failed to update service',
          details: error.response.data
        },
        { status: error.response.status || 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update service', details: error.message },
      { status: 500 }
    );
  }
}
