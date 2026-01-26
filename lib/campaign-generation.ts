import OpenAI from 'openai';

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.warn('⚠️ OPENAI_API_KEY not configured');
}

const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

/**
 * Generate campaign content using OpenAI
 * Replaces Context Agent calls with direct OpenAI API calls
 */
export async function generateCampaignContent(
  prompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' } | { type: 'text' };
  } = {}
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  const {
    model = 'gpt-4o-mini',
    temperature = 0.3,
    maxTokens = 4000,
    responseFormat = { type: 'text' }
  } = options;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B outbound campaign strategist and copywriter. You create highly effective, personalized outbound campaigns that drive meetings and revenue. You follow instructions precisely and output structured, actionable content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat.type === 'json_object' && { response_format: responseFormat })
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log(`✅ OpenAI response received (${content.length} chars)`);
    return content;
  } catch (error: any) {
    console.error('❌ OpenAI API error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Parse JSON from LLM response, handling markdown code blocks
 */
export function parseJsonResponse(response: string): any {
  try {
    // Try direct JSON parse first
    return JSON.parse(response);
  } catch {
    // Extract JSON from markdown code blocks
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                     response.match(/```\s*([\s\S]*?)\s*```/) ||
                     [null, response];
    const jsonStr = jsonMatch[1] || response;
    return JSON.parse(jsonStr);
  }
}

/**
 * Create a cleaned campaign brief by merging meeting_transcript, written_strategy, and additional_brief,
 * then filtering out irrelevant content using AI to keep only campaign-related information.
 */
export async function createCleanedCampaignBrief(
  campaignName: string,
  meetingTranscript: string | null,
  writtenStrategy: string | null,
  additionalBrief: string | null
): Promise<string> {
  // If no brief content exists, return empty
  if (!meetingTranscript && !writtenStrategy && !additionalBrief) {
    return '';
  }

  // Build merged brief with sections
  const mergedBrief = `
CAMPAIGN NAME: ${campaignName}

=== MEETING TRANSCRIPT ===
${meetingTranscript || '(No meeting transcript provided)'}

=== WRITTEN STRATEGY (Emails, Slack, Teams messages) ===
${writtenStrategy || '(No written strategy provided)'}

=== ADDITIONAL CAMPAIGN BRIEF ===
${additionalBrief || '(No additional brief provided)'}
`.trim();

  // If merged brief is too short or only contains placeholders, return as-is
  if (mergedBrief.length < 100 || mergedBrief.split('\n').filter(line => !line.includes('(No')).length < 3) {
    return mergedBrief;
  }

  // Use AI to clean and filter the brief
  const cleaningPrompt = `
You are cleaning a campaign brief for an outbound B2B campaign. Your task is to create a "Cleaned Campaign Brief" that:

1. KEEPS word-for-word ALL content that relates to the campaign:
   - Campaign objectives and goals
   - Target audience (companies, industries, personas, job titles)
   - Campaign messaging and positioning
   - Offers, assets, and value propositions
   - Hooks, touchpoints, and personalization elements
   - List building criteria and instructions
   - Conference names, events, locations mentioned
   - Specific instructions for the campaign

2. REMOVES content that is NOT related to the campaign:
   - General business discussions unrelated to this specific campaign
   - Other campaigns or projects mentioned
   - Administrative or operational details
   - Personal conversations or off-topic discussions
   - Technical details not relevant to campaign execution
   - Any content that doesn't help create campaign assets

3. PRESERVES the section structure:
   - Keep "=== MEETING TRANSCRIPT ===" section if it has relevant content
   - Keep "=== WRITTEN STRATEGY ===" section if it has relevant content
   - Keep "=== ADDITIONAL CAMPAIGN BRIEF ===" section if it has relevant content
   - If a section has no relevant content, you can omit it

4. MAINTAIN word-for-word accuracy for campaign-relevant content - do not paraphrase or summarize campaign details.

INPUT BRIEF TO CLEAN:
${mergedBrief}

OUTPUT FORMAT:
Return the cleaned brief with the same section structure, but with irrelevant content removed. Keep all campaign-relevant content word-for-word. If all content is relevant, return it as-is. If no content is relevant to the campaign, return "No campaign-relevant content found in the brief."
`;

  try {
    console.log('🧹 Creating cleaned campaign brief...');
    const cleanedBrief = await generateCampaignContent(cleaningPrompt, {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 8000
    });
    
    console.log('✅ Cleaned campaign brief created:', {
      originalLength: mergedBrief.length,
      cleanedLength: cleanedBrief.length,
      preview: cleanedBrief.substring(0, 200)
    });
    
    return cleanedBrief.trim();
  } catch (error: any) {
    console.error('❌ Error creating cleaned campaign brief:', error);
    console.warn('⚠️ Falling back to original merged brief');
    // Fallback to original merged brief if cleaning fails
    return mergedBrief;
  }
}
