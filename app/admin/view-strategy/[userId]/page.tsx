'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ClaireImage from '../../../Claire_v2.png';
import Logo from '../../../Fractional-Ops_Symbol_Main.png';
import SectionIntro from '@/components/SectionIntro';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali@fractionalops.com',
  'corey@fractionalops.com',
  'coreypeck@gmail.com',
  // Add more admin emails as needed
];

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
  service_offering?: any;
  use_cases?: any[];
  personas?: any[];
  client_references?: any[];
  segments?: any[];
  competitors?: any[];
  created_at: string;
  workspace_api_key?: string;
}

const ErrorPlaceholder = ({ assetType }: { assetType: string }) => (
  <div className="bg-gradient-to-br from-fo-light to-white border-l-4 border-fo-orange rounded-lg p-6 shadow-sm">
    <div className="text-fo-orange mb-3 font-bold text-lg flex items-center gap-2">
      <span>⚠️</span>
      <span>Additional Information Required</span>
    </div>
    <p className="text-fo-text-secondary text-sm">
      Client needs to provide more details to create <strong>{assetType}</strong>.
    </p>
  </div>
);

export default function AdminViewStrategyPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [outputs, setOutputs] = useState<OctaveOutputs | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [enrichedCampaignIdeas, setEnrichedCampaignIdeas] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeEmailTab, setActiveEmailTab] = useState('leadMagnetLong');
  const [activePostTab, setActivePostTab] = useState('inspiring');
  const [activeDMTab, setActiveDMTab] = useState('newsletter');
  const [activeNewsletterTab, setActiveNewsletterTab] = useState('tactical');
  const [activeSection, setActiveSection] = useState('campaign-workflows');

  useEffect(() => {
    checkAdminAndLoadStrategy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const checkAdminAndLoadStrategy = async () => {
    try {
      // Check admin access
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }

      setCurrentUser(user.email || null);
      
      const isAdminUser = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );

      if (!isAdminUser) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load strategy via API
      const response = await fetch(`/api/admin/strategy/${userId}`);
      const data = await response.json();

      if (data.success) {
        setOutputs(data.strategy);
        setUserEmail(data.userEmail);
        console.log('✅ Strategy loaded for admin:', data.strategy.company_name);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fresh playbook data when outputs are loaded
  useEffect(() => {
    async function enrichPlaybooks() {
      if (!outputs?.campaign_ideas || outputs.campaign_ideas.length === 0) return;
      if (!outputs?.workspace_api_key) return;
      
      const playbookOIds = outputs.campaign_ideas
        .map((idea: any) => idea.oId)
        .filter((oId: string) => oId);
      
      if (playbookOIds.length === 0) return;
      
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
          const enriched = outputs.campaign_ideas.map((idea: any) => {
            const freshData = result.playbooks.find((p: any) => p.oId === idea.oId);
            if (freshData) {
              return {
                ...idea,
                ...freshData,
                title: idea.title,
                segmentName: idea.segmentName,
                referencesIncluded: idea.referencesIncluded,
                referenceNames: idea.referenceNames
              };
            }
            return idea;
          });
          
          setEnrichedCampaignIdeas(enriched);
        }
      } catch (error) {
        console.error('⚠️ Failed to enrich playbooks:', error);
      }
    }
    
    enrichPlaybooks();
  }, [outputs]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'campaign-workflows', 'prospect-list', 'cold-emails', 'linkedin-posts',
        'linkedin-dms', 'newsletters', 'youtube-scripts', 'call-prep',
        'service-offering', 'use-cases', 'personas', 'client-references',
        'segments', 'competitors'
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-2">
            You don&apos;t have permission to view this page.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Logged in as: {currentUser}
          </p>
          <button
            onClick={() => router.push('/questionnaire')}
            className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-bold"
          >
            Go to Questionnaire
          </button>
        </div>
      </div>
    );
  }

  if (notFound || !outputs) {
    return (
      <div className="min-h-screen bg-fo-light flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Strategy Not Found</h1>
          <p className="text-gray-600 mb-6">
            No strategy was found for this user ID.
          </p>
          <button
            onClick={() => router.push('/admin/strategies')}
            className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-bold"
          >
            ← Back to Strategies
          </button>
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
    <div className="min-h-screen bg-fo-light">
      {/* Admin Header Bar */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3 px-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/strategies')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Back to Strategies</span>
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
              ADMIN VIEW
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm">
              Client: <span className="text-white font-medium">{userEmail}</span>
            </span>
            <span className="text-gray-300 text-sm">
              Created: {new Date(outputs.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Header with Claire */}
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
            
            {/* Admin Note Instead of Timer */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-orange-800">
                <span className="text-lg">👁️</span>
                <div>
                  <p className="font-bold text-sm">Admin View Only</p>
                  <p className="text-xs text-orange-600">No timer triggered</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 flex-shrink-0 sticky top-20 self-start hidden lg:block">
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
            <section id="campaign-workflows" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Campaign Ideas</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.campaignIdeas} sectionId="campaign-workflows" />
              
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
            <section id="prospect-list" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Prospect List</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.prospectList} sectionId="prospect-list" />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                {outputs.prospect_list && outputs.prospect_list.length > 0 ? (
                  <div className="space-y-4">
                    {outputs.prospect_list.slice(0, 10).map((prospect: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-fo-primary text-lg">{prospect.name || `Prospect ${index + 1}`}</p>
                            <p className="text-sm text-gray-700 mt-1">{prospect.title || 'N/A'}</p>
                            <p className="text-sm text-gray-600 mt-1">{prospect.company || 'N/A'}</p>
                          </div>
                          <div className="space-y-2">
                            {prospect.email && (
                              <div className="text-sm">
                                <span className="text-green-600 font-bold">✓</span>
                                <span className="ml-2 text-fo-primary">{prospect.email}</span>
                              </div>
                            )}
                            {prospect.mobile_number && (
                              <div className="text-sm">
                                <span className="text-green-600 font-bold">✓</span>
                                <span className="ml-2 text-fo-primary">{prospect.mobile_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {outputs.prospect_list.length > 10 && (
                      <p className="text-center text-gray-500 text-sm">
                        + {outputs.prospect_list.length - 10} more prospects
                      </p>
                    )}
                  </div>
                ) : (
                  <ErrorPlaceholder assetType="Prospect List" />
                )}
              </div>
            </section>

            {/* Cold Emails Section */}
            <section id="cold-emails" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Cold Email Sequences</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.coldEmails} sectionId="cold-emails" />
              
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
                          <div className="prose prose-sm max-w-none text-gray-700">
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
            <section id="linkedin-posts" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">LinkedIn Posts</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.linkedinPosts} sectionId="linkedin-posts" />
              
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
            <section id="linkedin-dms" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">LinkedIn DMs</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.linkedinDMs} sectionId="linkedin-dms" />
              
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
                      <div className="prose prose-lg max-w-none text-gray-900">
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
            <section id="newsletters" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Newsletter Content</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.newsletters} sectionId="newsletters" />
              
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
                      <div className="prose prose-lg max-w-none text-gray-900">
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
            <section id="youtube-scripts" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">YouTube Video Scripts</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.youtubeScripts} sectionId="youtube-scripts" />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                {outputs.youtube_scripts?.longForm ? (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="prose prose-lg max-w-none text-gray-900">
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
            <section id="call-prep" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-fo-primary to-fo-orange rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Call Prep</h2>
              </div>

              <SectionIntro whatIsThisFor={sectionIntros.callPrep} sectionId="call-prep" />
              
              <div className="bg-white rounded-lg shadow-lg p-8">
                {outputs.call_prep ? (
                  <div className="space-y-6">
                    {outputs.call_prep.callScript && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Call Script:</h3>
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <div className="prose prose-lg max-w-none text-gray-900">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
                          <div className="prose prose-lg max-w-none text-gray-900">
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

            {/* Strategic Elements Library (simplified) */}
            <div className="border-t-4 border-fo-primary pt-12 mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Strategic Elements Library</h2>
              <p className="text-gray-600 mb-8">
                Foundational library materials created in the client&apos;s Octave workspace
              </p>

              <div className="space-y-8">
                {/* Service Offering */}
                {outputs.service_offering && (
                  <div id="service-offering" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Service Offering</h3>
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
                    </div>
                  </div>
                )}

                {/* Personas */}
                {outputs.personas && outputs.personas.length > 0 && (
                  <div id="personas" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Personas ({outputs.personas.length})
                    </h3>
                    <div className="space-y-4">
                      {outputs.personas.map((persona: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-bold text-fo-primary">{persona.name}</h4>
                          {persona.description && (
                            <p className="text-sm text-gray-700 mt-1">{persona.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                {outputs.use_cases && outputs.use_cases.length > 0 && (
                  <div id="use-cases" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Use Cases ({outputs.use_cases.length})
                    </h3>
                    <div className="space-y-4">
                      {outputs.use_cases.map((useCase: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-bold text-fo-primary">{useCase.name}</h4>
                          {useCase.description && (
                            <p className="text-sm text-gray-700 mt-1">{useCase.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Segments */}
                {outputs.segments && outputs.segments.length > 0 && (
                  <div id="segments" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Market Segments ({outputs.segments.length})
                    </h3>
                    <div className="space-y-4">
                      {outputs.segments.map((segment: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-bold text-fo-primary">{segment.name}</h4>
                          {segment.description && (
                            <p className="text-sm text-gray-700 mt-1">{segment.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Client References */}
                {outputs.client_references && outputs.client_references.length > 0 && (
                  <div id="client-references" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Client References ({outputs.client_references.length})
                    </h3>
                    <div className="space-y-4">
                      {outputs.client_references.map((reference: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-bold text-fo-primary">{reference.name || reference.internalName || 'Reference'}</h4>
                          {reference.description && (
                            <p className="text-sm text-gray-700 mt-1">{reference.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitors */}
                {outputs.competitors && outputs.competitors.length > 0 && (
                  <div id="competitors" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Competitive Analysis ({outputs.competitors.length})
                    </h3>
                    <div className="space-y-4">
                      {outputs.competitors.map((competitor: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-bold text-fo-primary">{competitor.name || competitor.companyName || 'Competitor'}</h4>
                          {competitor.companyWebsite && (
                            <p className="text-sm text-gray-500">{competitor.companyWebsite}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Playbooks */}
                {outputs.campaign_ideas && outputs.campaign_ideas.length > 0 && (
                  <div id="playbooks" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Playbooks ({outputs.campaign_ideas.length})
                    </h3>
                    <div className="space-y-4">
                      {(enrichedCampaignIdeas || outputs.campaign_ideas).map((playbook: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-bold text-fo-primary">{playbook.title}</h4>
                          {playbook.description && (
                            <p className="text-sm text-gray-700 mt-1">{playbook.description}</p>
                          )}
                          {playbook.oId && (
                            <p className="text-xs text-gray-500 mt-2">Octave ID: {playbook.oId}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-800 rounded-lg p-6 text-center text-white">
              <p className="text-sm">
                ⚠️ Admin View Only - This page does not trigger the 14-day countdown timer
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

