'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ClaireImage from '../../Claire_v2.png';
import SectionIntro from '@/components/SectionIntro';
import StrategyTimer from '@/components/StrategyTimer';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface OctaveOutputs {
  id: string;
  company_name: string;
  company_domain: string;
  campaign_ideas: any[];
  prospect_list: any[];
  cold_emails: {
    personalizedSolutions: any[];
    leadMagnetShort: any[];
    localCity: any[];
    problemSolution: any[];
    leadMagnetLong: any[];
  };
  linkedin_posts: {
    inspiring: string;
    promotional: string;
    actionable: string;
  };
  linkedin_dms: {
    newsletter: string;
    leadMagnet: string;
    askQuestion: string;
  };
  newsletters: {
    tactical: string;
    leadership: string;
  };
  youtube_scripts: {
    longForm: string;
  };
  call_prep: any;
  // Library materials
  service_offering?: any;
  use_cases?: any[];
  personas?: any[];
  client_references?: any[];
  segments?: any[];
  competitors?: any[];
  created_at: string;
  workspace_api_key?: string;
}

interface ShareData {
  share_id: string;
  user_id: string;
  workspace_oid: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

const ErrorPlaceholder = ({ assetType }: { assetType: string }) => (
  <div className="bg-gradient-to-br from-fo-light to-white border-l-4 border-fo-orange rounded-lg p-6 shadow-sm">
    <div className="text-fo-orange mb-3 font-bold text-lg flex items-center gap-2">
      <span>⚠️</span>
      <span>Additional Information Required</span>
    </div>
    <p className="text-fo-text-secondary text-sm">
      I need more details to create <strong>{assetType}</strong> you&apos;d be happy with. If you need help with this, Book a Call, and we can fix it together.
    </p>
  </div>
);

export default function SharedStrategyPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [outputs, setOutputs] = useState<OctaveOutputs | null>(null);
  const [enrichedCampaignIdeas, setEnrichedCampaignIdeas] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [activeEmailTab, setActiveEmailTab] = useState('leadMagnetLong');
  const [activePostTab, setActivePostTab] = useState('inspiring');
  const [activeDMTab, setActiveDMTab] = useState('newsletter');
  const [activeNewsletterTab, setActiveNewsletterTab] = useState('tactical');
  const [activeSection, setActiveSection] = useState('campaign-workflows');

  useEffect(() => {
    const loadSharedStrategy = async () => {
      try {
        console.log('📤 Loading shared strategy:', shareId);

        // 1. Validate share link (server-side check via RLS)
        const { data: share, error: shareError } = await supabase
          .from('shared_strategies')
          .select('*')
          .eq('share_id', shareId)
          .single();

        if (shareError || !share) {
          console.error('❌ Share link not found or expired:', shareError);
          setExpired(true);
          setLoading(false);
          return;
        }

        // 2. Check expiration
        const now = new Date();
        const expiresAt = new Date(share.expires_at);
        if (now > expiresAt || !share.is_active) {
          console.log('❌ Strategy expired');
          setExpired(true);
          setLoading(false);
          return;
        }

        setShareData(share);
        console.log('✅ Share link valid, loading strategy...');

        // 3. Load strategy data (no auth required - public access)
        const { data: strategy, error: strategyError } = await supabase
          .from('octave_outputs')
          .select('*')
          .eq('user_id', share.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (strategyError || !strategy) {
          console.error('❌ Strategy not found:', strategyError);
          setExpired(true);
          setLoading(false);
          return;
        }

        console.log('✅ Strategy loaded successfully');
        setOutputs(strategy);
      } catch (error) {
        console.error('❌ Error loading shared strategy:', error);
        setExpired(true);
      } finally {
        setLoading(false);
      }
    };

    loadSharedStrategy();
  }, [shareId]);

  // Fetch fresh playbook data when outputs are loaded
  useEffect(() => {
    async function enrichPlaybooks() {
      if (!outputs?.campaign_ideas || outputs.campaign_ideas.length === 0) return;
      if (!outputs?.workspace_api_key) return;
      
      // Extract playbook oIds
      const playbookOIds = outputs.campaign_ideas
        .map((idea: any) => idea.oId)
        .filter((oId: string) => oId);
      
      if (playbookOIds.length === 0) return;
      
      console.log('🔄 Fetching fresh playbook data from Octave...');
      
      try {
        const response = await fetch('/api/octave/playbook/get-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playbookOIds,
            workspaceApiKey: outputs.workspace_api_key
          })
        });
        
        const result = await response.json();
        
        if (result.success && result.playbooks) {
          // Merge fresh data with existing campaign_ideas
          const enriched = outputs.campaign_ideas.map((idea: any) => {
            const freshData = result.playbooks.find((p: any) => p.oId === idea.oId);
            if (freshData) {
              return {
                ...idea,
                ...freshData,
                // Keep original fields that might not be in Octave response
                title: idea.title,
                segmentName: idea.segmentName,
                referencesIncluded: idea.referencesIncluded,
                referenceNames: idea.referenceNames
              };
            }
            return idea;
          });
          
          setEnrichedCampaignIdeas(enriched);
          console.log('✅ Successfully enriched playbook data');
        }
      } catch (error) {
        console.error('⚠️ Failed to enrich playbooks, using cached data:', error);
      }
    }
    
    enrichPlaybooks();
  }, [outputs]);

  // Scroll tracking for navigation
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'campaign-workflows',
        'prospect-list',
        'cold-emails',
        'linkedin-posts',
        'linkedin-dms',
        'newsletters',
        'youtube-scripts',
        'call-prep',
        'service-offering',
        'use-cases',
        'personas',
        'client-references',
        'segments',
        'competitors'
      ];

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-fo-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-fo-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading strategy...</p>
        </div>
      </div>
    );
  }

  if (expired || !shareData || !outputs) {
    return (
      <div className="min-h-screen bg-fo-light flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Strategy Expired</h1>
          <p className="text-gray-600 mb-6">
            This strategy link has expired or is no longer available.
          </p>
          <a
            href="https://meetings.hubspot.com/corey-peck/gtm-kickoff-call"
            className="inline-block px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark font-bold transition-all"
          >
            Book a GTM Kickoff Call
          </a>
        </div>
      </div>
    );
  }

  const sectionIntros = {
    campaignIdeas: [
      "Launching Marketing Campaigns",
      "Creating Sales Playbooks for the sales team",
      "Informing automatic follow-up email drafts",
      "Informing automatic CRM Call Prep notes",
      "Setting Parameters for automatic List Building and Prospecting",
      "Setting Parameters for automatic lead qualification",
      "Briefing marketers for creative assets, website changes, and content"
    ],
    prospectList: [
      "Building Targeted Lead Lists for Each Campaign",
      "Identifying Best-Fit Companies and Decision-Makers",
      "Automatically Researching Leads and Update CRM Records",
      "Validating Contact Information (email, mobile phone)",
      "Sending Personalized Outbound Emails",
      "Calling Verified Contacts",
      "Assigning Leads to Sales Reps",
      "Triggering CRM Workflows and Sequences"
    ],
    coldEmails: [
      "Automatically writing Email Sequences for Each Campaign",
      "Automatically Personalizing Emails (Role, Industry, Pain, Use Case, etc)",
      "Referencing The Most Relevant Case Studies for each prospect",
      "Adjusting Tone and Style automatically",
      "A/B Testing Different Messaging Variants",
      "Loading Email Sequences into email Sequencers or CRM",
      "Triggering Automated Follow-Up Based on Engagement",
      "Triggering Automated Lead or Deal creation on Engagement",
      "Providing Sales Reps with Pre-Written personalized Messaging to speed up Manual Outreach"
    ],
    linkedinPosts: [
      "Writing LinkedIn Posts That Match Campaign Messaging",
      "Publishing Thought Leadership While Campaigns Are Live",
      "Reinforcing Cold Email Messaging with Social Content",
      "Aligning Website, LinkedIn, and Sales Language",
      "Increasing Trust and Awareness with Asynchronous Buyers",
      "Scheduling Campaign-Aligned Posts on Personal and Company Pages",
      "Driving Inbound Interest from Prospects Who Don't Respond Directly",
      "Giving Reps Social Content to Repost or Reference in DMs"
    ],
    linkedinDMs: [
      "Connecting with Target Prospects via LinkedIn",
      "Sending Connection Requests to Website Visitors",
      "Liking Recent Posts to Warm Up New Connections",
      "Sending First-Response DMs After Connection is Accepted",
      "Aligning LinkedIn Messaging with Active Campaigns",
      "Personalizing Outreach Based on Role, Company, or Behavior",
      "Handing Off Engaged Prospects to Sales Reps for Follow-Up",
      "Updating Future DMs Based on real-world Feedback and Results"
    ],
    newsletters: [
      "Automatically Writing Newsletters That Align with Active Campaigns",
      "Sending Value-Add Content to New Connections and Website Visitors",
      "Educating Prospects During the Buyer Journey",
      "Move prospect attention from a \"rented\" to \"owned\" audience",
      "Giving a value-first reason to reach out to stalled Deals",
      "Building Trust and Familiarity Before Direct Outreach",
      "Nurturing Cold or Passive Leads Over Time",
      "Giving Reps Content to Reference in Follow-Up Messages"
    ],
    youtubeScripts: [
      "Creating Long-Form Video Scripts for YouTube",
      "Aligning Video Content with Active Campaigns",
      "Educating Prospects Through Video Content",
      "Building Trust and Authority Through Thought Leadership",
      "Repurposing Sales Messaging into Video Format",
      "Driving Traffic to Landing Pages or Lead Magnets",
      "Creating Evergreen Content for SEO and Discovery",
      "Giving Prospects a Different Way to Engage with Your Message"
    ],
    callPrep: [
      "Auto-Generating Call Prep Notes for Booked Meetings",
      "Researching Companies and Contacts Before Sales Calls",
      "Inserting Prep Notes Directly into CRM Records",
      "Tailoring Prep Notes to match your notetakers Sales Methodology - Create personalized Discovery Questions",
      "Proposing most likely Pain Points, Solutions, and Use Cases",
      "Giving links to the most relevant Case Studies (to quickly screen share or drop in the chat during meetings)",
      "Suggesting Talking Points Based on Campaign Context",
      "Standardizing Pre-Call Research Across the Team",
      "Personalized sales battlecard for each meeting (the likely objections with a script on how to handle each one)"
    ]
  };

  const tocSections = [
    { id: 'campaign-workflows', label: 'Campaign Ideas' },
    { id: 'prospect-list', label: 'Prospect List' },
    { id: 'cold-emails', label: 'Cold Email Sequences' },
    { id: 'linkedin-posts', label: 'LinkedIn Posts' },
    { id: 'linkedin-dms', label: 'LinkedIn DMs' },
    { id: 'newsletters', label: 'Newsletter Content' },
    { id: 'youtube-scripts', label: 'YouTube Video Scripts' },
    { id: 'call-prep', label: 'Call Prep' },
  ];

  const appendixSections = [
    { id: 'service-offering', label: 'Service Offering', key: 'service_offering' },
    { id: 'use-cases', label: 'Use Cases', key: 'use_cases' },
    { id: 'personas', label: 'Personas', key: 'personas' },
    { id: 'client-references', label: 'Client References', key: 'client_references' },
    { id: 'segments', label: 'Segments', key: 'segments' },
    { id: 'competitors', label: 'Competitors', key: 'competitors' },
    { id: 'playbooks', label: 'Playbooks', key: 'campaign_ideas' },
  ];

  const emailTabs = [
    { id: 'leadMagnetLong', label: 'Lead Magnet (Long)' },
    { id: 'personalizedSolutions', label: '3 Personalized Solutions' },
    { id: 'problemSolution', label: 'Problem/Solution' },
    { id: 'localCity', label: 'Local/Same City' },
    { id: 'leadMagnetShort', label: 'Lead Magnet (Short)' },
  ];

  const postTabs = [
    { id: 'inspiring', label: 'Inspiring' },
    { id: 'promotional', label: 'Promotional' },
    { id: 'actionable', label: 'Actionable' },
  ];

  const dmTabs = [
    { id: 'newsletter', label: 'Newsletter' },
    { id: 'leadMagnet', label: 'Lead Magnet' },
    { id: 'askQuestion', label: 'Ask A Question' },
  ];

  const newsletterTabs = [
    { id: 'tactical', label: 'Tactical' },
    { id: 'leadership', label: 'Leadership' },
  ];

  return (
    <div className="min-h-screen bg-fo-light select-none">
      {/* Header with Timer */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Image 
                src={ClaireImage} 
                alt="Claire" 
                width={80} 
                height={80} 
                className="rounded-full"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {outputs.company_name}&apos;s Sales Plan
                </h1>
                <p className="text-fo-dark text-sm mt-1">
                  Actionable systems. Fast results. No drama.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Built by Claire • {new Date(outputs.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            {/* Timer */}
            <StrategyTimer expiresAt={shareData.expires_at} showCTA={true} />
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 flex-shrink-0 sticky top-8 self-start hidden lg:block">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Contents</h3>
              <ul className="space-y-2">
                {tocSections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-fo-primary text-white font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
                <li className="pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-2 px-3">STRATEGIC ELEMENTS</p>
                  {appendixSections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-fo-primary text-white font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {section.label}
                    </a>
                  ))}
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0 space-y-12">
            {/* Campaign Ideas Section */}
            <section id="campaign-workflows" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Campaign Ideas</h2>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.campaignIdeas}
                sectionId="campaign-workflows"
                videoUrl="https://drive.google.com/file/d/13W9LlvCvqBzOl_5R81yeZCLJ9tusC2RW/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                
                {outputs.campaign_ideas && outputs.campaign_ideas.length > 0 ? (
                  <div className="space-y-6">
                    {outputs.campaign_ideas.map((campaign: any, index: number) => (
                      <div key={index} className="border-l-4 border-fo-primary pl-6 py-2">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{campaign.title}</h3>
                        <p className="text-gray-700">{campaign.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ErrorPlaceholder assetType="Campaign Ideas" />
                )}
              </div>
            </section>

            {/* Prospect List Section */}
            <section id="prospect-list" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Prospect List</h2>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.prospectList}
                sectionId="prospect-list"
                videoUrl="https://drive.google.com/file/d/1t6tnBLxzvTkQXoW6ErnmDKMPwGyTq4sp/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                
                {outputs.prospect_list && outputs.prospect_list.length > 0 ? (
                  <>
                    {(() => {
                      // Prioritize prospects by contact information availability
                      const prioritizedList = [...outputs.prospect_list].sort((a: any, b: any) => {
                        // Priority 1: Both email and phone
                        const aPriority1 = (a.email && a.mobile_number) ? 1 : 0;
                        const bPriority1 = (b.email && b.mobile_number) ? 1 : 0;
                        
                        // Priority 2: Email only
                        const aPriority2 = (a.email && !a.mobile_number) ? 1 : 0;
                        const bPriority2 = (b.email && !b.mobile_number) ? 1 : 0;
                        
                        // Priority 3: Phone only
                        const aPriority3 = (!a.email && a.mobile_number) ? 1 : 0;
                        const bPriority3 = (!b.email && b.mobile_number) ? 1 : 0;
                        
                        // Calculate priority scores (higher is better)
                        const aScore = aPriority1 * 4 + aPriority2 * 3 + aPriority3 * 2;
                        const bScore = bPriority1 * 4 + bPriority2 * 3 + bPriority3 * 2;
                        
                        return bScore - aScore;
                      });

                      return (
                        <div className="space-y-4">
                          {prioritizedList.map((prospect: any, index: number) => {
                            return (
                              <div key={index} className="bg-gray-50 p-5 rounded-lg border border-gray-200 hover:border-fo-primary transition-colors">
                                <div className="grid md:grid-cols-2 gap-4">
                                  {/* Left: Basic Info */}
                                  <div>
                                    <p className="font-semibold text-fo-primary text-lg">{prospect.name || `Prospect ${index + 1}`}</p>
                                    <p className="text-sm text-gray-700 mt-1">{prospect.title || 'N/A'}</p>
                                    <p className="text-sm text-gray-600 mt-1">{prospect.company || 'N/A'}</p>
                                    {prospect.location && (
                                      <p className="text-xs text-gray-500 mt-1">{prospect.location}</p>
                                    )}
                                    
                                    {/* LinkedIn */}
                                    {prospect.linkedIn && (
                                      <a 
                                        href={prospect.linkedIn} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 text-xs inline-flex items-center gap-1 mt-2"
                                      >
                                        <span>LinkedIn Profile</span>
                                        <span>→</span>
                                      </a>
                                    )}
                                  </div>
                                  
                                  {/* Right: Contact Info */}
                                  <div className="space-y-3">
                                    {/* Email */}
                                    {prospect.email ? (
                                      <div className="flex items-start gap-2">
                                        <span className="text-green-600 text-sm font-bold">✓</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs text-gray-500 font-semibold">Email</div>
                                          <a 
                                            href={`mailto:${prospect.email}`}
                                            className="text-sm text-fo-primary hover:underline break-all font-medium"
                                          >
                                            {prospect.email}
                                          </a>
                                          {prospect.email_status && (
                                            <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                                              prospect.email_status === 'valid' || prospect.email_status === 'valid_catch_all' ? 'bg-green-100 text-green-700' :
                                              'bg-gray-100 text-gray-600'
                                            }`}>
                                              {prospect.email_status === 'valid_catch_all' ? 'valid' : prospect.email_status.replace('_', ' ')}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-400 text-sm">✗</span>
                                        <div className="flex-1">
                                          <div className="text-xs text-gray-500">Email</div>
                                          <div className="text-sm text-gray-400">Not found</div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Mobile */}
                                    {prospect.mobile_number ? (
                                      <div className="flex items-start gap-2">
                                        <span className="text-green-600 text-sm font-bold">✓</span>
                                        <div className="flex-1">
                                          <div className="text-xs text-gray-500 font-semibold">Mobile Phone</div>
                                          <a 
                                            href={`tel:${String(prospect.mobile_number).startsWith('+') ? prospect.mobile_number : `+${prospect.mobile_number}`}`}
                                            className="text-sm text-fo-primary hover:underline font-medium"
                                          >
                                            {String(prospect.mobile_number).startsWith('+') ? prospect.mobile_number : `+${prospect.mobile_number}`}
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-400 text-sm">✗</span>
                                        <div className="flex-1">
                                          <div className="text-xs text-gray-500">Mobile Phone</div>
                                          <div className="text-sm text-gray-400">Not found</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <ErrorPlaceholder assetType="Prospect List" />
                )}
              </div>
            </section>

            {/* Cold Emails Section */}
            <section id="cold-emails" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Cold Email Sequences</h2>
                </div>
                <div className="flex items-center gap-4">
                  <Image
                    src="/Gmail_icon_(2020).svg.webp"
                    alt="Gmail"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                  <Image
                    src="/Outlook-Logo.png"
                    alt="Outlook"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.coldEmails}
                sectionId="cold-emails"
                videoUrl="https://drive.google.com/file/d/1V3T8gd6-y5OVB8nW0L9_9pjpqEAKzEda/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">

                {outputs.cold_emails ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                      {emailTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveEmailTab(tab.id)}
                          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                            activeEmailTab === tab.id
                              ? 'border-fo-primary text-fo-primary'
                              : 'border-transparent text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {outputs.cold_emails[activeEmailTab as keyof typeof outputs.cold_emails]?.map((email: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <div className="mb-3">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Email {index + 1}</span>
                            <h3 className="font-semibold text-lg text-gray-900 mt-1">{email.subject}</h3>
                          </div>
                          <div className="prose prose-sm max-w-none text-gray-700 [&_p]:mb-4 [&_p]:leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {email.email || email.body}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <ErrorPlaceholder assetType="Cold Email Sequences" />
                )}
              </div>
            </section>

            {/* LinkedIn Posts Section */}
            <section id="linkedin-posts" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">LinkedIn Posts</h2>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.linkedinPosts}
                sectionId="linkedin-posts"
                videoUrl="https://drive.google.com/file/d/1q0SdjYjxpjfipFiYSGoL5QAPzqWZS-o0/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">

                {outputs.linkedin_posts ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                      {postTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActivePostTab(tab.id)}
                          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                            activePostTab === tab.id
                              ? 'border-fo-primary text-fo-primary'
                              : 'border-transparent text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <div className="prose prose-lg max-w-none text-gray-900 whitespace-pre-wrap">
                        {outputs.linkedin_posts[activePostTab as keyof typeof outputs.linkedin_posts]}
                      </div>
                    </div>
                  </>
                ) : (
                  <ErrorPlaceholder assetType="LinkedIn Posts" />
                )}
              </div>
            </section>

            {/* LinkedIn DMs Section */}
            <section id="linkedin-dms" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">LinkedIn DMs</h2>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.linkedinDMs}
                sectionId="linkedin-dms"
                videoUrl="https://drive.google.com/file/d/108EHJ-Edh_YiXPw0AgkoTg5W5jkyyvQs/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">

                {outputs.linkedin_dms ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                      {dmTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveDMTab(tab.id)}
                          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                            activeDMTab === tab.id
                              ? 'border-fo-primary text-fo-primary'
                              : 'border-transparent text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <div className="prose prose-lg max-w-none text-gray-900 [&_p]:mb-6 [&_p]:leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {outputs.linkedin_dms[activeDMTab as keyof typeof outputs.linkedin_dms]
                            ?.replace(/\\n/g, '\n')
                            .replace(/(\r\n|\r|\n)/g, '\n\n')
                            .trim()}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </>
                ) : (
                  <ErrorPlaceholder assetType="LinkedIn DMs" />
                )}
              </div>
            </section>

            {/* Newsletter Section */}
            <section id="newsletters" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Newsletter Content</h2>
                </div>
                <div className="flex items-center gap-4">
                  <Image
                    src="/HubSpot-Symbol.png"
                    alt="HubSpot"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                  <Image
                    src="/Salesforce.com_logo.svg.png"
                    alt="Salesforce"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                  <div className="px-3 py-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white font-bold rounded text-sm">
                    Kit
                  </div>
                </div>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.newsletters}
                sectionId="newsletters"
                videoUrl="https://drive.google.com/file/d/1vtxH3UXdzaS8R99dRaPcy3Op1d1SxQWJ/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">

                {outputs.newsletters ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                      {newsletterTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveNewsletterTab(tab.id)}
                          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                            activeNewsletterTab === tab.id
                              ? 'border-fo-primary text-fo-primary'
                              : 'border-transparent text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      <div className="prose prose-lg max-w-none text-gray-900 [&_p]:mb-6 [&_p]:leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {outputs.newsletters[activeNewsletterTab as keyof typeof outputs.newsletters]
                            ?.replace(/\\n/g, '\n')
                            .replace(/(\r\n|\r|\n)/g, '\n\n')
                            .trim()}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </>
                ) : (
                  <ErrorPlaceholder assetType="Newsletter Content" />
                )}
              </div>
            </section>

            {/* YouTube Scripts Section */}
            <section id="youtube-scripts" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">YouTube Video Scripts</h2>
                </div>
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.youtubeScripts}
                sectionId="youtube-scripts"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">

                {outputs.youtube_scripts?.longForm ? (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="prose prose-lg max-w-none text-gray-900 [&_p]:mb-6 [&_p]:leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {outputs.youtube_scripts.longForm
                          ?.replace(/\\n/g, '\n')
                          .replace(/(\r\n|\r|\n)/g, '\n\n')
                          .trim()}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <ErrorPlaceholder assetType="YouTube Video Scripts" />
                )}
              </div>
            </section>

            {/* Call Prep Section */}
            <section id="call-prep" className="scroll-mt-8">
              {/* Section Title */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Call Prep</h2>
              </div>

              <SectionIntro
                whatIsThisFor={sectionIntros.callPrep}
                sectionId="call-prep"
                videoUrl="https://drive.google.com/file/d/1XYNwjRicEUyPlO3Jp9KuzQjLuOhSOQ2W/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">

                {outputs.call_prep ? (
                  <div className="space-y-6">
                    {outputs.call_prep.callScript && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Call Script:</h3>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <div className="prose prose-lg max-w-none text-gray-900 [&_p]:mb-6 [&_p]:leading-relaxed">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node, ...props }) => {
                                  const text = String(props.children);
                                  if (
                                    text.startsWith('Questions:') ||
                                    text.endsWith('?') ||
                                    /^[-•]\s*(.+\?)$/.test(text)
                                  ) {
                                    return (
                                      <p className="font-bold italic text-fo-primary border-l-4 border-fo-primary pl-4 py-1 my-3 text-lg">
                                        {props.children}
                                      </p>
                                    );
                                  }
                                  return <p {...props} />;
                                },
                                li: ({ node, ...props }) => {
                                  const text = String(props.children);
                                  if (text.endsWith('?')) {
                                    return (
                                      <li className="font-bold italic text-fo-primary border-l-4 border-fo-primary pl-4 py-1 my-3 text-lg">
                                        {props.children}
                                      </li>
                                    );
                                  }
                                  return <li {...props} />;
                                },
                              }}
                            >
                              {outputs.call_prep.callScript
                                .replace(/\\n/g, '\n')
                                .replace(/(\r\n|\r|\n)/g, '\n\n')
                                .trim()}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}

                    {outputs.call_prep.objectionHandling && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Objection Handling:</h3>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <div className="prose prose-lg max-w-none text-gray-900 [&_p]:mb-6 [&_p]:leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {outputs.call_prep.objectionHandling
                                .replace(/\\n/g, '\n')
                                .replace(/(\r\n|\r|\n)/g, '\n\n')
                                .trim()}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <ErrorPlaceholder assetType="Call Prep" />
                )}
              </div>
            </section>

            {/* Strategic Elements Library */}
            <div className="border-t-4 border-fo-primary pt-12 mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Strategic Elements Library</h2>
              <p className="text-gray-600 mb-8">
                Foundational library materials created in your Octave workspace
              </p>

              <div className="space-y-8">
                {/* Service Offering - FULL DETAIL */}
                {outputs.service_offering && (
                  <div id="service-offering" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Service Offering
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold text-gray-700">Name:</p>
                        <p className="text-gray-900">{outputs.service_offering.name || 'N/A'}</p>
                      </div>
                      
                      {outputs.service_offering.description && (
                        <div>
                          <p className="font-semibold text-gray-700">Description:</p>
                          <p className="text-gray-900 text-sm">{outputs.service_offering.description}</p>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.type && (
                        <div>
                          <p className="font-semibold text-gray-700">Type:</p>
                          <p className="text-gray-900">{(outputs.service_offering as any).data.type}</p>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.summary && (
                        <div>
                          <p className="font-semibold text-gray-700">Summary:</p>
                          <p className="text-gray-900 text-sm">{(outputs.service_offering as any).data.summary}</p>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.capabilities && (outputs.service_offering as any).data.capabilities.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Key Capabilities:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.capabilities.map((cap: string, i: number) => (
                              <li key={i}>{cap}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.differentiatedValue && (outputs.service_offering as any).data.differentiatedValue.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Differentiated Value:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.differentiatedValue.map((val: string, i: number) => (
                              <li key={i}>{val}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.statusQuo && (outputs.service_offering as any).data.statusQuo.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Status Quo:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.statusQuo.map((sq: string, i: number) => (
                              <li key={i}>{sq}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.challengesAddressed && (outputs.service_offering as any).data.challengesAddressed.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Challenges Addressed:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.challengesAddressed.map((ch: string, i: number) => (
                              <li key={i}>{ch}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.customerBenefits && (outputs.service_offering as any).data.customerBenefits.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Customer Benefits:</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.customerBenefits.map((ben: string, i: number) => (
                              <li key={i}>{ben}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.deliverables && (outputs.service_offering as any).data.deliverables.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Deliverables:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.deliverables.map((del: string, i: number) => (
                              <li key={i}>{del}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.competencies && (outputs.service_offering as any).data.competencies.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Competencies:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.competencies.map((comp: string, i: number) => (
                              <li key={i}>{comp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.comparativeAdvantage && (outputs.service_offering as any).data.comparativeAdvantage.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Comparative Advantage:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.comparativeAdvantage.map((adv: string, i: number) => (
                              <li key={i}>{adv}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).data?.likelyAlternative && (outputs.service_offering as any).data.likelyAlternative.length > 0 && (
                        <div>
                          <p className="font-semibold text-gray-700 mb-2">Likely Alternative:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                            {(outputs.service_offering as any).data.likelyAlternative.map((alt: string, i: number) => (
                              <li key={i}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {(outputs.service_offering as any).qualifyingQuestions && (outputs.service_offering as any).qualifyingQuestions.length > 0 && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-fo-primary font-semibold hover:underline">
                            View Qualifying Questions ({(outputs.service_offering as any).qualifyingQuestions.length})
                          </summary>
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-fo-primary/30">
                            {(outputs.service_offering as any).qualifyingQuestions.map((q: any, i: number) => (
                              <div key={i} className="text-sm">
                                <p className="font-medium text-gray-900">{q.question}</p>
                                <p className="text-gray-600 text-xs mt-1">{q.rationale}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  <span className={`font-semibold ${q.fitType === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>
                                    {q.fitType}
                                  </span> • Weight: {q.weight}
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      
                      {(outputs.service_offering as any).disqualifyingQuestions && (outputs.service_offering as any).disqualifyingQuestions.length > 0 && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-red-600 font-semibold hover:underline">
                            View Disqualifying Questions ({(outputs.service_offering as any).disqualifyingQuestions.length})
                          </summary>
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-red-300">
                            {(outputs.service_offering as any).disqualifyingQuestions.map((q: any, i: number) => (
                              <div key={i} className="text-sm">
                                <p className="font-medium text-gray-900">{q.question}</p>
                                <p className="text-gray-600 text-xs mt-1">{q.rationale}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  <span className={`font-semibold ${q.fitType === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>
                                    {q.fitType}
                                  </span> • Weight: {q.weight}
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )}

                {/* Personas - FULL DETAIL */}
                {outputs.personas && outputs.personas.length > 0 && (
                  <div id="personas" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Personas ({outputs.personas.length})
                    </h3>
                    <div className="space-y-6">
                      {outputs.personas.map((persona: any, index: number) => (
                        <div key={index} className="bg-white p-5 rounded-lg border border-purple-200 shadow-sm">
                          <h4 className="font-bold text-lg text-fo-primary mb-3">{persona.name}</h4>
                          
                          {persona.description && (
                            <p className="text-sm text-gray-700 mb-3">{persona.description}</p>
                          )}
                          
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            {persona.data?.commonJobTitles && persona.data.commonJobTitles.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Common Job Titles:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {persona.data.commonJobTitles.map((title: string, i: number) => (
                                    <li key={i}>{title}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {persona.data?.primaryResponsibilities && persona.data.primaryResponsibilities.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Primary Responsibilities:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {persona.data.primaryResponsibilities.map((resp: string, i: number) => (
                                    <li key={i}>{resp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {persona.data?.painPoints && persona.data.painPoints.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Pain Points:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {persona.data.painPoints.map((pain: string, i: number) => (
                                    <li key={i}>{pain}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {persona.data?.keyConcerns && persona.data.keyConcerns.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Key Concerns:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {persona.data.keyConcerns.map((concern: string, i: number) => (
                                    <li key={i}>{concern}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {persona.data?.keyObjectives && persona.data.keyObjectives.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Key Objectives:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {persona.data.keyObjectives.map((obj: string, i: number) => (
                                    <li key={i}>{obj}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {persona.data?.whyTheyMatterToUs && persona.data.whyTheyMatterToUs.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Why They Matter To Us:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {persona.data.whyTheyMatterToUs.map((why: string, i: number) => (
                                    <li key={i}>{why}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {persona.data?.whyWeMatterToThem && persona.data.whyWeMatterToThem.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Why We Matter To Them:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {persona.data.whyWeMatterToThem.map((why: string, i: number) => (
                                    <li key={i}>{why}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          {persona.qualifyingQuestions && persona.qualifyingQuestions.length > 0 && (
                            <details className="mt-4">
                              <summary className="cursor-pointer text-fo-primary font-semibold text-sm hover:underline">
                                View Qualifying Questions ({persona.qualifyingQuestions.length})
                              </summary>
                              <div className="mt-3 space-y-2 pl-4 border-l-2 border-purple-300">
                                {persona.qualifyingQuestions.map((q: any, i: number) => (
                                  <div key={i} className="text-xs">
                                    <p className="font-medium text-gray-900">{q.question}</p>
                                    <p className="text-gray-600 mt-1">{q.rationale}</p>
                                    <p className="text-gray-500 mt-1">
                                      <span className={`font-semibold ${q.fitType === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>
                                        {q.fitType}
                                      </span> • {q.weight}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases - FULL DETAIL */}
                {outputs.use_cases && outputs.use_cases.length > 0 && (
                  <div id="use-cases" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Use Cases ({outputs.use_cases.length})
                    </h3>
                    <div className="space-y-6">
                      {outputs.use_cases.map((useCase: any, index: number) => (
                        <div key={index} className="bg-white p-5 rounded-lg border border-green-200 shadow-sm">
                          <h4 className="font-bold text-lg text-fo-primary mb-2">{useCase.name}</h4>
                          
                          {useCase.description && (
                            <p className="text-sm text-gray-700 mb-3">{useCase.description}</p>
                          )}
                          
                          {useCase.data?.summary && (
                            <div className="mb-3">
                              <p className="font-semibold text-gray-700 text-sm mb-1">Summary:</p>
                              <p className="text-sm text-gray-600">{useCase.data.summary}</p>
                            </div>
                          )}
                          
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            {useCase.data?.scenarios && useCase.data.scenarios.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Scenarios:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {useCase.data.scenarios.map((scenario: string, i: number) => (
                                    <li key={i}>{scenario}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {useCase.data?.desiredOutcomes && useCase.data.desiredOutcomes.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Desired Outcomes:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {useCase.data.desiredOutcomes.map((outcome: string, i: number) => (
                                    <li key={i}>{outcome}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {useCase.data?.businessDrivers && useCase.data.businessDrivers.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Business Drivers:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {useCase.data.businessDrivers.map((driver: string, i: number) => (
                                    <li key={i}>{driver}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Segments - FULL DETAIL */}
                {outputs.segments && outputs.segments.length > 0 && (
                  <div id="segments" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Market Segments ({outputs.segments.length})
                    </h3>
                    <div className="space-y-6">
                      {outputs.segments.map((segment: any, index: number) => (
                        <div key={index} className="bg-white p-5 rounded-lg border border-orange-200 shadow-sm">
                          <h4 className="font-bold text-lg text-fo-primary mb-2">{segment.name}</h4>
                          
                          {segment.description && (
                            <p className="text-sm text-gray-700 mb-3">{segment.description}</p>
                          )}
                          
                          {segment.data?.fitExplanation && (
                            <div className="mb-3 bg-orange-50 p-3 rounded border border-orange-200">
                              <p className="font-semibold text-gray-700 text-sm mb-1">Fit Explanation:</p>
                              <p className="text-sm text-gray-600">{segment.data.fitExplanation}</p>
                            </div>
                          )}
                          
                          {segment.data?.firmographics && Object.keys(segment.data.firmographics).length > 0 && (
                            <div className="mb-3 bg-yellow-50 p-3 rounded border border-yellow-200">
                              <p className="font-semibold text-gray-700 text-sm mb-2">Firmographics:</p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                {segment.data.firmographics.revenue && segment.data.firmographics.revenue.length > 0 && (
                                  <div>
                                    <p className="font-semibold">Revenue:</p>
                                    <p>{segment.data.firmographics.revenue.join(', ')}</p>
                                  </div>
                                )}
                                {segment.data.firmographics.industry && segment.data.firmographics.industry.length > 0 && (
                                  <div>
                                    <p className="font-semibold">Industry:</p>
                                    <p>{segment.data.firmographics.industry.join(', ')}</p>
                                  </div>
                                )}
                                {segment.data.firmographics.employees && segment.data.firmographics.employees.length > 0 && (
                                  <div>
                                    <p className="font-semibold">Employees:</p>
                                    <p>{segment.data.firmographics.employees.join(', ')}</p>
                                  </div>
                                )}
                                {segment.data.firmographics.geography && segment.data.firmographics.geography.length > 0 && (
                                  <div>
                                    <p className="font-semibold">Geography:</p>
                                    <p>{segment.data.firmographics.geography.join(', ')}</p>
                                  </div>
                                )}
                                {segment.data.firmographics.businessModel && segment.data.firmographics.businessModel.length > 0 && (
                                  <div>
                                    <p className="font-semibold">Business Model:</p>
                                    <p>{segment.data.firmographics.businessModel.join(', ')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            {segment.data?.keyPriorities && segment.data.keyPriorities.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Key Priorities:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {segment.data.keyPriorities.map((priority: string, i: number) => (
                                    <li key={i}>{priority}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {segment.data?.keyConsiderations && segment.data.keyConsiderations.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Key Considerations:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {segment.data.keyConsiderations.map((consideration: string, i: number) => (
                                    <li key={i}>{consideration}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {segment.data?.uniqueApproach && segment.data.uniqueApproach.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Unique Approach:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {segment.data.uniqueApproach.map((approach: string, i: number) => (
                                    <li key={i}>{approach}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client References - FULL DETAIL */}
                {outputs.client_references && outputs.client_references.length > 0 && (
                  <div id="client-references" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Client References ({outputs.client_references.length})
                    </h3>
                    <div className="space-y-6">
                      {outputs.client_references.map((reference: any, index: number) => (
                        <div key={index} className="bg-white p-5 rounded-lg border border-red-200 shadow-sm">
                          <h4 className="font-bold text-lg text-fo-primary mb-2">{reference.name || reference.internalName || 'Unnamed Reference'}</h4>
                          
                          {reference.description && (
                            <p className="text-sm text-gray-700 mb-3">{reference.description}</p>
                          )}
                          
                          <div className="space-y-3 mt-4">
                            {reference.data?.howTheyMakeMoney && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-1">How They Make Money:</p>
                                <p className="text-sm text-gray-600">{reference.data.howTheyMakeMoney}</p>
                              </div>
                            )}
                            
                            {reference.data?.howTheyUseProduct && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-1">How They Use Our Product/Service:</p>
                                <p className="text-sm text-gray-600">{reference.data.howTheyUseProduct}</p>
                              </div>
                            )}
                            
                            {reference.data?.howTheyBenefitFromProduct && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-1">How They Benefit:</p>
                                <p className="text-sm text-gray-600">{reference.data.howTheyBenefitFromProduct}</p>
                              </div>
                            )}
                            
                            {reference.data?.howWeImpactedTheirBusiness && reference.data.howWeImpactedTheirBusiness.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">How We Impacted Their Business:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {reference.data.howWeImpactedTheirBusiness.map((impact: string, i: number) => (
                                    <li key={i}>{impact}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {reference.data?.keyStats && reference.data.keyStats.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-2">Key Stats:</p>
                                <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                                  {reference.data.keyStats.map((stat: string, i: number) => (
                                    <li key={i}>{stat}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {reference.data?.emailSnippets && reference.data.emailSnippets.length > 0 && (
                              <details>
                                <summary className="cursor-pointer text-fo-primary font-semibold text-sm hover:underline">
                                  View Email Snippets ({reference.data.emailSnippets.length})
                                </summary>
                                <div className="mt-2 space-y-2 pl-4 border-l-2 border-red-300">
                                  {reference.data.emailSnippets.map((snippet: string, i: number) => (
                                    <p key={i} className="text-xs text-gray-600 italic">&ldquo;{snippet}&rdquo;</p>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitors - FULL DETAIL */}
                {outputs.competitors && outputs.competitors.length > 0 && (
                  <div id="competitors" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Competitive Analysis ({outputs.competitors.length})
                    </h3>
                    <div className="space-y-6">
                      {outputs.competitors.map((competitor: any, index: number) => (
                        <div key={index} className="bg-white p-5 rounded-lg border border-orange-200 shadow-sm">
                          <h4 className="font-bold text-lg text-fo-primary mb-2">{competitor.name || competitor.internalName || competitor.companyName || 'Unnamed Competitor'}</h4>
                          
                          {competitor.companyWebsite && (
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-semibold">Website:</span>{' '}
                              <a href={competitor.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {competitor.companyWebsite}
                              </a>
                            </p>
                          )}
                          
                          {competitor.description && (
                            <p className="text-sm text-gray-700 mb-3">{competitor.description}</p>
                          )}
                          
                          <div className="space-y-3 mt-4">
                            {competitor.data?.comparativeStrengths && competitor.data.comparativeStrengths.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-1">Their Strengths:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {competitor.data.comparativeStrengths.map((strength: string, idx: number) => (
                                    <li key={idx}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {competitor.data?.keyDifferentiators && competitor.data.keyDifferentiators.length > 0 && (
                              <div>
                                <p className="font-semibold text-gray-700 text-sm mb-1">Key Differentiators:</p>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {competitor.data.keyDifferentiators.map((diff: string, idx: number) => (
                                    <li key={idx}>{diff}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {competitor.data?.reasonsWeWin && competitor.data.reasonsWeWin.length > 0 && (
                              <div className="bg-green-50 p-3 rounded-md border border-green-200">
                                <p className="font-semibold text-green-800 text-sm mb-1">🎯 Why We Win:</p>
                                <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                                  {competitor.data.reasonsWeWin.map((reason: string, idx: number) => (
                                    <li key={idx}>{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Playbooks - FULL DETAIL */}
                {outputs.campaign_ideas && outputs.campaign_ideas.length > 0 && (
                  <div id="playbooks" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Playbooks ({outputs.campaign_ideas.length})
                    </h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Sales playbooks created from your segments, personas, and use cases
                    </p>
                    <div className="space-y-6">
                      {(enrichedCampaignIdeas || outputs.campaign_ideas).map((playbook: any, index: number) => (
                        <div key={index} className="bg-white p-5 rounded-lg border border-blue-200 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-bold text-lg text-fo-primary">{playbook.title}</h4>
                            {playbook.status && (
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                {playbook.status}
                              </span>
                            )}
                          </div>
                          
                          {playbook.description && (
                            <p className="text-sm text-gray-700 mb-3">{playbook.description}</p>
                          )}
                          
                          {playbook.segmentName && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">Target Segment</p>
                              <p className="text-sm text-gray-900">{playbook.segmentName}</p>
                            </div>
                          )}
                          
                          {playbook.executiveSummary && (
                            <div className="mb-3 bg-purple-50 p-4 rounded border border-purple-200">
                              <p className="font-semibold text-gray-700 text-sm mb-2">📋 Executive Summary:</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{playbook.executiveSummary}</p>
                            </div>
                          )}
                          
                          {playbook.keyInsight && (
                            <div className="mb-3 bg-blue-50 p-3 rounded border border-blue-200">
                              <p className="font-semibold text-gray-700 text-sm mb-1">💡 Key Insights:</p>
                              <p className="text-sm text-gray-700">{playbook.keyInsight}</p>
                            </div>
                          )}
                          
                          {playbook.approachAngle && (
                            <div className="mb-3 bg-yellow-50 p-3 rounded border border-yellow-200">
                              <p className="font-semibold text-gray-700 text-sm mb-1">🎯 Approach Angle:</p>
                              <p className="text-sm text-gray-700">{playbook.approachAngle}</p>
                            </div>
                          )}
                          
                          {playbook.valueProps && playbook.valueProps.length > 0 && (
                            <div className="mb-3">
                              <p className="font-semibold text-gray-700 text-sm mb-2">✨ Value Propositions (By Persona):</p>
                              <div className="space-y-2">
                                {playbook.valueProps.map((valueProp: any, idx: number) => (
                                  <div key={idx} className="bg-green-50 p-3 rounded border border-green-200">
                                    {valueProp.personaName && (
                                      <p className="font-semibold text-green-800 text-xs mb-1">{valueProp.personaName}</p>
                                    )}
                                    <p className="text-sm text-gray-700">{valueProp.value || valueProp}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {playbook.type && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-500 uppercase">Playbook Type</p>
                              <p className="text-sm text-gray-900">{playbook.type}</p>
                            </div>
                          )}
                          
                          {playbook.referenceNames && playbook.referenceNames.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="font-semibold text-gray-700 text-sm mb-2">
                                Client References Included ({playbook.referencesIncluded || playbook.referenceNames.length}):
                              </p>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {playbook.referenceNames.map((refName: string, idx: number) => (
                                  <li key={idx}>{refName}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {playbook.qualifyingQuestions && playbook.qualifyingQuestions.length > 0 && (
                            <details className="mt-4">
                              <summary className="cursor-pointer text-fo-primary font-semibold text-sm hover:underline">
                                View Qualifying Questions ({playbook.qualifyingQuestions.length})
                              </summary>
                              <div className="mt-3 space-y-2 pl-4 border-l-2 border-blue-300">
                                {playbook.qualifyingQuestions.map((q: any, i: number) => (
                                  <div key={i} className="text-xs">
                                    <p className="font-medium text-gray-900">{q.question}</p>
                                    <p className="text-gray-600 mt-1">{q.rationale}</p>
                                    <p className="text-gray-500 mt-1">
                                      <span className={`font-semibold ${q.fitType === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>
                                        {q.fitType}
                                      </span> • {q.weight}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                          
                          {playbook.disqualifyingQuestions && playbook.disqualifyingQuestions.length > 0 && (
                            <details className="mt-4">
                              <summary className="cursor-pointer text-red-600 font-semibold text-sm hover:underline">
                                View Disqualifying Questions ({playbook.disqualifyingQuestions.length})
                              </summary>
                              <div className="mt-3 space-y-2 pl-4 border-l-2 border-red-300">
                                {playbook.disqualifyingQuestions.map((q: any, i: number) => (
                                  <div key={i} className="text-xs">
                                    <p className="font-medium text-gray-900">{q.question}</p>
                                    <p className="text-gray-600 mt-1">{q.rationale}</p>
                                    <p className="text-gray-500 mt-1">
                                      <span className={`font-semibold ${q.fitType === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>
                                        {q.fitType}
                                      </span> • {q.weight}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                          
                          {playbook.oId && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                <span className="font-semibold">Octave ID:</span> {playbook.oId}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg shadow-2xl p-8 text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to grow your sales?</h2>
              <p className="text-xl mb-6">
                Book a call with Corey to activate these workflows in your CRM
              </p>
              <a
                href="https://meetings.hubspot.com/corey-peck/gtm-kickoff-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-white text-fo-primary rounded-lg hover:bg-gray-100 font-bold text-lg transition-all shadow-lg"
              >
                Book Meeting Now
              </a>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

