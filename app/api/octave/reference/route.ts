import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { ClientReference } from '@/types';

const OCTAVE_REFERENCE_API_URL = 'https://app.octavehq.com/api/v2/reference/generate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientReferences, productOId, workspaceOId, workspaceApiKey } = body as {
      clientReferences: ClientReference[];
      productOId: string;
      workspaceOId?: string;
      workspaceApiKey: string;
    };

    console.log('📥 Generating client references in Octave (GENERATE endpoint with AI enhancement)');
    console.log('📥 Number of references:', clientReferences.length);
    console.log('📥 Product OId:', productOId);
    console.log('📥 Workspace OId:', workspaceOId);
    console.log('🔑 Using Workspace API Key:', workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...` : 'NOT PROVIDED');
    console.log('🚀 Reference generation initiated with AI enhancement');

    if (!workspaceApiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Workspace API key is required for generating references. This key should come from the workspace creation response.' 
        },
        { status: 400 }
      );
    }

    // Build references array for batch generation
    const referencesArray = clientReferences
      .filter(ref => ref.companyName && ref.companyDomain && ref.industry) // Only include valid references
      .map(ref => {
        // Format the URL properly (add https:// if missing)
        const formattedUrl = ref.companyDomain.startsWith('http') 
          ? ref.companyDomain 
          : `https://${ref.companyDomain}`;

        // Build rich TEXT source for AI enhancement
        const textSource = `Company: ${ref.companyName}
Industry: ${ref.industry}
Website: ${formattedUrl}
${ref.successStory ? `Success Story: ${ref.successStory}` : ''}`;

        return {
          name: ref.companyName, // Optional name - will be used as entity name
          sources: [
            {
              type: 'TEXT',
              value: textSource
            },
            {
              type: 'URL',
              value: formattedUrl // AI will scrape and analyze the website
            }
          ]
        };
      });

    if (referencesArray.length === 0) {
      console.log('⚠️ No valid references to generate (all missing required fields)');
      return NextResponse.json({
        success: true,
        created: 0,
        total: 0,
        references: [],
        message: 'No valid references to generate'
      });
    }

    console.log(`🤖 Generating ${referencesArray.length} references with AI enhancement...`);

    try {
      const referenceRequest = {
        references: referencesArray,
        primaryOfferingOId: productOId,
        linkingStrategy: {
          mode: 'ALL'
        }
      };

      console.log('Reference generation request:', JSON.stringify(referenceRequest, null, 2));

      // Use workspace API key for batch generation
      const response = await axios.post(OCTAVE_REFERENCE_API_URL, referenceRequest, {
        headers: {
          'Content-Type': 'application/json',
          'api_key': workspaceApiKey
        }
      });

      console.log('🔍 FULL REFERENCE GENERATION RESPONSE:', JSON.stringify(response.data, null, 2));

      // Extract created references from response
      const createdReferences = response.data?.data?.map((refData: any, index: number) => {
        const originalRef = clientReferences.filter(r => r.companyName && r.companyDomain && r.industry)[index];
        return {
          index: index,
          companyName: refData.name || refData.internalName || originalRef.companyName,
          companyDomain: originalRef.companyDomain,
          industry: originalRef.industry,
          oId: refData.oId,
          data: refData
        };
      }) || [];

      console.log(`✅ Successfully generated ${createdReferences.length} references with AI enhancement`);

      return NextResponse.json({
        success: true,
        created: createdReferences.length,
        total: clientReferences.length,
        references: createdReferences,
        message: `Generated ${createdReferences.length} references with AI enhancement`
      });

    } catch (error: any) {
      console.error(`❌ Error generating references:`, error.response?.data || error.message);
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
    console.error('❌ Error in reference generation API:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to generate client references',
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}
