import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// PUT - Update intermediary outputs
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    const body = await request.json();
    const { intermediaryOutputs } = body;

    console.log('📝 [Update Intermediaries] Updating campaign:', campaignId);

    // Get authenticated user
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check for impersonation
    const { searchParams } = new URL(request.url);
    const impersonateUserId = searchParams.get('impersonate');
    let effectiveUserId = user.id;

    if (impersonateUserId) {
      const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === user.email?.toLowerCase());
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Admin access required for impersonation' },
          { status: 403 }
        );
      }
      effectiveUserId = impersonateUserId;
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update campaign intermediary outputs
    const { data: campaign, error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        intermediary_outputs: intermediaryOutputs,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', effectiveUserId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Error updating intermediaries:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update intermediary outputs', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Intermediary outputs updated successfully');

    return NextResponse.json({
      success: true,
      intermediaryOutputs: campaign.intermediary_outputs
    });

  } catch (error: any) {
    console.error('❌ Error in PUT /api/client/campaigns/[id]/update-intermediaries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update intermediary outputs', details: error.message },
      { status: 500 }
    );
  }
}
