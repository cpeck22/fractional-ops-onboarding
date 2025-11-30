import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const OCTAVE_PLAYBOOK_API_URL = 'https://app.octavehq.com/api/v2/playbook/create';

interface PlaybookSegment {
  oId: string;
  name: string;
}

interface PlaybookReference {
  oId: string;
  companyName: string;
  industry: string;
}

interface PlaybookPersona {
  oId: string;
}

interface PlaybookUseCase {
  oId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      segments, 
      references, 
      personas, 
      useCases, 
      productOId, 
      workspaceApiKey 
    } = body as {
      segments: PlaybookSegment[];
      references: PlaybookReference[];
      personas: PlaybookPersona[];
      useCases: PlaybookUseCase[];
      productOId: string;
      workspaceApiKey: string;
    };

    console.log('📚 Creating playbooks in Octave');
    console.log('📚 Number of segments:', segments.length);
    console.log('📚 Number of references:', references.length);
    console.log('📚 Number of personas:', personas.length);
    console.log('📚 Number of use cases:', useCases.length);
    console.log('🔑 Using Workspace API Key:', workspaceApiKey ? `${workspaceApiKey.substring(0, 10)}...` : 'NOT PROVIDED');

    if (!workspaceApiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Workspace API key is required for creating playbooks.' 
        },
        { status: 400 }
      );
    }

    const createdPlaybooks = [];
    const errors = [];

    // Extract persona and use case oIds
    const personaOIds = personas.map(p => p.oId);
    const useCaseOIds = useCases.map(uc => uc.oId);

    // Create one playbook per segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      try {
        console.log(`📚 Creating playbook ${i + 1}/${segments.length} for segment: ${segment.name}`);

        // Filter references that match this segment's industry AND have valid oIds
        const matchingReferences = references.filter(ref => ref.industry === segment.name && ref.oId);
        const referenceOIds = matchingReferences.map(ref => ref.oId).filter(oId => oId); // Filter out nulls/undefined
        const referenceNames = matchingReferences.map(ref => ref.companyName);

        console.log(`📚 Found ${matchingReferences.length} matching references for ${segment.name}:`, referenceNames);
        console.log(`📚 Valid reference oIds:`, referenceOIds);

        // Generate key insight
        const keyInsight = matchingReferences.length > 0
          ? `Target ${segment.name} companies through ${personaOIds.length} key personas, addressing ${useCaseOIds.length} critical use cases. Proven success with ${referenceNames.join(', ')} in this market.`
          : `Target ${segment.name} companies through ${personaOIds.length} key personas, addressing ${useCaseOIds.length} critical use cases.`;

        const playbookRequest = {
          name: `${segment.name} Sales Playbook`,
          description: `Comprehensive sales playbook targeting ${segment.name} market segment`,
          keyInsight: keyInsight,
          type: 'SECTOR',
          productOId: productOId,
          segmentOId: segment.oId,
          personaOIds: personaOIds,
          useCaseOIds: useCaseOIds,
          referenceOIds: referenceOIds.length > 0 ? referenceOIds : undefined,
          createTemplates: true,
          status: 'active',
          referenceMode: referenceOIds.length > 0 ? 'specific' : 'none',
          proofPointMode: 'none'
        };

        console.log('📚 Playbook request:', JSON.stringify(playbookRequest, null, 2));

        // Use workspace API key
        const response = await axios.post(OCTAVE_PLAYBOOK_API_URL, playbookRequest, {
          headers: {
            'Content-Type': 'application/json',
            'api_key': workspaceApiKey
          }
        });

        const playbookOId = response.data?.playbook?.oId || response.data?.oId;
        
        console.log(`✅ Created playbook ${i + 1}: ${segment.name} Sales Playbook (${playbookOId})`);
        
        // Fetch full playbook details to get all fields (executive summary, approach angle, etc.)
        let fullPlaybookData = response.data;
        if (playbookOId) {
          try {
            console.log(`📖 Fetching full playbook details for ${playbookOId}...`);
            const getResponse = await axios.get(
              `https://app.octavehq.com/api/v2/playbook/get?oId=${playbookOId}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  'api_key': workspaceApiKey
                }
              }
            );
            fullPlaybookData = getResponse.data;
            console.log(`✅ Fetched full playbook data with all fields`);
          } catch (fetchError: any) {
            console.warn(`⚠️ Could not fetch full playbook details, using creation response:`, fetchError.message);
          }
        }
        
        createdPlaybooks.push({
          index: i,
          segmentName: segment.name,
          playbookName: `${segment.name} Sales Playbook`,
          oId: playbookOId,
          referencesIncluded: matchingReferences.length,
          referenceNames: referenceNames,
          data: fullPlaybookData
        });

      } catch (error: any) {
        console.error(`❌ Error creating playbook ${i + 1}:`, error.response?.data || error.message);
        errors.push({
          index: i,
          segmentName: segment.name,
          error: error.response?.data?.message || error.message
        });
      }
    }

    console.log(`✅ Successfully created ${createdPlaybooks.length} / ${segments.length} playbooks`);
    if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} playbooks failed:`, errors);
    }

    return NextResponse.json({
      success: true,
      created: createdPlaybooks.length,
      total: segments.length,
      playbooks: createdPlaybooks,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('❌ Error in playbook creation API:', error.response?.data || error.message);
    return NextResponse.json(
      { 
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create playbooks',
        details: error.response?.data
      },
      { status: 500 }
    );
  }
}

