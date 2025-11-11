import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { ClientReference } from '@/types';

const OCTAVE_REFERENCE_API_URL = 'https://app.octavehq.com/api/v2/reference/create';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientReferences, productOId, workspaceOId, workspaceApiKey } = body as {
      clientReferences: ClientReference[];
      productOId: string;
      workspaceOId?: string;
      workspaceApiKey: string;
    };

    console.log('📥 Creating client references in Octave (CREATE endpoint)');
    console.log('📥 Number of references:', clientReferences.length);
    console.log('📥 Product OId:', productOId);
    console.log('📥 Workspace OId:', workspaceOId);
    console.log('🔑 Using Workspace API Key:', workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...` : 'NOT PROVIDED');

    if (!workspaceApiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Workspace API key is required for creating references. This key should come from the workspace creation response.' 
        },
        { status: 400 }
      );
    }

    const createdReferences = [];
    const errors = [];

    // Create each client reference one-by-one
    for (let i = 0; i < clientReferences.length; i++) {
      const ref = clientReferences[i];
      
      // Skip if required fields are empty
      if (!ref.companyName || !ref.companyDomain || !ref.industry) {
        console.log(`⚠️ Skipping reference ${i + 1}: Missing required fields`);
        errors.push({
          index: i,
          error: 'Missing required fields (companyName, companyDomain, or industry)'
        });
        continue;
      }

      try {
        console.log(`📤 Creating reference ${i + 1}/${clientReferences.length}: ${ref.companyName}`);

        // Format the URL properly (add https:// if missing)
        const formattedUrl = ref.companyDomain.startsWith('http') 
          ? ref.companyDomain 
          : `https://${ref.companyDomain}`;

        // Build description with industry and URL
        const description = `${ref.industry} company. Website: ${formattedUrl}`;

        // Build the reference data object with only fields we have
        const referenceData: any = {
          howTheyUseProduct: ref.successStory || `Client in ${ref.industry} industry`,
        };

        // Add success story to howWeImpactedTheirBusiness if available
        if (ref.successStory) {
          referenceData.howWeImpactedTheirBusiness = [ref.successStory];
        }

        const referenceRequest = {
          name: ref.companyName, // External facing name (required)
          internalName: ref.companyName, // Internal name (same as external)
          description: description, // Description with industry and website
          data: referenceData, // Additional structured data
          linkingStrategy: {
            mode: 'ALL' // Link to all offerings
          }
        };

        console.log('Reference request:', JSON.stringify(referenceRequest, null, 2));

        // Use workspace API key (from builder response)
        const response = await axios.post(OCTAVE_REFERENCE_API_URL, referenceRequest, {
          headers: {
            'Content-Type': 'application/json',
            'api_key': workspaceApiKey // <-- WORKSPACE API KEY
          }
        });

        console.log(`✅ Created reference ${i + 1}: ${ref.companyName} (${response.data.data.oId})`);
        createdReferences.push({
          index: i,
          companyName: ref.companyName,
          industry: ref.industry,
          oId: response.data.data.oId,
          data: response.data.data
        });

      } catch (error: any) {
        console.error(`❌ Error creating reference ${i + 1}:`, error.response?.data || error.message);
        errors.push({
          index: i,
          companyName: ref.companyName,
          error: error.response?.data?.message || error.message
        });
      }
    }

    console.log(`✅ Successfully created ${createdReferences.length} / ${clientReferences.length} references`);
    if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} references failed:`, errors);
    }

    return NextResponse.json({
      success: true,
      created: createdReferences.length,
      total: clientReferences.length,
      references: createdReferences,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ Error in reference creation API:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create client references',
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}
