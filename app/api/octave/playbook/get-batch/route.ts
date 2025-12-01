import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const maxDuration = 60; // Set timeout to 60 seconds (allow time for multiple requests)
export const dynamic = 'force-dynamic';

interface PlaybookData {
  oId: string;
  name: string;
  description: string;
  executiveSummary?: string;
  keyInsight: string;
  approachAngle?: string;
  valueProps?: any;
  qualifyingQuestions: any[];
  disqualifyingQuestions: any[];
  type: string;
  status: string;
  segmentOId: string;
  personaOIds: string[];
  useCaseOIds: string[];
  referenceOIds: string[];
}

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

    // Fetch playbooks in parallel for better performance
    // Limit concurrency if needed, but for small batches (e.g. < 10), Promise.all is fine
    const fetchPromises = playbookOIds.map(async (oId: string) => {
      const MAX_RETRIES = 3;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await axios.get(
            `https://app.octavehq.com/api/v2/playbook/get?oId=${oId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                'api_key': workspaceApiKey
              },
              timeout: 30000 // 30 second timeout
            }
          );
          
          const playbookData = response.data;
          const playbookInnerData = playbookData.data || {};
          
          const result: PlaybookData = {
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
          return result;
        } catch (error: any) {
          // Only log warning if not final attempt
          if (attempt < MAX_RETRIES) {
            console.warn(`⚠️ Fetch attempt ${attempt} for ${oId} failed:`, error.message);
            // Backoff: 1s, 2s, ...
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          } else {
            console.error(`❌ Failed to fetch playbook ${oId} after ${MAX_RETRIES} attempts:`, error.message);
            return null;
          }
        }
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    
    // Filter out failed requests
    const playbooks = results.filter((result): result is PlaybookData => result !== null);

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
