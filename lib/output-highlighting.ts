import OpenAI from 'openai';

/**
 * Highlight output content using OpenAI to identify Octave elements and personalization
 * This uses semantic inference to match output text to input elements (persona, use cases, etc.)
 */
export async function highlightOutput(
  outputContent: string,
  runtimeContext: {
    personas?: Array<{ oId: string; name: string; description?: string }>;
    useCases?: Array<{ oId: string; name: string; desiredOutcome?: string; blocker?: string }>;
    clientReferences?: Array<{ oId: string; name: string }>;
  }
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.warn('⚠️ OPENAI_API_KEY not configured, skipping highlighting');
    return outputContent; // Return original content if no API key
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey
  });

  // Build context summary for the LLM
  const personaNames = runtimeContext.personas?.map(p => p.name).join(', ') || 'None';
  const useCaseNames = runtimeContext.useCases?.map(uc => uc.name).join(', ') || 'None';
  const useCaseOutcomes = runtimeContext.useCases?.map(uc => uc.desiredOutcome).filter(Boolean).join(', ') || 'None';
  const useCaseBlockers = runtimeContext.useCases?.map(uc => uc.blocker).filter(Boolean).join(', ') || 'None';
  const referenceNames = runtimeContext.clientReferences?.map(r => r.name).join(', ') || 'None';

  // CEO's example as few-shot learning
  const exampleOutput = `<HIGHLIGHTED_OUTPUT_EXAMPLE>
  <LEGEND>
    <OCTAVE_ELEMENTS>
      <persona>Persona</persona>
      <segment>Segment</segment>
      <usecase_outcome>Use Case (Desired Outcome)</usecase_outcome>
      <usecase_blocker>Use Case (Problem/Blocker)</usecase_blocker>
      <cta_leadmagnet>CTA (Lead Magnet)</cta_leadmagnet>
    </OCTAVE_ELEMENTS>
    <OCTAVE_CONTENT_AGENT_PERSONALIZATION>
      <personalization>Personalized / Claire Generated Info / Clay Info / etc</personalization>
    </OCTAVE_CONTENT_AGENT_PERSONALIZATION>
  </LEGEND>

  <EMAIL>
    <SUBJECT>
      How <persona>CEOs</persona> run the business on <usecase_outcome>clean numbers</usecase_outcome> <usecase_blocker>without living in QuickBooks</usecase_blocker>
    </SUBJECT>

    <BODY>
      Hi <personalization>John</personalization>,<br/><br/>

      Most <persona>CEOs</persona> I talk to <segment>under ~$10M</segment> want the same thing:
      <usecase_outcome>to run the business on clean, up-to-date numbers every month</usecase_outcome>
      instead of <usecase_blocker>gut feel</usecase_blocker>.<br/><br/>

      We've been working on a simple way around that:<br/>
      • Take all of the day-to-day bookkeeping off the <persona>CEO</persona>/ops plate<br/>
      • Close the books by the same date every month (e.g. by the 10th)<br/>
      • Deliver a one-page <persona>CEO</persona> finance snapshot (cash, profit, runway, key ratios) in plain English<br/><br/>

      Short version:
      <usecase_outcome>you forward invoices/receipts or keep using your tools as you do now; our team keeps the books current and sends you a monthly finance brief you can actually use to make decisions</usecase_outcome>.<br/><br/>

      If you'd like a bit more detail, I put this into a one-page
      <cta_leadmagnet>"Monthly Finance Snapshot" template</cta_leadmagnet>
      you can steal and run with your current team (<cta_leadmagnet>Link here</cta_leadmagnet>).<br/><br/>

      P.S. If your goal is to run <personalization>McGreggor Law</personalization> on
      <usecase_outcome>clean numbers each month</usecase_outcome>
      <usecase_blocker>without you living in QuickBooks</usecase_blocker>,
      I'm happy to walk through how our clients set this up in a short 20–30 minute working session.<br/><br/>

      If not, feel free to just swipe the <cta_leadmagnet>template</cta_leadmagnet>.
    </BODY>
  </EMAIL>
</HIGHLIGHTED_OUTPUT_EXAMPLE>`;

  const prompt = `You are an expert at analyzing marketing content and identifying which parts correspond to specific input elements.

Your task is to analyze the OUTPUT content and identify which text segments correspond to:
1. **OCTAVE_ELEMENTS** (from library):
   - <persona> - References to the target persona (e.g., "CEOs", "CFOs", "Marketing Directors")
   - <segment> - Company size, industry, or demographic segments (e.g., "under $10M", "SaaS companies")
   - <usecase_outcome> - Desired outcomes/goals from use cases (e.g., "clean numbers", "better reporting")
   - <usecase_blocker> - Problems/blockers from use cases (e.g., "without living in QuickBooks", "gut feel")
   - <cta_leadmagnet> - Call-to-action or lead magnet references (e.g., "template", "guide", "Link here")

2. **OCTAVE_CONTENT_AGENT_PERSONALIZATION** (runtime/generated):
   - <personalization> - Personalized information like names, company names, specific details that were generated at runtime (e.g., "John", "McGreggor Law")

**RUNTIME CONTEXT PROVIDED:**
- Personas: ${personaNames}
- Use Cases: ${useCaseNames}
- Use Case Outcomes: ${useCaseOutcomes}
- Use Case Blockers: ${useCaseBlockers}
- Client References: ${referenceNames}

**INSTRUCTIONS:**
1. Read the OUTPUT content carefully
2. Identify text segments that semantically match the input elements above
3. Wrap matching segments with the appropriate XML tags (e.g., <persona>text</persona>)
4. Be precise - only highlight text that clearly corresponds to the input elements
5. Preserve all original formatting, line breaks, and HTML tags
6. If a segment could match multiple categories, choose the most specific one
7. Personalization tags should be used for specific names, companies, or details that appear to be dynamically inserted

**EXAMPLE OUTPUT FORMAT:**
${exampleOutput}

**OUTPUT TO ANALYZE:**
${outputContent}

**YOUR TASK:**
Return the OUTPUT content with semantic XML tags wrapping the identified segments. Preserve all original formatting and structure.`;

  try {
    console.log('🎨 Starting output highlighting with OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert content analyst specializing in identifying semantic relationships between marketing content and input elements. You output clean, well-formatted XML with semantic tags."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 4000
    });

    const highlightedContent = completion.choices[0]?.message?.content || outputContent;
    
    console.log('✅ Highlighting completed successfully');
    
    return highlightedContent;
    
  } catch (error: any) {
    console.error('❌ Error highlighting output:', error.message);
    // Return original content if highlighting fails
    return outputContent;
  }
}

