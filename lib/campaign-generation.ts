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

    return completion.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('❌ OpenAI API error:', error);
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
