import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Competitor } from '@/types';

const OCTAVE_COMPETITOR_API_URL = 'https://app.octavehq.com/api/v2/competitor/generate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitors, productOId, workspaceOId, workspaceApiKey } = body as {
      competitors: Competitor[];
      productOId: string;
      workspaceOId?: string;
      workspaceApiKey: string;
    };

    console.log('📥 Generating competitors in Octave (GENERATE endpoint with AI enhancement)');
    console.log('📥 Number of competitors:', competitors.length);
    console.log('📥 Product OId:', productOId);
    console.log('📥 Workspace OId:', workspaceOId);
    console.log('🔑 Using Workspace API Key:', workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...` : 'NOT PROVIDED');
    console.log('🚀 Competitor generation initiated with AI enhancement');

    if (!workspaceApiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Workspace API key is required for generating competitors. This key should come from the workspace creation response.' 
        },
        { status: 400 }
      );
    }

    // Build competitors array for batch generation
    const competitorsArray = competitors
      .filter(comp => comp.companyName && comp.companyWebsite) // Only include valid competitors
      .map(comp => {
        // Format the URL properly (add https:// if missing)
        const formattedUrl = comp.companyWebsite.startsWith('http') 
          ? comp.companyWebsite 
          : `https://${comp.companyWebsite}`;

        return {
          name: comp.companyName, // Will be used as entity name
          sources: [
            {
              type: 'URL',
              value: formattedUrl // AI will scrape and analyze the website
            }
          ]
        };
      });

    if (competitorsArray.length === 0) {
      console.log('⚠️ No valid competitors to generate (all missing required fields)');
      return NextResponse.json({
        success: true,
        created: 0,
        total: 0,
        competitors: [],
        message: 'No valid competitors to generate'
      });
    }

    console.log(`🤖 Generating ${competitorsArray.length} competitors with AI enhancement...`);

    try {
      const competitorRequest = {
        competitors: competitorsArray,
        primaryOfferingOId: productOId,
        linkingStrategy: {
          mode: 'ALL'
        }
      };

      console.log('Competitor generation request:', JSON.stringify(competitorRequest, null, 2));

      // Use workspace API key for batch generation
      const response = await axios.post(OCTAVE_COMPETITOR_API_URL, competitorRequest, {
        headers: {
          'Content-Type': 'application/json',
          'api_key': workspaceApiKey
        },
        timeout: 60000 // 60 second timeout for competitor generation
      });

      console.log('🔍 FULL COMPETITOR GENERATION RESPONSE:', JSON.stringify(response.data, null, 2));

      // Extract created competitors from response
      const createdCompetitors = response.data?.data?.map((compData: any, index: number) => {
        const originalComp = competitors.filter(c => c.companyName && c.companyWebsite)[index];
        return {
          index: index,
          companyName: compData.name || compData.internalName || originalComp.companyName,
          companyWebsite: originalComp.companyWebsite,
          oId: compData.oId,
          data: compData.data,  // Contains businessModel, comparativeStrengths, comparativeWeaknesses, keyDifferentiators, reasonsWeWin
          description: compData.description
        };
      }) || [];

      console.log(`✅ Successfully generated ${createdCompetitors.length} competitors with AI enhancement`);

      return NextResponse.json({
        success: true,
        created: createdCompetitors.length,
        total: competitors.length,
        competitors: createdCompetitors,
        message: `Generated ${createdCompetitors.length} competitors with AI enhancement`
      });

    } catch (error: any) {
      console.error(`❌ Error generating competitors:`, error.response?.data || error.message);
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
    console.error('❌ Error in competitor generation API:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to generate competitors',
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}

