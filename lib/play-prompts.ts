/**
 * Play Prompts Configuration
 * Maps play codes to their agent IDs, prompt templates, and variable-to-highlight mappings
 * 
 * This enables the highlighting LLM to accurately identify which parts of the output
 * correspond to which variables from the CEO's prompts.
 */

export type HighlightCategory = 
  | 'persona'           // Light blue - Persona/ICP descriptions
  | 'segment'           // Light orange - Company segments
  | 'usecase_outcome'   // Light green - Desired outcomes
  | 'usecase_blocker'   // Light pink - Problems/blockers
  | 'cta_leadmagnet'    // Light yellow - CTAs and lead magnets
  | 'personalization';  // Light orange - Personalized/Claire generated info

export interface PlayPromptConfig {
  code: string;
  agentId: string;
  promptTemplate: string;
  variableMappings: Record<string, HighlightCategory>;
}

/**
 * Extract all variables from a prompt template (format: {{VARIABLE_NAME}} or {{Variable Name}})
 */
function extractVariables(prompt: string): string[] {
  // Match variables with underscores, spaces, or mixed case
  const variableRegex = /\{\{([A-Za-z0-9_\s–-]+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = variableRegex.exec(prompt)) !== null) {
    const varName = match[1].trim();
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }
  return variables;
}

/**
 * Play Prompts Configuration
 * Add new plays here with their agent IDs, prompts, and variable mappings
 */
export const PLAY_PROMPTS: Record<string, PlayPromptConfig> = {
  '0002': {
    code: '0002',
    agentId: 'ca_Q2MtCQAuQCmHilPWUYpyr',
    promptTemplate: `STRATEGY:
For de-anonymized, ICP-qualified website visitors, the play that works best should be:

Primary Goal:
Book a qualified meeting as fast as possible.
Rationale:
They've already done the hardest thing: paid attention and come to your site. This is "almost inbound," not cold.
In low-volume, high-ticket B2B, a single booked call is worth a lot more than the "risk" of being a bit assertive.
We treat this like a lead who filled out a form but didn't schedule. That is hot and deserves serious, front-loaded follow-up. 
The KPI for this play is booked meetings, not opens, clicks, or "engagement."

Secondary Goals (in order):
Get a reply or micro-yes (e.g. "send me the breakdown").
If no meeting, push them into long-term CRM nurture and wait for a re-engagement signal.
CHANNELS, TOUCHES, AND WHY
Given:
High intent (site visit).
They match {{ICP_DESCRIPTION}}.
You have phone coverage.
Low-volume, high-ticket model.

Here is the recommendation in the first 7 days after the visit:
Channels used:
Phone
Email
LinkedIn DM

8 touches in 7 days.
Front-loaded for maximum impact.
Most people spread their touches out evenly. That's a mistake.
You want to hit hard and fast when interest is highest.

The Exact Timing
Days 1–7:
Phone: 3 calls (Days 1, 3, 7)
Email: 3 emails (Days 1, 3, 7)
LinkedIn: 2 touches (Day 2 connection, Day 5 DM)
 
Days 8–60:  (still in cold email infrastructure, not CRM nurture):
Email 4 – Day 21
Email 5 – Day 35
Email 6 – Day 60

Total: 11 touches over ~60 days (front-loaded in first week).
 
Why It Works 
"More times, more ways" on follow-up increases connection and response; most people quit after 1–2 attempts. 
Lead Nurture for hot leads: front-load calls and contacts in the first days, then shift to value-first, lower-frequency follow-up. 
Best leads should be treated as best leads: de-anonymized ICP visitors get the highest intensity early. 
 
 When and Why You Mention The Website Signal 
Phone & Email:
Explicitly reference the website behavior.
"Someone from {COMPANY_NAME} was on our site looking at
{WEBSITE_SECTION_OR_TOPIC}" gives a legitimate, personalized reason for the interruption. 
For hot leads, we act like they raised their hand, even if they didn't fill a form.
LinkedIn:
Do NOT mention the tracking; use it as a trigger, not content.
LinkedIn is more public/relational. "We saw you on our site" feels creepy and harms trust.
We still time the outreach right after the visit, but base the message on role, company, and problem/outcome.
 
Call Script Philosophy
Lead with the reason for the call, not "Did I catch you at a bad time?"
Every branch has a next line, personalized and ready for your salesperson to read:
Busy vs not
Right person vs not
Yes vs  no / not now

—----------------------------------------------------------------------------------------------------------------------------------

Call 1 – Day 1
LIVE ANSWER SCRIPT:
"Hi {{FIRST_NAME}}, this is {{CALLER_NAME}} from {{YOUR_COMPANY_NAME}}.

The reason I'm calling is that someone from {{COMPANY_NAME}} was recently on our site looking at {{WEBSITE_SECTION_OR_TOPIC}} related to {{PRIMARY_PROBLEM_AREA}}. When we see that from {{ICP_DESCRIPTION}}, it's usually because you're at least exploring how to get to {{PRIMARY_OUTCOME}}.

Are you in the middle of something, or do you have 30 seconds for context so you can decide if this is worth a longer call later?"

BRANCH 1: IF THEY SAY "BUSY / NO TIME":
"Totally makes sense.

I can give you the 20‑second version and then you can decide if it's worth anything more, or we can find a better time for a {{CALL_LENGTH}}‑minute working session. What's better for you?"

BRANCH 1A: IF THEY CHOOSE "20 SECONDS":
"Great, I'll be quick.

When someone from {{COMPANY_NAME}} hits that {{WEBSITE_SECTION_OR_TOPIC}} page, we like to offer a complementary {{LOW_COMMITMENT_OFFER_FORMAT}}. We benchmark your current {{FUNCTION_OR_AREA}} against how similar {{ICP_DESCRIPTION}} are hitting {{PRIMARY_OUTCOME}}.

If that sounds useful, I can send over a couple of time options later this week. If not, no problem at all."

BRANCH 1B: IF THEY PREFER TO RESCHEDULE:
"No problem. Is {{SUGGESTED_DAY_TIME_OPTION_1}} or {{SUGGESTED_DAY_TIME_OPTION_2}} better for a {{CALL_LENGTH}}‑minute working session on {{PRIMARY_PROBLEM_AREA}}?"

BRANCH 2: IF THEY GIVE YOU A MOMENT NOW:
"Quick question first: are you the right person to talk to about {{PRIMARY_PROBLEM_AREA}} at {{COMPANY_NAME}}, or is there someone else who owns it?"

BRANCH 2A: IF THEY ARE THE RIGHT PERSON:
"Got it.

When people in your role hit that page, we usually offer a complementary {{LOW_COMMITMENT_OFFER_FORMAT}}. We take what we can see about {{COMPANY_NAME}} and show how your current {{FUNCTION_OR_AREA}} compares to what it typically takes to hit {{PRIMARY_OUTCOME}}.

It's {{CALL_LENGTH}} minutes, no pitch deck, just numbers and next steps if you're interested in exploring the solution further. Would {{SUGGESTED_DAY_TIME_OPTION_1}} or {{SUGGESTED_DAY_TIME_OPTION_2}} work better?"

BRANCH 2B: IF THEY ARE NOT THE RIGHT PERSON:
"Got it, thanks for letting me know.

Who owns {{PRIMARY_PROBLEM_AREA}} day to day so I don't bug the wrong person?

[Pause for answer]

How open-minded would you be to me forwarding a two-line blurb to {{NEW_CONTACT_NAME}} for context, and I'll copy you so you're in the loop?

What's the best email for {{NEW_CONTACT_NAME}} so I can send that over?"

VOICEMAIL (IF NO ANSWER):
"Hi {{FIRST_NAME}}, this is {{CALLER_NAME}} from {{YOUR_COMPANY_NAME}}.

Someone from {{COMPANY_NAME}} was recently looking at {{WEBSITE_SECTION_OR_TOPIC}} around {{PRIMARY_PROBLEM_AREA}}, and I wanted to see if it would be helpful to walk through how other {{ICP_DESCRIPTION}} are approaching that.

I'll send a quick email with a link where you can grab a time that works, in case you'd like to explore it.

Again, {{CALLER_NAME}} from {{YOUR_COMPANY_NAME}}."

—----------------------------------------------------------------------------------------------------------------------------------

Call 2 – Day 3

LIVE ANSWER SCRIPT:
"Hi {{FIRST_NAME}}, {{CALLER_NAME}} again from {{YOUR_COMPANY_NAME}}.

I called the other day because someone from {{COMPANY_NAME}} was checking out {{WEBSITE_SECTION_OR_TOPIC}}. I sent a note as well, and I wanted to make sure it didn't get lost.

Quick check: is {{PRIMARY_PROBLEM_AREA}} something you're actively working on this quarter, or more of a 'we know it's there but not yet' item?"

BRANCH 1: IF IT'S ACTIVE / NEAR-TERM:
"Got it. In that case, a {{CALL_LENGTH}}‑minute working session is usually the fastest way to see if {{CURRENT_STATE_DESCRIPTION}} can realistically support {{PRIMARY_OUTCOME}} and fit your budget.

I've got {{SUGGESTED_DAY_TIME_OPTION_1}} and {{SUGGESTED_DAY_TIME_OPTION_2}} open. Which one is closer to good for you?"

BRANCH 2: IF IT'S LATER / "NOT YET":
"Totally fair. How open-minded would you be to me sending you a couple of short resources that walk through how other {{ICP_DESCRIPTION}} think about {{PRIMARY_PROBLEM_AREA}} before they're ready to move, so you've got their reference points when it comes back up?"

BRANCH 3: IF THEY SAY "NOT INTERESTED / NOT RELEVANT":
"Appreciate the clarity. I'll make a note so we're not chasing you about something that's no longer a priority right now."

VOICEMAIL (IF NO ANSWER):
"Hey {{FIRST_NAME}}, {{CALLER_NAME}} from {{YOUR_COMPANY_NAME}}.

Following up on my last call about {{COMPANY_NAME}} exploring our {{WEBSITE_SECTION_OR_TOPIC}} solution.  I'll resend the email with a short explanation and a scheduling link – if you'd like to dig in, you can just pick whatever time works.

{{CALLER_NAME}}, {{YOUR_COMPANY_NAME}}."

—----------------------------------------------------------------------------------------------------------------------------------

Call 3 – Day 7

LIVE ANSWER SCRIPT:
"Hi {{FIRST_NAME}}, {{CALLER_NAME}} from {{YOUR_COMPANY_NAME}} one more time.

I've reached out a couple of times since someone from {{COMPANY_NAME}} was checking out {{WEBSITE_SECTION_OR_TOPIC}}. I don't want to be a bother, so this will be my last attempt.

Usually, when {{ICP_DESCRIPTION}} explore those solutions, they're at least considering options for {{PRIMARY_PROBLEM_AREA}}.

If that's true for you, we can do a quick {{CALL_LENGTH}}‑minute session sometime this or next week to see what {{FUNCTION_OR_AREA}} would need to look like to support {{PRIMARY_OUTCOME}}.

Would it make sense to set that up, or should I close the loop and let you reach out if it comes back up?"

BRANCH 1: IF THEY SAY "YES / MAYBE":
"Great. Is {{SUGGESTED_DAY_TIME_OPTION_1}} or {{SUGGESTED_DAY_TIME_OPTION_2}} better?"

BRANCH 2: IF THEY SAY "NOT NOW / NO":
"Understood. May I send you one of our most downloaded resources on {{PRIMARY_PROBLEM_AREA}}, and then you can reach out if it becomes a focus again?"

VOICEMAIL (IF NO ANSWER):
"Hi {{FIRST_NAME}}, {{CALLER_NAME}} from {{YOUR_COMPANY_NAME}}.

This is my last follow-up about {{COMPANY_NAME}}'s recent interest in {{WEBSITE_SECTION_OR_TOPIC}}. I'll send over a resource and a link where you can book a time if you ever want to revisit {{PRIMARY_PROBLEM_AREA}}.

{{CALLER_NAME}}, {{YOUR_COMPANY_NAME}}."

—----------------------------------------------------------------------------------------------------------------------------------

Email 1 – Day 1

SUBJECT:
{{YOUR_COMPANY_NAME}}


BODY:
Hi {{FIRST_NAME}},

Someone from {{COMPANY_NAME}} was recently exploring our {{WEBSITE_SECTION_OR_TOPIC}} solution related to {{PRIMARY_PROBLEM_AREA}}. When we see that from {{ICP_DESCRIPTION}}, it's usually a sign the team is actively thinking about how to reach {{PRIMARY_OUTCOME}}.

I have a complementary {{LOW_COMMITMENT_OFFER_FORMAT}} that's popular: We take what we can see about {{COMPANY_NAME}} and benchmark your current {{FUNCTION_OR_AREA}} against how similar {{ICP_DESCRIPTION}} are hitting {{PRIMARY_OUTCOME}}.

You leave with:

Where {{CURRENT_STATE_DESCRIPTION}} is strong
Where it's likely to bottleneck {{PRIMARY_OUTCOME}}
1–2 changes that would move the needle fastest

If you'd like that for {{COMPANY_NAME}}, you can pick a time here: {{SCHEDULING_LINK}}

If you'd rather start with something self-serve, here's a short {{RELEVANT_RESOURCE_TYPE}} called "{{RELEVANT_RESOURCE_NAME}}" you can run internally:
{{RELEVANT_RESOURCE_LINK}}

—----------------------------------------------------------------------------------------------------------------------------------

Email 2 – Day 3

SUBJECT:
Worth a quick {{LOW_COMMITMENT_OFFER_FORMAT}} for {{COMPANY_NAME}}?

BODY:
Hi {{FIRST_NAME}},

Following up on {{COMPANY_NAME}}'s interest in our {{WEBSITE_SECTION_OR_TOPIC}}.

When {{ICP_DESCRIPTION}} are exploring that solution, they usually fall into one of two buckets:

Actively working on {{PRIMARY_PROBLEM_AREA}} now with clear {{PRIMARY_OUTCOME}} targets.
Just gathering ideas for later.

If you're in bucket 1, a 20–30 minute {{LOW_COMMITMENT_OFFER_FORMAT}} is usually the fastest way to see if {{CURRENT_STATE_DESCRIPTION}} can realistically support those targets.

If you're in bucket 2, the "{{RELEVANT_RESOURCE_NAME}}" {{RELEVANT_RESOURCE_TYPE}} is often enough for a directionally correct view:
{{RELEVANT_RESOURCE_LINK}}

If/when you want to look at {{COMPANY_NAME}} specifically, you can grab a time here: {{SCHEDULING_LINK}}

—----------------------------------------------------------------------------------------------------------------------------------

Email 3 – Day 7

SUBJECT:
Closing the loop on {{COMPANY_NAME}}'s solution

BODY:
Hi {{FIRST_NAME}},

This will be my last follow-up this week about {{COMPANY_NAME}}'s exploration of our solution.

Given your role over {{FUNCTION_OR_AREA}}, if {{PRIMARY_PROBLEM_AREA}} ends up being one of the levers for {{PRIMARY_OUTCOME}}, our {{LOW_COMMITMENT_OFFER_FORMAT}} can give you a concrete view of what {{FUNCTION_OR_AREA}} needs to look like and where {{CURRENT_STATE_DESCRIPTION}} might slow you down.

Here's the link to book if you ever want that view: {{SCHEDULING_LINK}}

You can also keep using the "{{RELEVANT_RESOURCE_NAME}}" {{RELEVANT_RESOURCE_TYPE}} internally: {{RELEVANT_RESOURCE_LINK}}

—----------------------------------------------------------------------------------------------------------------------------------

Email 4 – Day 21

SUBJECT:
3 common failure points when {{PRIMARY_PROBLEM_AREA}} scales

BODY:
Hi {{FIRST_NAME}},

Sharing something we see a lot when {{ICP_DESCRIPTION}} push for {{PRIMARY_OUTCOME}} without changing {{FUNCTION_OR_AREA}}. The same three failure points show up over and over.

We broke them down here (short {{RELEVANT_RESOURCE_TYPE}}):
{{PATTERNS_RESOURCE_LINK}}

No need to reply – just something you can skim with your team when you revisit {{PRIMARY_PROBLEM_AREA}}.

—----------------------------------------------------------------------------------------------------------------------------------

Email 5 – Day 35

SUBJECT:
Example of how another {{ICP_DESCRIPTION}} approached {{PRIMARY_PROBLEM_AREA}}

BODY:
Hi {{FIRST_NAME}},

Quick anonymized example from another {{ICP_DESCRIPTION}}:

Their {{FUNCTION_OR_AREA}} looked like: {{EXAMPLE_INHERITED_STATE}}
They were aiming for: {{EXAMPLE_TARGETS}}
The main change that moved the needle was: {{EXAMPLE_KEY_CHANGE}}
We wrote it up here so you can see the pattern: {{CASE_STUDY_RESOURCE_LINK}}

If you ever want to map (or avoid) a similar pattern at {{COMPANY_NAME}}, you've got my details.

—----------------------------------------------------------------------------------------------------------------------------------

Email 6 – Day 60

SUBJECT:
Is {{PRIMARY_PROBLEM_AREA}} still on your roadmap this year?

BODY:
Hi {{FIRST_NAME}},

By now you probably know whether {{PRIMARY_PROBLEM_AREA}} is still on {{COMPANY_NAME}}'s priority list for this year.

If it is, this quick {{DIAGNOSTIC_RESOURCE_TYPE}} can help you see if {{CURRENT_STATE_DESCRIPTION}} can realistically support {{PRIMARY_OUTCOME}}, or if there are obvious gaps to address:
{{DIAGNOSTIC_RESOURCE_LINK}}

If it's not, feel free to keep this for when it moves back up the list.

—----------------------------------------------------------------------------------------------------------------------------------

LinkedIn 1 – Day 2 (Connection Request)

{{FIRST_NAME}} – I spend most of my time helping {{ICP_DESCRIPTION}} sort out {{PRIMARY_PROBLEM_AREA}} (things like {{PRIMARY_OUTCOME}}).

I put together a short {{RELEVANT_RESOURCE_TYPE}} on that topic that other {{ICP_DESCRIPTION}} have found useful – happy to send it over here once we're connected, in case it's relevant for {{COMPANY_NAME}}.

—-------------------------------------------------------------------------------------------------------- —--------------------------------------------------------------------------------------------------------

LinkedIn 2 – Day 5 (DM after Accept – value first)

Thanks for connecting, {{FIRST_NAME}}.

As promised, here's the {{RELEVANT_RESOURCE_TYPE}} on {{PRIMARY_PROBLEM_AREA}} we give to {{ICP_DESCRIPTION}} – it breaks down what tends to work (and not) as {{FUNCTION_OR_AREA}} scales toward {{PRIMARY_OUTCOME}}:

{{RELEVANT_RESOURCE_LINK}}

Use whatever's useful for {{COMPANY_NAME}}. If you ever want to walk through how your current setup compares to what's in there, happy to jam for 15–20 minutes.`,
    variableMappings: {
      // Personalization (purple) - Names, company-specific details, generated info
      'FIRST_NAME': 'personalization',
      'COMPANY_NAME': 'personalization',
      'CALLER_NAME': 'personalization',
      'YOUR_COMPANY_NAME': 'personalization',
      'WEBSITE_SECTION_OR_TOPIC': 'personalization',
      'FUNCTION_OR_AREA': 'personalization',
      'CURRENT_STATE_DESCRIPTION': 'personalization',
      'CALL_LENGTH': 'personalization',
      'SUGGESTED_DAY_TIME_OPTION_1': 'personalization',
      'SUGGESTED_DAY_TIME_OPTION_2': 'personalization',
      'NEW_CONTACT_NAME': 'personalization',
      'EXAMPLE_INHERITED_STATE': 'personalization',
      'EXAMPLE_KEY_CHANGE': 'personalization',
      
      // Persona (blue) - ICP descriptions
      'ICP_DESCRIPTION': 'persona',
      
      // Use Case Outcome (green) - Desired outcomes/goals
      'PRIMARY_OUTCOME': 'usecase_outcome',
      'EXAMPLE_TARGETS': 'usecase_outcome',
      
      // Use Case Blocker (pink) - Problems/blockers
      'PRIMARY_PROBLEM_AREA': 'usecase_blocker',
      
      // CTA/Lead Magnet (yellow) - Offers, resources, links
      'LOW_COMMITMENT_OFFER_FORMAT': 'cta_leadmagnet',
      'SCHEDULING_LINK': 'cta_leadmagnet',
      'RELEVANT_RESOURCE_TYPE': 'cta_leadmagnet',
      'RELEVANT_RESOURCE_NAME': 'cta_leadmagnet',
      'RELEVANT_RESOURCE_LINK': 'cta_leadmagnet',
      'PATTERNS_RESOURCE_LINK': 'cta_leadmagnet',
      'CASE_STUDY_RESOURCE_LINK': 'cta_leadmagnet',
      'DIAGNOSTIC_RESOURCE_TYPE': 'cta_leadmagnet',
      'DIAGNOSTIC_RESOURCE_LINK': 'cta_leadmagnet',
    }
  },
  
  '0003': {
    code: '0003',
    agentId: 'ca_c1qy7EuAXr8Z6TPujnycr',
    promptTemplate: `LinkedIn 1A - Day 1 - LinkedIn Connection Request
Congrats on stepping in as {{Title}} at {{Company}}.
I work with new {{Function}} leaders at {{ICP Company Description}}{{Describe What You Do}} so they can show a tangible win in their first 90 days.

Thought it might be useful to connect as you map your first‑year plan.




LinkedIn 1B - Day 1 LinkedIn DM
Congrats on the new role at {{Company}}, {{First Name}}.

Most new {{TitlePlural}} I talk to are juggling two clocks:
• 90 days to show clear movement
• 12 months to prove the board made the right call

We help {{ICP Company Description}} {{Describe What You Do}}, so new leaders can point to a concrete win in <90 days instead of waiting on new hires and process changes to ramp.

If I mapped a 1‑page 'first‑year systems plan' for {{Company}} around your lane, would that be useful or not a priority right now?




Email 1 – Day 3
Subject:
Congrats on the new role at {{Company}}

Body:
Hi {{First Name}},

Congrats on stepping in as {{Title}} at {{Company}}.

Most new {{TitlePlural}} I speak with are juggling two clocks:
- The board's 12‑month targets
- The 90‑day window to prove they picked the right leader

We help {{ICP Companies}} {{Describe Your Service/Product/Business Outcome}} in under 90 days, so new execs can show visible wins before the annual review.

If I put together a 1‑page ""first‑year systems plan"" tailored to {{Company}}, would you want to see it?




Email 2 – Day 7
Subject:
Your first 12 months at {{Company}}

Body:
Hi {{First Name}},

When new {{TitlePlural}} walk in, they're usually measured on some mix of:

- {{Metric 1 – e.g., new revenue / margin / efficiency}}
- {{Metric 2}}
- {{Metric 3}}

We {{Describe Your Service/Product/Business Outcome}}, so instead of waiting 6–12 months for new hires and process changes to ramp, you can show a concrete win in <90 days.

Would a quick 15‑minute ""how others hit their first‑year targets"" walkthrough be useful, or wrong timing?




Email 3 – Day 14
Subject:
7‑question systems check for {{Company}}

Body:
Hi {{First Name}},

I put together a simple 7‑question ""systems check"" I use with new {{Function}} leaders to spot:
- Where {{service area}} changes can free capacity fast
- Which parts of the org are blocking your targets
- What can realistically move in the next 90 days

Happy to send it over as a quick sanity check for your first‑year plan.

Want the checklist?




Email 4 – Day 21
Subject:
Close the loop?

Body:
Hi {{First Name}},

I know your first weeks in the seat are chaos.

Given you haven't replied, I'll assume one of three things:

1. You're already ahead of plan.
2. You're still in listen‑and‑learn mode.
3. This isn't a priority right now.

If it's #2, that's actually when our clients get the most value: we bolt a 90‑day system onto the plan you're already building, so you look good when results are reviewed.

Worth revisiting this in a few weeks, or should I close the loop?`,
    variableMappings: {
      // Personalization (purple) - Names, company-specific details, generated info
      'First Name': 'personalization',
      'Company': 'personalization',
      'Title': 'personalization',
      'TitlePlural': 'personalization',
      'Function': 'personalization',
      'service area': 'personalization',
      'Metric 1 – e.g., new revenue / margin / efficiency': 'personalization',
      'Metric 2': 'personalization',
      'Metric 3': 'personalization',
      
      // Persona (blue) - ICP descriptions
      'ICP Company Description': 'persona',
      'ICP Companies': 'persona',
      
      // Use Case Outcome (green) - Desired outcomes/goals
      'Describe What You Do': 'usecase_outcome',
      'Describe Your Service/Product/Business Outcome': 'usecase_outcome',
    }
  },
};

/**
 * Get prompt configuration for a specific play code
 */
export function getPlayPromptConfig(playCode: string): PlayPromptConfig | null {
  return PLAY_PROMPTS[playCode] || null;
}

/**
 * Get all variable names for a play, grouped by highlight category
 */
export function getVariablesByCategory(playCode: string): Record<HighlightCategory, string[]> {
  const config = getPlayPromptConfig(playCode);
  if (!config) return {
    persona: [],
    segment: [],
    usecase_outcome: [],
    usecase_blocker: [],
    cta_leadmagnet: [],
    personalization: [],
  };

  const grouped: Record<HighlightCategory, string[]> = {
    persona: [],
    segment: [],
    usecase_outcome: [],
    usecase_blocker: [],
    cta_leadmagnet: [],
    personalization: [],
  };

  Object.entries(config.variableMappings).forEach(([variable, category]) => {
    if (grouped[category]) {
      grouped[category].push(variable);
    }
  });

  return grouped;
}

/**
 * Get all variables for a play (extracted from prompt template)
 */
export function getAllVariables(playCode: string): string[] {
  const config = getPlayPromptConfig(playCode);
  if (!config) return [];
  return extractVariables(config.promptTemplate);
}

