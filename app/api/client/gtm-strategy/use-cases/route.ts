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
      .select('workspace_api_key, workspace_oid')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (workspaceError || !workspaceData?.workspace_api_key) {
      return NextResponse.json({ success: false, error: 'Claire API key missing, please contact Fractional Ops to fix.', details: workspaceError?.message }, { status: 404 });
    }
    
    const workspaceApiKey = workspaceData.workspace_api_key;
    const body = await request.json();
    const { oId, name, internalName, description, primaryUrl, summary, scenarios, desiredOutcomes, businessDrivers, businessImpact } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Use case name is required' }, { status: 400 });
    }

    const updatePayload: any = {
      name: name.trim(),
      internalName: internalName?.trim() || undefined,
      description: description?.trim() || undefined,
      primaryUrl: primaryUrl?.trim() || undefined,
      summary: summary?.trim() || undefined,
      scenarios: scenarios?.filter((s: string) => s.trim()) || [],
      desiredOutcomes: desiredOutcomes?.filter((o: string) => o.trim()) || [],
      businessDrivers: businessDrivers?.filter((d: string) => d.trim()) || [],
      businessImpact: businessImpact?.filter((i: string) => i.trim()) || []
    };

    let response;
    if (oId) {
      response = await axios.post('https://app.octavehq.com/api/v2/use-case/update', { oId, ...updatePayload }, {
        headers: { 'api_key': workspaceApiKey, 'Content-Type': 'application/json' }
      });
    } else {
      response = await axios.post('https://app.octavehq.com/api/v2/use-case/create', updatePayload, {
        headers: { 'api_key': workspaceApiKey, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Octave API response (use case):', { status: response.status, hasData: !!response.data });
    return NextResponse.json({ success: true, data: response.data?.data || response.data });

  } catch (error: any) {
    console.error('❌ Error updating use case:', error.response?.data || error.message);
    if (error.response?.data) {
      return NextResponse.json({ success: false, error: error.response.data.message || 'Failed to update use case', details: error.response.data }, { status: error.response.status || 500 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update use case', details: error.message }, { status: 500 });
  }
}
