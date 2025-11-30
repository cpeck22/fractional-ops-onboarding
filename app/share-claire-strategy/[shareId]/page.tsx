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
      <span>Need more context</span>
    </div>
    <p className="text-fo-text-secondary text-sm">
      I need more details to create <strong>{assetType}</strong>. Book a GTM Kickoff Call to review together.
    </p>
  </div>
);

export default function SharedStrategyPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [outputs, setOutputs] = useState<OctaveOutputs | null>(null);
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
              <SectionIntro
                whatIsThisFor={sectionIntros.campaignIdeas}
                sectionId="campaign-workflows"
                videoUrl="https://drive.google.com/file/d/13W9LlvCvqBzOl_5R81yeZCLJ9tusC2RW/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Campaign Ideas</h2>
                </div>
                
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
              <SectionIntro
                whatIsThisFor={sectionIntros.prospectList}
                sectionId="prospect-list"
                videoUrl="https://drive.google.com/file/d/1t6tnBLxzvTkQXoW6ErnmDKMPwGyTq4sp/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Prospect List</h2>
                </div>
                
                {outputs.prospect_list && outputs.prospect_list.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {outputs.prospect_list.map((prospect: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{prospect.company}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{prospect.contact}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{prospect.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{prospect.location}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <ErrorPlaceholder assetType="Prospect List" />
                )}
              </div>
            </section>

            {/* Cold Emails Section */}
            <section id="cold-emails" className="scroll-mt-8">
              <SectionIntro
                whatIsThisFor={sectionIntros.coldEmails}
                sectionId="cold-emails"
                videoUrl="https://drive.google.com/file/d/1V3T8gd6-y5OVB8nW0L9_9pjpqEAKzEda/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
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
                              {email.body}
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
              <SectionIntro
                whatIsThisFor={sectionIntros.linkedinPosts}
                sectionId="linkedin-posts"
                videoUrl="https://drive.google.com/file/d/1q0SdjYjxpjfipFiYSGoL5QAPzqWZS-o0/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">LinkedIn Posts</h2>
                </div>

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
              <SectionIntro
                whatIsThisFor={sectionIntros.linkedinDMs}
                sectionId="linkedin-dms"
                videoUrl="https://drive.google.com/file/d/108EHJ-Edh_YiXPw0AgkoTg5W5jkyyvQs/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">LinkedIn DMs</h2>
                </div>

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
              <SectionIntro
                whatIsThisFor={sectionIntros.newsletters}
                sectionId="newsletters"
                videoUrl="https://drive.google.com/file/d/1vtxH3UXdzaS8R99dRaPcy3Op1d1SxQWJ/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
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
              <SectionIntro
                whatIsThisFor={sectionIntros.youtubeScripts}
                sectionId="youtube-scripts"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
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
              <SectionIntro
                whatIsThisFor={sectionIntros.callPrep}
                sectionId="call-prep"
                videoUrl="https://drive.google.com/file/d/1XYNwjRicEUyPlO3Jp9KuzQjLuOhSOQ2W/preview"
              />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">Call Prep</h2>
                </div>

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

            {/* Strategic Elements Appendix */}
            <div className="border-t-4 border-fo-primary pt-12 mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Strategic Elements Library</h2>
              
              {appendixSections.map((section) => {
                const data = outputs[section.key as keyof OctaveOutputs];
                const hasData = Array.isArray(data) ? data.length > 0 : !!data;

                return (
                  <section key={section.id} id={section.id} className="scroll-mt-8 mb-12">
                    <div className="bg-white rounded-lg shadow-lg p-8">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{section.label}</h3>
                      {hasData ? (
                        <div className="prose prose-sm max-w-none text-gray-700">
                          {Array.isArray(data) ? (
                            <ul className="space-y-2">
                              {data.map((item: any, index: number) => (
                                <li key={index} className="border-l-2 border-fo-primary pl-4 py-2">
                                  {typeof item === 'string' ? item : JSON.stringify(item)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="whitespace-pre-wrap">{String(data)}</div>
                          )}
                        </div>
                      ) : (
                        <ErrorPlaceholder assetType={section.label} />
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg shadow-2xl p-8 text-center text-white">
              <h2 className="text-3xl font-bold mb-4">Ready to grow your sales?</h2>
              <p className="text-xl mb-6">
                Book your GTM Kickoff Call with Corey to activate these workflows in your CRM
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

