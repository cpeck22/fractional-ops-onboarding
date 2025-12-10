import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Vercel Pro allows up to 300 seconds (5 min) - NOT 60 seconds
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

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

interface PlaybookResult {
  index: number;
  segmentName: string;
  playbookName: string;
  oId: string;
  referencesIncluded: number;
  referenceNames: string[];
  data: any;
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

    // Extract persona and use case oIds
    const personaOIds = personas.map(p => p.oId);
    const useCaseOIds = useCases.map(uc => uc.oId);

    // Helper function to create a single playbook
    const createSinglePlaybook = async (segment: PlaybookSegment, index: number): Promise<PlaybookResult> => {
      console.log(`📚 Creating playbook ${index + 1}/${segments.length} for segment: ${segment.name}`);

      // Filter references that match this segment's industry AND have valid oIds
      const matchingReferences = references.filter(ref => ref.industry === segment.name && ref.oId);
      const referenceOIds = matchingReferences.map(ref => ref.oId).filter(oId => oId);
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

      // Retry logic for creation
      let response;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) console.log(`📚 Attempt ${attempt}/${MAX_RETRIES} to create playbook ${segment.name}...`);
          
          response = await axios.post(OCTAVE_PLAYBOOK_API_URL, playbookRequest, {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            },
            timeout: 55000 // 55 second timeout per request
          });
          break; // Success
        } catch (err: any) {
          console.warn(`⚠️ Playbook creation attempt ${attempt} for ${segment.name} failed:`, err.message);
          
          const isRetryable = !err.response || (err.response.status >= 500) || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
          
          if (!isRetryable || attempt === MAX_RETRIES) {
            throw err;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }

      const playbookOId = response?.data?.playbook?.oId || response?.data?.oId;
      console.log(`✅ Created playbook: ${segment.name} Sales Playbook (${playbookOId})`);

      // Fetch full playbook details
      let fullPlaybookData = response?.data;
      
      if (playbookOId) {
        try {
          console.log(`📖 Fetching full playbook details for ${playbookOId}...`);
          const getResponse = await axios.get(
            `https://app.octavehq.com/api/v2/playbook/get?oId=${playbookOId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'api_key': workspaceApiKey
              },
              timeout: 30000
            }
          );
          fullPlaybookData = getResponse.data;
          console.log(`✅ Fetched full playbook data for ${segment.name}`);
        } catch (fetchError: any) {
          console.warn(`⚠️ Could not fetch full playbook details for ${segment.name}, using creation response.`);
        }
      }

      return {
        index,
        segmentName: segment.name,
        playbookName: `${segment.name} Sales Playbook`,
        oId: playbookOId,
        referencesIncluded: matchingReferences.length,
        referenceNames: referenceNames,
        data: fullPlaybookData
      };
    };

    // Create all playbooks in PARALLEL using Promise.allSettled
    console.log(`🚀 Creating ${segments.length} playbooks in parallel...`);
    
    const results = await Promise.allSettled(
      segments.map((segment, index) => createSinglePlaybook(segment, index))
    );

    // Process results
    const createdPlaybooks: PlaybookResult[] = [];
    const errors: { index: number; segmentName: string; error: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        createdPlaybooks.push(result.value);
      } else {
        const reason = result.reason as any;
        console.error(`❌ Error creating playbook ${index + 1}:`, reason?.response?.data || reason?.message);
        errors.push({
          index,
          segmentName: segments[index].name,
          error: reason?.response?.data?.message || reason?.message || 'Unknown error'
        });
      }
    });

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
