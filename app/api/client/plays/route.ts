import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Hardcoded play list - matches the requirements document
const HARDCODED_PLAYS = [
  // Allbound Plays (0000 codes)
  { code: '0001', name: 'Activities_Post-Call → Email Draft', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0002', name: 'Activities_Website Visitor → Helpful Outreach', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'In Progress' },
  { code: '0003', name: 'Activities_New Decision-Maker → Help Their Change', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
  { code: '0004', name: 'Activities_Funding Event → Real Value Outreach (SKIPPED)', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Completed' },
  { code: '0005', name: "Competitor's Client Growing → Provide Alternative", category: 'allbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
  { code: '0006', name: 'Prospect Job Change → Help Their Change', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'In Progress' },
  { code: '0007', name: 'Pricing Page → Proactive Objection Handling', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  { code: '0008', name: 'Discovery Meeting → Full Call Prep', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'REQUIRED' },
  { code: '0009', name: 'Meeting Confirmation → VSL', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'In Progress' },
  { code: '0010', name: 'Post-Call → Email Draft', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0011', name: 'Call Prep → Follow-up Meeting', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'REQUIRED' },
  { code: '0012', name: 'No-Show → Recovery Message', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'In Progress' },
  { code: '0013', name: 'Call Finished → Recap In CRM', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0014', name: 'Objections In Email → Draft Response', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'REQUIRED' },
  { code: '0015', name: 'Meeting → Automatically Assigned CRM To-Dos', category: 'allbound', documentation_status: 'Blocked', content_agent_status: 'Not Required' },
  { code: '0016', name: 'Competitor Client New Exec → Provide Alternative', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'In Progress' },
  { code: '0017', name: 'New Job Posting with Intent Trigger Key-Words -> Warm Outreach', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
  { code: '0018', name: 'Trigify Evergreen Campaign', category: 'allbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
  { code: '0019', name: 'Trigify Competitor Campaign', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  { code: '0020', name: 'Trigify LinkedIn Search Campaign', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  { code: '0021', name: 'Claire Call Review for Meetings with Prospects/Clients', category: 'allbound', documentation_status: 'Not Started', content_agent_status: 'Not Required' },
  
  // Nurture Plays (1000 codes)
  { code: '1001', name: "Books a meeting but doesn't show", category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1002', name: 'Books a meeting and asks for a quote/proposal, but ghosts', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1003', name: 'Meeting completed but unresponsive for 30 days', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1004', name: 'Closed/Lost deal beyond 60 days old', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1005', name: 'Existing Client Cross sell', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1006', name: 'Reaching out to COIs about affiliate program', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1007', name: 'Organizing a local in-person client dinner', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1008', name: 'Beta testing a new service/product/software', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1009', name: 'Lead generated, no meeting booked, unresponsive for 3 days', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'In Progress' },
  { code: '1010', name: 'Completes outbound campaign sequence, unresponsive for 7 days', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1011', name: 'Warm Lead Bad Timing → Nurture', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Placeholder For Review' },
  { code: '1012', name: 'Leads Not Subscribers → Convert To Subscribers', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1013', name: 'End of Month → Personalized Special Offer', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Blocked' },
  { code: '1014', name: 'Mid-Funnel → Report and Reply', category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1015', name: "Lead Heatmap → Auto-Prioritization Engine - Claire's Top 10", category: 'nurture', documentation_status: 'In Progress', content_agent_status: 'Not Required' },
  { code: '1018', name: 'Happy Client → Ask for Video Testimonial', category: 'nurture', documentation_status: 'Not Started', content_agent_status: 'In Progress' },
  
  // Outbound Plays (2000 codes)
  { code: '2001', name: 'Problem & Solution Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2002', name: 'Lead Magnet Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2003', name: 'Look-Alike Company Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2004', name: 'Look-Alike Role Campaign', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2005', name: 'Centres of Influence → Get Strategic or Referral Partners', category: 'outbound', documentation_status: 'Not Started', content_agent_status: 'REQUIRED' },
  { code: '2007', name: 'Local/Same City In Common Focus', category: 'outbound', documentation_status: 'Completed', content_agent_status: 'Completed' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'allbound', 'outbound', or 'nurture'
    
    // Filter plays by category if provided
    let plays = HARDCODED_PLAYS;
    if (category && ['allbound', 'outbound', 'nurture'].includes(category)) {
      plays = plays.filter(p => p.category === category);
    }
    
    // Note: Blocked plays are kept in the list but marked as unavailable in the frontend
    
    // Get play details from database if they exist (for future admin-managed plays)
    // Note: Plays endpoint doesn't require auth, but we'll try to get user for RLS
    const { user } = await getAuthenticatedUser(request);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Try to fetch from database, but fallback to hardcoded list
    const { data: dbPlays } = await supabase
      .from('claire_plays')
      .select('*')
      .eq('is_active', true);
    
    // Merge database plays with hardcoded (database takes precedence)
    const playMap = new Map();
    
    // Add hardcoded plays first
    plays.forEach(play => {
      playMap.set(play.code, {
        ...play,
        agent_name_pattern: play.code,
        questions: {
          personas: { required: true, multiSelect: false },
          useCases: { required: true, multiSelect: true },
          clientReferences: { required: false, multiSelect: true },
          // customInput removed - not used in play execution
        }
      });
    });
    
    // Override with database plays if they exist, but merge with hardcoded data to ensure correct names/categories
    if (dbPlays) {
      dbPlays.forEach(dbPlay => {
        // Find matching hardcoded play to ensure correct name and category
        const hardcodedPlay = HARDCODED_PLAYS.find(p => p.code === dbPlay.code);
        
        // Use hardcoded category as source of truth (it's the correct category)
        const correctCategory = hardcodedPlay?.category || dbPlay.category;
        
        // Only include database play if it matches the requested category filter
        // This prevents plays from appearing in wrong categories
        if (!category || correctCategory === category) {
          playMap.set(dbPlay.code, {
            ...dbPlay,
            // Override with hardcoded name and category if they exist (hardcoded is source of truth)
            name: hardcodedPlay?.name || dbPlay.name,
            category: correctCategory, // Always use hardcoded category as source of truth
            documentation_status: hardcodedPlay?.documentation_status || dbPlay.documentation_status,
            content_agent_status: hardcodedPlay?.content_agent_status || dbPlay.content_agent_status
          });
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      plays: Array.from(playMap.values())
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching plays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plays' },
      { status: 500 }
    );
  }
}

