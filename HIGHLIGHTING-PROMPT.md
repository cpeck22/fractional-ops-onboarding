# Highlighting Prompt Documentation

## Current Prompt (Full)

The current prompt is in `lib/output-highlighting.ts` starting at line 135. Here's the full prompt structure:

```typescript
const prompt = `You are an expert at analyzing marketing content and identifying which parts correspond to specific input elements.

**CRITICAL: YOU MUST PRESERVE EVERY SINGLE CHARACTER OF THE ORIGINAL OUTPUT. DO NOT ADD, REMOVE, OR MODIFY ANY TEXT, HEADERS, LABELS, STRUCTURE, OR FORMATTING.**

Your ONLY task is to wrap specific text segments with XML tags. You must NOT:
- Remove any headers, titles, or labels (e.g., "Day Zero Cold Call", "Subject Line:", "Body:", "0002", etc.)
- Change any formatting, line breaks, or structure
- Add or remove any content
- Modify any existing text

Your task is to analyze the OUTPUT content and identify which text segments correspond to:
1. **OCTAVE_ELEMENTS** (from library):
   - <persona> - References to the target persona (e.g., "CEOs", "CFOs", "Marketing Directors")
   - <segment> - Company size, industry, or demographic segments (e.g., "under $10M", "SaaS companies")
   - <usecase_outcome> - Desired outcomes/goals from use cases (e.g., "clean numbers", "better reporting")
   - <usecase_blocker> - Problems/blockers from use cases (e.g., "without living in QuickBooks", "gut feel")
   - <cta_leadmagnet> - Call-to-action or lead magnet references (e.g., "template", "guide", "Link here")

2. **OCTAVE_CONTENT_AGENT_PERSONALIZATION** (runtime/generated):
   - <personalization> - Personalized information like names, company names, specific details that were generated at runtime (e.g., "John", "McGreggor Law")

${playSpecificSection}

**RUNTIME CONTEXT PROVIDED:**
- Personas: ${personaNames}
- Use Cases: ${useCaseNames}
- Use Case Outcomes: ${useCaseOutcomes}
- Use Case Blockers: ${useCaseBlockers}
- Client References: ${referenceNames}

**STRICT INSTRUCTIONS:**
1. Read the OUTPUT content EXACTLY as provided
2. Identify text segments that semantically match the input elements above
3. Wrap ONLY those matching segments with XML tags (e.g., <persona>text</persona>)
4. DO NOT wrap headers, labels, titles, or structural elements
5. DO NOT modify, add, or remove ANY text
6. Preserve ALL original formatting, line breaks, HTML tags, headers, labels, and structure EXACTLY as they appear
7. If a segment could match multiple categories, choose the most specific one
8. Personalization tags should be used for specific names, companies, or details that appear to be dynamically inserted

**EXAMPLE OUTPUT FORMAT:**
${exampleOutput}

**OUTPUT TO ANALYZE (PRESERVE EVERYTHING EXACTLY AS IS, ONLY ADD TAGS):**
${outputContent}

**YOUR TASK:**
Return the EXACT OUTPUT content with ONLY semantic XML tags wrapping the identified segments. Every character, header, label, and structure must remain identical to the original.

**CRITICAL: DO NOT wrap your response in markdown code blocks. Return ONLY the content with XML tags, nothing else. Do not use triple backticks or any markdown formatting.**`;
```

## Issue Identified

The prompt says "semantically match" but doesn't provide enough guidance on HOW to identify:
- **Personas**: Who the target audience is (roles, titles, types of people)
- **Use Case Outcomes**: What they want to achieve (goals, desired results, objectives)
- **Use Case Blockers**: What's preventing them (problems, pain points, obstacles)

### Example Problem

For the text: **"Invention Prior Art Discovery related to identifying critical prior art. When we see that from IP law partners,"**

Should be highlighted as:
- `<usecase_outcome>Invention Prior Art Discovery</usecase_outcome>` - This is what they want to achieve
- `<usecase_outcome>identifying critical prior art</usecase_outcome>` - This is also an outcome/goal
- `<persona>IP law partners</persona>` - This is who the target audience is

But currently, none of these are being highlighted because the LLM doesn't understand the semantic relationship.

## Improved Prompt (Recommended)

The prompt needs to be more explicit about semantic matching. Here's what should be added:

```typescript
**HOW TO IDENTIFY SEMANTIC MATCHES:**

**PERSONA (<persona> tag):**
- Look for references to WHO the target audience is
- Examples: job titles ("CEOs", "CFOs", "Marketing Directors"), role descriptions ("IP law partners", "legal professionals"), industry roles ("law firm partners", "in-house counsel")
- Phrases like "when we see that from [X]" where [X] is a persona description
- Phrases describing the type of person or organization (e.g., "IP law partners", "mid-market companies", "B2B SaaS founders")
- DO NOT highlight company names (those are personalization) - only highlight role/type descriptions

**USE CASE OUTCOME (<usecase_outcome> tag):**
- Look for references to WHAT they want to achieve or accomplish
- Examples: goals ("clean numbers", "better reporting"), desired results ("complete confidence in patent applications"), objectives ("identifying critical prior art")
- Phrases describing outcomes, results, or goals (e.g., "Invention Prior Art Discovery", "maximize enforceable scope", "get to [outcome]")
- Action phrases that describe what they're trying to accomplish (e.g., "identifying critical prior art", "discovering prior art", "ensuring patent validity")
- Look for phrases that answer "what do they want?" or "what are they trying to achieve?"

**USE CASE BLOCKER (<usecase_blocker> tag):**
- Look for references to WHAT'S PREVENTING them or WHAT PROBLEMS they face
- Examples: problems ("without living in QuickBooks", "gut feel"), obstacles ("lack of resources"), pain points ("manual processes")
- Phrases describing challenges, problems, or things that are blocking progress
- Look for phrases that answer "what's preventing them?" or "what problems do they have?"

**SEGMENT (<segment> tag):**
- Look for company size, industry, or demographic descriptions
- Examples: "under $10M", "SaaS companies", "mid-market", "enterprise"
- Company characteristics that segment the audience

**CTA/LEAD MAGNET (<cta_leadmagnet> tag):**
- Look for offers, resources, links, or calls-to-action
- Examples: "template", "guide", "Link here", "scheduling link", "free assessment"

**PERSONALIZATION (<personalization> tag):**
- Look for specific names, company names, or dynamically inserted details
- Examples: "John", "McGreggor Law", specific company names, specific dates/times

**CRITICAL SEMANTIC MATCHING RULES:**
1. **Don't just look for exact matches** - the OUTPUT text may be paraphrased or reworded from the input variables
2. **Think about meaning, not just words** - "IP law partners" means the same as "IP attorneys" or "patent law professionals"
3. **Look for context clues** - Phrases like "when we see that from [X]" indicate [X] is a persona
4. **Outcomes vs Blockers**: Outcomes describe what they WANT (positive). Blockers describe what's PREVENTING them (negative/problem)
5. **Personas vs Segments**: Personas are WHO (people/roles). Segments are WHAT KIND OF COMPANY (size/industry)
6. **Be generous with highlighting** - If you're unsure between two categories, choose the more specific one, but DO highlight it
```

## Next Steps

1. **Fix async highlighting** - Add better error handling and ensure it completes
2. **Improve the prompt** - Add the semantic matching guidance above
3. **Add more examples** - Include examples specific to play 0002
