import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const maxDuration = 60; // Set timeout to 60 seconds (allow time for multiple requests)
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { playbookOIds, workspaceApiKey } = await request.json();

    if (!workspaceApiKey || !playbookOIds || !Array.isArray(playbookOIds) || playbookOIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameters or invalid playbookOIds' },
        { status: 400 }
      );
    }

    console.log(`📖 Fetching ${playbookOIds.length} playbooks from Octave...`);

    const playbooks: any[] = [];
    
    // Fetch playbooks in parallel for better performance
    // Limit concurrency if needed, but for small batches (e.g. < 10), Promise.all is fine
    const fetchPromises = playbookOIds.map(async (oId) => {
      try {
        const response = await axios.get(
          `https://app.octavehq.com/api/v2/playbook/get?oId=${oId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'api_key': workspaceApiKey
            }
          }
        );
        
        const playbookData = response.data;
        const playbookInnerData = playbookData.data || {};
        
        return {
          oId: playbookData.oId,
          name: playbookData.name,
          description: playbookData.description,
          executiveSummary: playbookInnerData.executiveSummary,
          keyInsight: playbookData.keyInsight || playbookInnerData.keyInsight,
          approachAngle: playbookInnerData.approachAngle,
          valueProps: playbookInnerData.valueProps,
          qualifyingQuestions: playbookData.qualifyingQuestions || [],
          disqualifyingQuestions: playbookData.disqualifyingQuestions || [],
          type: playbookData.type,
          status: playbookData.status,
          segmentOId: playbookData.segmentOId,
          personaOIds: playbookData.personaOIds || [],
          useCaseOIds: playbookData.useCaseOIds || [],
          referenceOIds: playbookData.referenceOIds || []
        };
      } catch (error: any) {
        console.error(`⚠️ Failed to fetch playbook ${oId}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    
    // Filter out failed requests
    results.forEach(result => {
      if (result) {
        playbooks.push(result);
      }
    });

    console.log(`✅ Successfully fetched ${playbooks.length}/${playbookOIds.length} playbooks`);

    return NextResponse.json({
      success: true,
      playbooks
    });

  } catch (error: any) {
    console.error('❌ Error fetching playbooks:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

