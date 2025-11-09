import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { ClientReference } from '@/types';

const OCTAVE_SEGMENT_API_URL = 'https://app.octavehq.com/api/v2/segment/create';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientReferences, primaryOfferingOId } = body as {
      clientReferences: ClientReference[];
      primaryOfferingOId?: string;
    };

    console.log('📥 Creating segments in Octave from client references');
    console.log('📥 Number of client references:', clientReferences.length);

    // Get API key from server environment
    const apiKey = process.env.OCTAVE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Octave API key not configured' },
        { status: 500 }
      );
    }

    // Extract unique industries from client references
    const industries = new Set<string>();
    clientReferences.forEach(ref => {
      if (ref.industry && ref.industry.trim()) {
        // Normalize the industry name (trim whitespace, lowercase for comparison)
        const normalizedIndustry = ref.industry.trim();
        industries.add(normalizedIndustry);
      }
    });

    const uniqueIndustries = Array.from(industries);
    console.log(`📊 Found ${uniqueIndustries.length} unique industries:`, uniqueIndustries);

    if (uniqueIndustries.length === 0) {
      console.log('⚠️ No industries found in client references, skipping segment creation');
      return NextResponse.json({
        success: true,
        created: 0,
        total: 0,
        segments: [],
        message: 'No industries found to create segments'
      });
    }

    const createdSegments = [];
    const errors = [];

    // Create a segment for each unique industry
    for (let i = 0; i < uniqueIndustries.length; i++) {
      const industry = uniqueIndustries[i];

      try {
        console.log(`📤 Creating segment ${i + 1}/${uniqueIndustries.length}: ${industry}`);

        const segmentRequest = {
          name: industry,
          description: `Market segment for ${industry} industry`,
          data: {},
          primaryOfferingOId: primaryOfferingOId || undefined,
          linkingStrategy: {
            mode: 'ALL'
          }
        };

        console.log('Segment request:', JSON.stringify(segmentRequest, null, 2));

        const response = await axios.post(OCTAVE_SEGMENT_API_URL, segmentRequest, {
          headers: {
            'Content-Type': 'application/json',
            'api_key': apiKey
          }
        });

        console.log(`✅ Created segment ${i + 1}: ${industry} (${response.data.data.oId})`);
        createdSegments.push({
          index: i,
          industry: industry,
          oId: response.data.data.oId,
          name: response.data.data.name,
          data: response.data.data
        });

      } catch (error: any) {
        console.error(`❌ Error creating segment ${i + 1} (${industry}):`, error.response?.data || error.message);
        errors.push({
          index: i,
          industry: industry,
          error: error.response?.data?.message || error.message
        });
      }
    }

    console.log(`✅ Successfully created ${createdSegments.length} / ${uniqueIndustries.length} segments`);
    if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} segments failed:`, errors);
    }

    return NextResponse.json({
      success: true,
      created: createdSegments.length,
      total: uniqueIndustries.length,
      segments: createdSegments,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ Error in segment creation API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create segments'
      },
      { status: 500 }
    );
  }
}

