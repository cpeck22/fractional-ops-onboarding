import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized', details: authError }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    
    if (impersonateUserId) {
      const ADMIN_EMAILS = ['ali.hassan@fractionalops.com', 'sharifali1000@gmail.com', 'corey@fractionalops.com'];
      const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required for impersonation' }, { status: 403 });
      }
    }
    
    const effectiveUserId = impersonateUserId || user.id;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: workspaceData, error: workspaceError } = await supabaseAdmin
      .from('octave_outputs')
      .select('workspace_api_key, workspace_oid, product_oid')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (workspaceError || !workspaceData?.workspace_api_key) {
      return NextResponse.json({ success: false, error: 'Claire API key missing, please contact Fractional Ops to fix.', details: workspaceError?.message }, { status: 404 });
    }
    
    const workspaceApiKey = workspaceData.workspace_api_key;
    const body = await request.json();
    const { 
      oId, 
      name, 
      description, 
      type,
      status,
      keyInsight, 
      exampleDomains, 
      approachAngle, 
      strategicNarrative,
      selectedPersonaOIds,
      selectedUseCaseOIds,
      selectedReferenceOIds,
      selectedSegmentOId,
      selectedCompetitorOId,
      selectedProofPointOIds,
      productOId
    } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, error: 'Playbook description is required' }, { status: 400 });
    }

    if (!keyInsight || keyInsight.length === 0 || !keyInsight[0]?.trim()) {
      return NextResponse.json({ success: false, error: 'Key insight is required' }, { status: 400 });
    }

    const updatePayload: any = {
      name: name?.trim() || undefined,
      description: description.trim(),
      type: type || undefined,
      status: status || 'active',
      keyInsight: keyInsight.filter((k: string) => k.trim()).join(' '), // Octave expects string, not array
      exampleDomains: exampleDomains?.filter((d: string) => d.trim()) || [],
      approachAngle: approachAngle?.filter((a: string) => a.trim()) || [],
      strategicNarrative: strategicNarrative?.filter((s: string) => s.trim()) || [],
      personaOIds: selectedPersonaOIds?.filter((id: string) => id) || [],
      useCaseOIds: selectedUseCaseOIds?.filter((id: string) => id) || [],
      referenceOIds: selectedReferenceOIds?.filter((id: string) => id) || [],
      segmentOId: selectedSegmentOId || undefined,
      competitorOId: selectedCompetitorOId || undefined,
      proofPointOIds: selectedProofPointOIds?.filter((id: string) => id) || [],
      productOId: productOId || workspaceData.product_oid || undefined
    };

    let response;
    if (oId) {
      response = await axios.post('https://app.octavehq.com/api/v2/playbook/update', { oId, ...updatePayload }, {
        headers: { 'api_key': workspaceApiKey, 'Content-Type': 'application/json' }
      });
    } else {
      response = await axios.post('https://app.octavehq.com/api/v2/playbook/create', updatePayload, {
        headers: { 'api_key': workspaceApiKey, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Octave API response (playbook):', { status: response.status, hasData: !!response.data });
    return NextResponse.json({ success: true, data: response.data?.playbook || response.data?.data || response.data });

  } catch (error: any) {
    console.error('❌ Error updating playbook:', error.response?.data || error.message);
    if (error.response?.data) {
      return NextResponse.json({ success: false, error: error.response.data.message || 'Failed to update playbook', details: error.response.data }, { status: error.response.status || 500 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update playbook', details: error.message }, { status: 500 });
  }
}
