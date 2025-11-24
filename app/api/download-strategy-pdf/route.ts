import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateStrategyPDF, getStrategyFileName } from '@/lib/strategyPdfGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log('📄 Generating strategy PDF for user:', userId);
    
    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch strategy data
    const { data, error } = await supabase
      .from('octave_outputs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      console.error('❌ Failed to fetch strategy data:', error);
      return NextResponse.json(
        { error: 'No strategy found for user' },
        { status: 404 }
      );
    }
    
    // Generate PDF
    const pdfBuffer = generateStrategyPDF({
      companyName: data.company_name,
      companyDomain: data.company_domain,
      campaignIdeas: data.campaign_ideas || [],
      prospectList: data.prospect_list || [],
      coldEmails: data.cold_emails || {
        personalizedSolutions: [],
        leadMagnetShort: [],
        localCity: [],
        problemSolution: [],
        leadMagnetLong: []
      },
      linkedinPosts: data.linkedin_posts || {
        inspiring: '',
        promotional: '',
        actionable: ''
      },
      linkedinDMs: data.linkedin_dms || {
        newsletter: '',
        leadMagnet: ''
      },
      newsletters: data.newsletters || {
        tactical: '',
        leadership: ''
      },
      callPrep: data.call_prep,
      serviceOffering: data.service_offering,
      useCases: data.use_cases,
      personas: data.personas,
      clientReferences: data.client_references,
      segments: data.segments
    });
    
    const fileName = getStrategyFileName(data.company_name);
    console.log('✅ PDF generated:', fileName);
    
    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error generating strategy PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}

