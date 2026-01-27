// Play descriptions for UI display
// These descriptions make plays more digestible and understandable for CEO clients

export const playDescriptions: Record<string, string> = {
  '0002': 'Reach out to qualified people who visited a problem-specific page on our site and use that signal and context to engage with them.',
  '0006': 'Reach out to people who have just moved into a new leadership role and help them think through the early wins and initiatives their seat will be judged on.',
  '0012': 'Reach out to people who missed a scheduled call, assume good intent, make it easy to reschedule, and follow up with value so the meeting feels worth their time.',
  '0016': 'Reach out to new executives at companies using a competitor and position us as a thoughtful alternative or overflow option when they reassess their setup.',
  '0018': 'Reach out to people who engaged with our founder\'s content and continue that topic privately with a practical resource and a light path into a deeper conversation.',
  '0019': 'Reach out to people who engaged with competitors\' content on the same problem and add perspective and value on that topic while quietly positioning our approach.',
  '0020': 'Reach out to people active in influencer or group discussions about our problem space and move them from public commentary into a focused, value-led dialogue.',
  '1009': 'Reach out to people who replied "yes, I\'m interested" but never scheduled and turn that intent into a specific time on the calendar.',
  '1011': 'Reach out to qualified leads who said "not now," identify the real constraint, and nurture that doubt with proof, tools, and better terms until timing shifts.',
  '1018': 'Reach out to current and past clients who achieved strong outcomes and invite them to record a short, relaxed video story you can reuse as proof.',
  '2001': 'Reach out to cold prospects around a clear problem they own and show them a straightforward path to their outcome that removes the blocker that usually stops them.',
  '2002': 'Reach out to cold prospects with a focused tool that helps them take the first step toward a result they want, then invite them to get help applying it.',
  '2003': 'Reach out to companies that resemble your best clients and use named, concrete case studies to show you\'ve already solved the same problem for peers.',
  '2004': 'Reach out to people in the same role as one of your successful champions and connect their KPIs and initiatives to outcomes you\'ve already delivered for that role.',
  '2008': 'Reach out to cold prospects with a multi-touch email sequence that builds trust through education, social proof, and personalized value delivery.',
  '2009': 'Reach out to known event attendees in your ICP before a conference and turn shared presence and topic interest into short, focused on-site meetings.',
  '2010': 'Reach out to event attendees after the conference and turn what they learned about the problem into a concrete plan to move their metrics and initiatives.',
};

export function getPlayDescription(code: string): string | undefined {
  return playDescriptions[code];
}
