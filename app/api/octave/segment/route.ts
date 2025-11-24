import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { ClientReference } from '@/types';

const OCTAVE_SEGMENT_API_URL = 'https://app.octavehq.com/api/v2/segment/generate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientReferences, primaryOfferingOId, workspaceOId, workspaceApiKey } = body as {
      clientReferences: ClientReference[];
      primaryOfferingOId?: string;
      workspaceOId?: string;
      workspaceApiKey?: string;
    };

    console.log('📥 Generating segments in Octave from client references (GENERATE endpoint with AI enhancement)');
    console.log('📥 Number of client references:', clientReferences.length);
    console.log('📥 Primary Offering OId:', primaryOfferingOId);
    console.log('📥 Workspace OId:', workspaceOId);
    console.log('🔑 Workspace API Key:', workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...` : 'Using .env key');

    // Use workspace API key if provided, otherwise fall back to .env key
    const apiKey = workspaceApiKey || process.env.OCTAVE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Octave API key not configured (neither workspace key nor .env key available)' },
        { status: 500 }
      );
    }

    // Extract unique industries from client references
    const industries = new Set<string>();
    const industryDetails = new Map<string, ClientReference[]>();
    
    clientReferences.forEach(ref => {
      if (ref.industry && ref.industry.trim()) {
        const normalizedIndustry = ref.industry.trim();
        industries.add(normalizedIndustry);
        
        // Group references by industry for richer context
        if (!industryDetails.has(normalizedIndustry)) {
          industryDetails.set(normalizedIndustry, []);
        }
        industryDetails.get(normalizedIndustry)!.push(ref);
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

    // Build segments array for batch generation with AI enhancement
    const segmentsArray = uniqueIndustries.map(industry => {
      const refsInIndustry = industryDetails.get(industry) || [];
      const companyNames = refsInIndustry.map(r => r.companyName).join(', ');
      
      // Build rich TEXT source for AI enhancement
      const textSource = `Market Segment: ${industry}
Number of client references: ${refsInIndustry.length}
Example companies in this segment: ${companyNames}
${refsInIndustry[0]?.successStory ? `Example success story: ${refsInIndustry[0].successStory}` : ''}`;

      return {
        name: industry, // Will be used as segment name
        sources: [
          {
            type: 'TEXT',
            value: textSource
          }
        ]
      };
    });

    console.log(`🤖 Generating ${segmentsArray.length} segments with AI enhancement...`);

    try {
      const segmentRequest = {
        segments: segmentsArray,
        primaryOfferingOId: primaryOfferingOId || undefined,
        linkingStrategy: {
          mode: 'ALL'
        }
      };

      console.log('Segment generation request:', JSON.stringify(segmentRequest, null, 2));

      const response = await axios.post(OCTAVE_SEGMENT_API_URL, segmentRequest, {
        headers: {
          'Content-Type': 'application/json',
          'api_key': apiKey
        }
      });

      console.log('🔍 FULL SEGMENT GENERATION RESPONSE:', JSON.stringify(response.data, null, 2));

      // Extract created segments from response
      const createdSegments = response.data?.data?.map((segData: any, index: number) => ({
        index: index,
        industry: uniqueIndustries[index],
        oId: segData.oId,
        name: segData.name,
        data: segData
      })) || [];

      console.log(`✅ Successfully generated ${createdSegments.length} segments with AI enhancement`);

      return NextResponse.json({
        success: true,
        created: createdSegments.length,
        total: uniqueIndustries.length,
        segments: createdSegments,
        message: `Generated ${createdSegments.length} segments with AI enhancement`
      });

    } catch (error: any) {
      console.error(`❌ Error generating segments:`, error.response?.data || error.message);
      return NextResponse.json(
        { 
          success: false,
          error: error.response?.data?.message || error.message,
          details: error.response?.data
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ Error in segment generation API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to generate segments'
      },
      { status: 500 }
    );
  }
}
