import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { ClientReference } from '@/types';

const OCTAVE_REFERENCE_API_URL = 'https://api.octave.app/api/v2/reference/create';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientReferences, productOId, brandVoiceOId } = body as {
      clientReferences: ClientReference[];
      productOId: string;
      brandVoiceOId?: string;
    };

    console.log('📥 Creating client references in Octave');
    console.log('📥 Number of references:', clientReferences.length);
    console.log('📥 Product OId:', productOId);

    // Get API key from server environment
    const apiKey = process.env.OCTAVE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Octave API key not configured' },
        { status: 500 }
      );
    }

    const createdReferences = [];
    const errors = [];

    // Create each client reference
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

        const referenceRequest = {
          productOId: productOId,
          brandVoiceOId: brandVoiceOId || undefined,
          url: ref.companyDomain,
          companyName: ref.companyName,
          companyDomain: ref.companyDomain.replace(/^https?:\/\//, '').replace(/^www\./, ''),
          details: ref.successStory || `Client in ${ref.industry} industry`
        };

        console.log('Reference request:', JSON.stringify(referenceRequest, null, 2));

        const response = await axios.post(OCTAVE_REFERENCE_API_URL, referenceRequest, {
          headers: {
            'Content-Type': 'application/json',
            'api_key': apiKey
          }
        });

        console.log(`✅ Created reference ${i + 1}: ${ref.companyName} (${response.data.oId})`);
        createdReferences.push({
          index: i,
          companyName: ref.companyName,
          industry: ref.industry,
          oId: response.data.oId,
          data: response.data
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
    console.error('❌ Error in reference creation API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to create client references'
      },
      { status: 500 }
    );
  }
}

