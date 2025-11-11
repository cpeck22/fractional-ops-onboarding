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

    console.log('📥 Generating client references in Octave (NEW ENDPOINT)');
    console.log('📥 Number of references:', clientReferences.length);
    console.log('📥 Product OId:', productOId);
    console.log('📥 Workspace OId:', workspaceOId);
    console.log('🔑 Using Workspace API Key:', workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...` : 'NOT PROVIDED');

    if (!workspaceApiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Workspace API key is required for generating references. This key should come from the workspace creation response.' 
        },
        { status: 400 }
      );
    }

    // Transform our client references into Octave's generate format
    const references = clientReferences
      .filter(ref => ref.companyName && ref.companyDomain && ref.industry) // Only include valid refs
      .map(ref => {
        // Format the URL properly (add https:// if missing)
        const formattedUrl = ref.companyDomain.startsWith('http') 
          ? ref.companyDomain 
          : `https://${ref.companyDomain}`;

        // Build a rich text source with all context
        const textValue = [
          `Company: ${ref.companyName}`,
          `Industry: ${ref.industry}`,
          `Website: ${formattedUrl}`,
          ref.successStory ? `Success Story: ${ref.successStory}` : ''
        ].filter(Boolean).join('\n');

        return {
          name: ref.companyName, // Use company name as the reference name
          sources: [
            {
              type: 'URL',
              value: formattedUrl
            },
            {
              type: 'TEXT',
              value: textValue
            }
          ]
        };
      });

    if (references.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid client references to generate (missing required fields)'
      }, { status: 400 });
    }

    console.log(`📤 Generating ${references.length} client references in ONE API call`);
    console.log('Reference structure:', JSON.stringify(references, null, 2));

    const generateRequest = {
      primaryOfferingOId: productOId,
      linkingStrategy: {
        mode: 'ALL'
      },
      references: references
    };

    console.log('Generate request payload:', JSON.stringify(generateRequest, null, 2));

    // Call the new generate endpoint with the workspace API key
    const response = await axios.post(OCTAVE_REFERENCE_API_URL, generateRequest, {
      headers: {
        'Content-Type': 'application/json',
        'api_key': workspaceApiKey  // <-- USE WORKSPACE API KEY, NOT .ENV KEY
      }
    });

    console.log('✅ Generate References Response:', JSON.stringify(response.data, null, 2));

    const generatedReferences = response.data?.data || [];
    console.log(`✅ Successfully generated ${generatedReferences.length} / ${clientReferences.length} references`);

    return NextResponse.json({
      success: true,
      created: generatedReferences.length,
      total: clientReferences.length,
      references: generatedReferences
    });

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
