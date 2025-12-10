'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ClaireImage from '../../../Claire_v2.png';
import SectionIntro from '@/components/SectionIntro';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
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

  // Table of Contents sections (same as results page)
  const tocSections = [
    { id: 'campaign-workflows', label: 'Campaign Ideas', emoji: '' },
    { id: 'qualified-prospects', label: 'Qualified Prospects', emoji: '' },
    { id: 'cold-email-sequences', label: 'Cold Email Sequences', emoji: '' },
    { id: 'linkedin-posts', label: 'LinkedIn Posts', emoji: '' },
    { id: 'linkedin-dms', label: 'LinkedIn DMs', emoji: '' },
    { id: 'newsletter-content', label: 'Newsletter Content', emoji: '' },
    { id: 'youtube-scripts', label: 'YouTube Video Scripts', emoji: '' },
    { id: 'call-prep', label: 'Call Prep', emoji: '' },
  ];

  // Strategic Elements Appendix sections  
  const appendixSections = [
    { id: 'service-offering', label: 'Service Offering' },
    { id: 'personas', label: 'Personas' },
    { id: 'use-cases', label: 'Use Cases' },
    { id: 'segments', label: 'Segments' },
    { id: 'client-references', label: 'Client References' },
    { id: 'competitors', label: 'Competitors' },
    { id: 'playbooks', label: 'Playbooks' },
  ];

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80; // Account for admin header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const allSections = [
        ...tocSections.map(section => ({
          id: section.id,
          element: document.getElementById(section.id)
        })),
        ...appendixSections.map(section => ({
          id: section.id,
          element: document.getElementById(section.id)
        }))
      ].filter(section => section.element !== null);

      for (let i = allSections.length - 1; i >= 0; i--) {
        const section = allSections[i];
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // Helper function to recursively parse nested .data fields (same as results page)
        const deepParseData = (obj: any): any => {
          if (typeof obj === 'string') {
            try {
              return deepParseData(JSON.parse(obj));
            } catch {
              return obj;
            }
          }
          if (Array.isArray(obj)) {
            return obj.map(item => deepParseData(item));
          }
          if (obj && typeof obj === 'object') {
            const parsed: any = {};
            for (const key in obj) {
              if (key === 'data') {
                parsed[key] = deepParseData(obj[key]);
              } else {
                parsed[key] = obj[key];
              }
            }
            return parsed;
          }
          return obj;
        };

        const strategy = data.strategy;
        const parsedData = {
          ...strategy,
          service_offering: deepParseData(strategy.service_offering),
          segments: deepParseData(strategy.segments),
          client_references: deepParseData(strategy.client_references),
          competitors: deepParseData(strategy.competitors),
          campaign_ideas: deepParseData(strategy.campaign_ideas),
          personas: deepParseData(strategy.personas),
          use_cases: deepParseData(strategy.use_cases)
        };

        setOutputs(parsedData);
        setUserEmail(data.userEmail);
        console.log('✅ Strategy loaded for admin:', parsedData.company_name);
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
          console.log('✅ Successfully enriched playbook data');
        }
      } catch (error) {
        console.error('⚠️ Failed to enrich playbooks:', error);
      }
    }
    
    enrichPlaybooks();
  }, [outputs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-fo-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-dark text-lg font-semibold">Loading strategy...</p>
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

  const emailTabs = [
    { id: 'leadMagnetLong', label: 'Lead Magnet (Long)', color: 'pink' },
    { id: 'personalizedSolutions', label: '3 Personalized Solutions', color: 'blue' },
    { id: 'problemSolution', label: 'Problem/Solution', color: 'orange' },
    { id: 'localCity', label: 'Local/Same City', color: 'purple' },
    { id: 'leadMagnetShort', label: 'Lead Magnet (Short)', color: 'green' }
  ];

  const postTabs = [
    { id: 'inspiring', label: 'Inspiring Post', color: 'blue' },
    { id: 'promotional', label: 'Promotional Post', color: 'green' },
    { id: 'actionable', label: 'Actionable Post', color: 'purple' }
  ];

  const dmTabs = [
    { id: 'newsletter', label: 'Newsletter CTA', color: 'blue' },
    { id: 'leadMagnet', label: 'Lead Magnet CTA', color: 'green' },
    { id: 'askQuestion', label: 'Ask A Question', color: 'purple' }
  ];

  const newsletterTabs = [
    { id: 'tactical', label: 'Tactical Writing', color: 'orange' },
    { id: 'leadership', label: 'Leadership Writing', color: 'purple' }
  ];

  // Section intro content (same as results page)
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
    qualifiedProspects: [
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
    ]
  };

  return (
    <div className="min-h-screen bg-fo-light select-none">
      {/* Admin Header Bar - Fixed at top */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-3 px-4 fixed top-0 left-0 right-0 z-50 shadow-lg">
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

      {/* Main Content - with top padding for fixed header */}
      <div className="pt-16 max-w-7xl mx-auto px-4 py-8">
        
        {/* Table of Contents - Fixed Left Sidebar */}
        <nav className="hidden lg:block fixed left-4 top-24 w-64 bg-white rounded-lg shadow-lg p-6 max-h-[calc(100vh-8rem)] overflow-y-auto z-40">
          <h3 className="text-sm font-bold text-fo-dark mb-4 uppercase tracking-wider">
            Initial Assets
          </h3>
          <ul className="space-y-1 mb-6">
            {tocSections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? 'bg-fo-primary text-white font-semibold shadow-md'
                      : 'text-fo-text-secondary hover:bg-fo-light hover:text-fo-primary'
                  }`}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
          
          {/* Strategic Elements Appendix */}
          <h3 className="text-sm font-bold text-fo-dark mb-4 uppercase tracking-wider border-t pt-4">
            Strategic Elements Appendix
          </h3>
          <ul className="space-y-1">
            {appendixSections.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? 'bg-fo-primary text-white font-semibold shadow-md'
                      : 'text-fo-text-secondary hover:bg-fo-light hover:text-fo-primary'
                  }`}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Main Content - Shifted right on large screens */}
        <div className="lg:ml-72 max-w-5xl">
        
        {/* Header with Claire */}
        <div className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-fo-primary to-fo-secondary rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-fo-primary">
              <Image
                src={ClaireImage}
                alt="Claire"
                width={96}
                height={96}
                className="object-cover scale-105"
                style={{ objectPosition: 'center center' }}
                priority
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-fo-dark mb-2">
                {outputs.company_name}&apos;s Sales Plan
              </h1>
              <p className="text-fo-dark font-semibold text-sm mb-1">
                Actionable systems. Fast results. No drama.
              </p>
              <p className="text-fo-text-secondary text-sm">
                Built by Claire • {new Date(outputs.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            
            {/* Admin Note */}
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

        {/* Campaign Ideas */}
        <section id="campaign-workflows" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Campaign Ideas
          </h2>
          
          <SectionIntro 
            whatIsThisFor={sectionIntros.campaignIdeas}
            sectionId="campaign-ideas"
            videoUrl="https://drive.google.com/file/d/13W9LlvCvqBzOl_5R81yeZCLJ9tusC2RW/preview"
          />
          
          {outputs.campaign_ideas && outputs.campaign_ideas.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {outputs.campaign_ideas.map((campaign: any, index: number) => (
                <div key={index} className="bg-gradient-to-br from-fo-light to-white p-6 rounded-lg border border-fo-primary/20">
                  <h3 className="font-bold text-lg text-fo-primary mb-2">
                    {campaign.title}
                  </h3>
                  <p className="text-fo-secondary text-sm">{campaign.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <ErrorPlaceholder assetType="Campaign Ideas" />
          )}
        </section>

        {/* Prospect List - WITH PRIORITY SORTING */}
        <section id="qualified-prospects" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Qualified Prospects
          </h2>
          
          <SectionIntro 
            whatIsThisFor={sectionIntros.qualifiedProspects}
            sectionId="qualified-prospects"
            videoUrl="https://drive.google.com/file/d/1t6tnBLxzvTkQXoW6ErnmDKMPwGyTq4sp/preview"
          />
          
          {outputs.prospect_list && outputs.prospect_list.length > 0 ? (
            <>
              {(() => {
                // FILTER: Contacts with Priority 1-3 (have email and/or phone)
                const qualifiedContacts = outputs.prospect_list.filter((p: any) => {
                  return p.email || p.mobile_number;
                });

                // PRIORITIZE: Sort by contact info availability
                const finalList = qualifiedContacts.sort((a: any, b: any) => {
                  const aPriority1 = (a.email && a.mobile_number) ? 1 : 0;
                  const bPriority1 = (b.email && b.mobile_number) ? 1 : 0;
                  const aPriority2 = (a.email && !a.mobile_number) ? 1 : 0;
                  const bPriority2 = (b.email && !b.mobile_number) ? 1 : 0;
                  const aPriority3 = (!a.email && a.mobile_number) ? 1 : 0;
                  const bPriority3 = (!b.email && b.mobile_number) ? 1 : 0;
                  const aScore = aPriority1 * 4 + aPriority2 * 3 + aPriority3 * 2;
                  const bScore = bPriority1 * 4 + bPriority2 * 3 + bPriority3 * 2;
                  return bScore - aScore;
                });

                return (
                  <div className="space-y-3">
                    {finalList.map((prospect: any, index: number) => (
                      <div key={index} className="bg-fo-light p-4 rounded-lg border border-gray-200 hover:border-fo-primary transition-colors">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-fo-primary mb-1">{prospect.name || `Prospect ${index + 1}`}</p>
                            <p className="text-sm text-fo-secondary">{prospect.title}</p>
                            <p className="text-sm text-gray-500">{prospect.company}</p>
                            {prospect.linkedIn && (
                              <a 
                                href={prospect.linkedIn} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-xs inline-flex items-center gap-1 mt-2"
                              >
                                <span>LinkedIn</span>
                                <span>→</span>
                              </a>
                            )}
                          </div>
                          <div className="space-y-2">
                            {prospect.email ? (
                              <div className="flex items-start gap-2">
                                <span className="text-green-600 text-sm font-bold">✓</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 font-semibold">Email</div>
                                  <a 
                                    href={`mailto:${prospect.email}`}
                                    className="text-sm text-fo-primary hover:underline break-all"
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
                            {prospect.mobile_number ? (
                              <div className="flex items-start gap-2">
                                <span className="text-green-600 text-sm font-bold">✓</span>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500 font-semibold">Mobile</div>
                                  <a 
                                    href={`tel:${String(prospect.mobile_number).startsWith('+') ? prospect.mobile_number : `+${prospect.mobile_number}`}`}
                                    className="text-sm text-fo-primary hover:underline"
                                  >
                                    {String(prospect.mobile_number).startsWith('+') ? prospect.mobile_number : `+${prospect.mobile_number}`}
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <span className="text-gray-400 text-sm">✗</span>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500">Mobile</div>
                                  <div className="text-sm text-gray-400">Not found</div>
                                </div>
                              </div>
                            )}
                            {prospect.enrichment_data?.mx_provider && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="text-xs text-gray-500 mb-0.5">Email Provider</div>
                                <div className="text-sm text-gray-700 capitalize">
                                  {prospect.enrichment_data.mx_provider}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          ) : (
            <ErrorPlaceholder assetType="Prospect List" />
          )}
        </section>

        {/* Cold Email Sequences */}
        <section id="cold-email-sequences" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Image src="/Gmail_icon_(2020).svg.webp" alt="Gmail" width={28} height={28} className="object-contain" />
            <Image src="/Outlook-Logo.png" alt="Outlook" width={28} height={28} className="object-contain" />
            Cold Email Sequences
          </h2>
          
          <SectionIntro 
            whatIsThisFor={sectionIntros.coldEmails}
            sectionId="cold-emails"
            videoUrl="https://drive.google.com/file/d/1V3T8gd6-y5OVB8nW0L9_9pjpqEAKzEda/preview"
          />
          
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {emailTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveEmailTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activeEmailTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {outputs.cold_emails && outputs.cold_emails[activeEmailTab as keyof typeof outputs.cold_emails] && 
           (outputs.cold_emails[activeEmailTab as keyof typeof outputs.cold_emails] as any[]).length > 0 ? (
            <div className="space-y-6">
              {(outputs.cold_emails[activeEmailTab as keyof typeof outputs.cold_emails] as any[]).map((email: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-900 text-white px-6 py-3">
                    <p className="font-semibold">Email {email.emailNumber}</p>
                    <p className="text-sm opacity-90">Subject: {email.subject}</p>
                  </div>
                  <div className="p-6 bg-white">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                      {email.email || email.body}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ErrorPlaceholder assetType={`${emailTabs.find(t => t.id === activeEmailTab)?.label} Email Sequence`} />
          )}
        </section>

        {/* LinkedIn Posts */}
        <section id="linkedin-posts" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0A66C2">
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
            </svg>
            LinkedIn Posts
          </h2>
          
          <SectionIntro 
            whatIsThisFor={sectionIntros.linkedinPosts}
            sectionId="linkedin-posts"
            videoUrl="https://drive.google.com/file/d/1q0SdjYjxpjfipFiYSGoL5QAPzqWZS-o0/preview"
          />
          
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {postTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePostTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activePostTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {outputs.linkedin_posts && outputs.linkedin_posts[activePostTab as keyof typeof outputs.linkedin_posts] ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {outputs.linkedin_posts[activePostTab as keyof typeof outputs.linkedin_posts]}
              </pre>
            </div>
          ) : (
            <ErrorPlaceholder assetType={`${postTabs.find(t => t.id === activePostTab)?.label}`} />
          )}
        </section>

        {/* LinkedIn DMs */}
        <section id="linkedin-dms" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0A66C2">
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
            </svg>
            LinkedIn DMs
          </h2>
          
          <SectionIntro 
            whatIsThisFor={sectionIntros.linkedinDMs}
            sectionId="linkedin-dms"
            videoUrl="https://drive.google.com/file/d/108EHJ-Edh_YiXPw0AgkoTg5W5jkyyvQs/preview"
          />
          
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {dmTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDMTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activeDMTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {outputs.linkedin_dms && outputs.linkedin_dms[activeDMTab as keyof typeof outputs.linkedin_dms] ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {outputs.linkedin_dms[activeDMTab as keyof typeof outputs.linkedin_dms]}
              </pre>
            </div>
          ) : (
            <ErrorPlaceholder assetType={`LinkedIn DM ${dmTabs.find(t => t.id === activeDMTab)?.label}`} />
          )}
        </section>

        {/* Newsletters */}
        <section id="newsletter-content" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Image src="/HubSpot-Symbol.png" alt="HubSpot" width={32} height={32} className="object-contain" />
            <Image src="/Salesforce.com_logo.svg.png" alt="Salesforce" width={32} height={32} className="object-contain" />
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xl">K</div>
            Newsletter Content
          </h2>
          
          <SectionIntro 
            whatIsThisFor={sectionIntros.newsletters}
            sectionId="newsletters"
            videoUrl="https://drive.google.com/file/d/1vtxH3UXdzaS8R99dRaPcy3Op1d1SxQWJ/preview"
          />
          
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {newsletterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveNewsletterTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activeNewsletterTab === tab.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {outputs.newsletters && outputs.newsletters[activeNewsletterTab as keyof typeof outputs.newsletters] ? (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="prose prose-lg max-w-none text-gray-900 [&_p]:mb-6 [&_p]:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {outputs.newsletters[activeNewsletterTab as keyof typeof outputs.newsletters]}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <ErrorPlaceholder assetType={`Newsletter ${newsletterTabs.find(t => t.id === activeNewsletterTab)?.label}`} />
          )}
        </section>

        {/* YouTube Video Scripts */}
        <section id="youtube-scripts" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 159 110" fill="none">
              <path d="M154,17.5c-1.82-6.73-7.07-12-13.8-13.8C128.47,0.47,79,0,79,0S29.53,0.47,17.8,3.7C11.07,5.52,5.82,10.77,4,17.5 C0.78,29.23,0,50.16,0,50.16s0.78,21.89,4,33.63c1.82,6.73,7.07,12,13.8,13.8C29.53,100.53,79,101,79,101s49.47-0.47,61.2-3.7 c6.73-1.82,12-7.07,13.8-13.8C157.22,72.05,159,50.16,159,50.16S157.22,29.23,154,17.5z" fill="#FF0000"/>
              <path d="M63.5,71.12l41-21.12l-41-21.12V71.12z" fill="white"/>
            </svg>
            YouTube Video Scripts
          </h2>
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">How do I use this in real life?</h3>
            <ul className="space-y-2">
              {sectionIntros.youtubeScripts.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="text-green-600 mt-0.5 flex-shrink-0 text-lg">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {outputs.youtube_scripts?.longForm ? (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="prose prose-lg max-w-none text-gray-900 [&_p]:mb-6 [&_p]:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {outputs.youtube_scripts.longForm}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <ErrorPlaceholder assetType="YouTube Video Script" />
          )}
        </section>

        {/* Call Prep - WITH QUESTION HIGHLIGHTING */}
        <section id="call-prep" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Call Prep</h2>
          
          <SectionIntro 
            whatIsThisFor={sectionIntros.callPrep}
            sectionId="call-prep"
            videoUrl="https://drive.google.com/file/d/1XYNwjRicEUyPlO3Jp9KuzQjLuOhSOQ2W/preview"
          />
          
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
                          p: ({children, ...props}) => {
                            const text = String(children);
                            const isQuestion = text.startsWith('Questions:') || 
                                             text.startsWith('Ask:') ||
                                             text.match(/^[-•]\s*.+\?$/) ||
                                             (text.trim().endsWith('?') && text.length < 200);
                            if (isQuestion) {
                              return (
                                <p {...props} className="font-bold italic text-fo-orange text-lg border-l-4 border-fo-orange pl-4 my-4">
                                  {children}
                                </p>
                              );
                            }
                            return <p {...props}>{children}</p>;
                          },
                          li: ({children, ...props}) => {
                            const text = String(children);
                            const isQuestion = text.trim().endsWith('?');
                            if (isQuestion) {
                              return (
                                <li {...props} className="font-bold italic text-fo-orange">
                                  {children}
                                </li>
                              );
                            }
                            return <li {...props}>{children}</li>;
                          }
                        }}
                      >
                        {outputs.call_prep.callScript
                          .replace(/Explore:/g, 'Ask:')
                          .replace(/Discovery Questions:/g, 'Ask:')
                          .replace(/\\n/g, '\n')
                          .replace(/(\r\n|\r|\n)/g, '\n\n')
                          .trim()
                        }
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
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children, ...props}) => {
                            const text = String(children);
                            const isObjectionHeader = text.startsWith('Objection');
                            return (
                              <h1 {...props} className={`text-xl font-bold mb-4 ${isObjectionHeader ? 'underline text-purple-700' : 'text-gray-900'}`}>
                                {children}
                              </h1>
                            );
                          },
                          h2: ({children, ...props}) => {
                            const text = String(children);
                            const isObjectionHeader = text.startsWith('Objection');
                            return (
                              <h2 {...props} className={`text-lg font-bold mb-3 ${isObjectionHeader ? 'underline text-purple-700' : 'text-gray-900'}`}>
                                {children}
                              </h2>
                            );
                          },
                          h3: ({children, ...props}) => {
                            const text = String(children);
                            const isObjectionHeader = text.startsWith('Objection');
                            return (
                              <h3 {...props} className={`text-md font-bold mb-2 ${isObjectionHeader ? 'underline text-purple-700' : 'text-gray-900'}`}>
                                {children}
                              </h3>
                            );
                          },
                          strong: ({children, ...props}) => {
                            const text = String(children);
                            const isObjectionHeader = text.startsWith('Objection');
                            return (
                              <strong {...props} className={`font-bold ${isObjectionHeader ? 'underline text-purple-700' : 'text-gray-900'}`}>
                                {children}
                              </strong>
                            );
                          },
                          p: ({children, ...props}) => {
                            const text = String(children);
                            const isQuestion = text.startsWith('Questions:') || 
                                             text.startsWith('Ask:') ||
                                             text.match(/^[-•]\s*.+\?$/) ||
                                             (text.trim().endsWith('?') && text.length < 200);
                            if (isQuestion) {
                              return (
                                <p {...props} className="font-bold italic text-fo-orange text-lg border-l-4 border-fo-orange pl-4 my-4">
                                  {children}
                                </p>
                              );
                            }
                            return <p {...props}>{children}</p>;
                          },
                          li: ({children, ...props}) => {
                            const text = String(children);
                            const isQuestion = text.trim().endsWith('?');
                            if (isQuestion) {
                              return (
                                <li {...props} className="font-bold italic text-fo-orange">
                                  {children}
                                </li>
                              );
                            }
                            return <li {...props}>{children}</li>;
                          },
                        }}
                      >
                        {outputs.call_prep.objectionHandling
                          .replace(/Discovery Questions:/g, 'Ask:')
                          .replace(/\\n/g, '\n')
                          .replace(/(\r\n|\r|\n)/g, '\n\n')
                          .trim()
                        }
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ErrorPlaceholder assetType="Call Prep Example" />
          )}
        </section>

        {/* Strategic Elements Appendix - FULL DETAIL (same as results page) */}
        <section id="strategic-elements" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-24">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Strategic Elements Appendix</h2>
          <p className="text-gray-600 mb-6">Foundational library materials created in the Octave workspace</p>

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
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-900 pl-4">
                        {(outputs.service_offering as any).data.customerBenefits.map((ben: string, i: number) => (
                          <li key={i}>{ben}</li>
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
                              <span className={`font-semibold ${q.fitType === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>{q.fitType}</span> • Weight: {q.weight}
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
                              <span className={`font-semibold ${q.fitType === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>{q.fitType}</span> • Weight: {q.weight}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Personas */}
            {outputs.personas && outputs.personas.length > 0 && (
              <div id="personas" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Personas ({outputs.personas.length})</h3>
                <div className="space-y-6">
                  {outputs.personas.map((persona: any, index: number) => (
                    <div key={index} className="bg-white p-5 rounded-lg border border-purple-200 shadow-sm">
                      <h4 className="font-bold text-lg text-fo-primary mb-3">{persona.name}</h4>
                      {persona.description && <p className="text-sm text-gray-700 mb-3">{persona.description}</p>}
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {persona.data?.commonJobTitles && persona.data.commonJobTitles.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-2">Common Job Titles:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                              {persona.data.commonJobTitles.map((title: string, i: number) => <li key={i}>{title}</li>)}
                            </ul>
                          </div>
                        )}
                        {persona.data?.painPoints && persona.data.painPoints.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-2">Pain Points:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                              {persona.data.painPoints.map((pain: string, i: number) => <li key={i}>{pain}</li>)}
                            </ul>
                          </div>
                        )}
                        {persona.data?.keyObjectives && persona.data.keyObjectives.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-2">Key Objectives:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                              {persona.data.keyObjectives.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                            </ul>
                          </div>
                        )}
                        {persona.data?.whyWeMatterToThem && persona.data.whyWeMatterToThem.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-2">Why We Matter To Them:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                              {persona.data.whyWeMatterToThem.map((why: string, i: number) => <li key={i}>{why}</li>)}
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

            {/* Use Cases */}
            {outputs.use_cases && outputs.use_cases.length > 0 && (
              <div id="use-cases" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Use Cases ({outputs.use_cases.length})</h3>
                <div className="space-y-6">
                  {outputs.use_cases.map((useCase: any, index: number) => (
                    <div key={index} className="bg-white p-5 rounded-lg border border-green-200 shadow-sm">
                      <h4 className="font-bold text-lg text-fo-primary mb-2">{useCase.name}</h4>
                      {useCase.description && <p className="text-sm text-gray-700 mb-3">{useCase.description}</p>}
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
                              {useCase.data.scenarios.map((scenario: string, i: number) => <li key={i}>{scenario}</li>)}
                            </ul>
                          </div>
                        )}
                        {useCase.data?.desiredOutcomes && useCase.data.desiredOutcomes.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-2">Desired Outcomes:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                              {useCase.data.desiredOutcomes.map((outcome: string, i: number) => <li key={i}>{outcome}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Segments */}
            {outputs.segments && outputs.segments.length > 0 && (
              <div id="segments" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Market Segments ({outputs.segments.length})</h3>
                <div className="space-y-6">
                  {outputs.segments.map((segment: any, index: number) => (
                    <div key={index} className="bg-white p-5 rounded-lg border border-orange-200 shadow-sm">
                      <h4 className="font-bold text-lg text-fo-primary mb-2">{segment.name}</h4>
                      {segment.description && <p className="text-sm text-gray-700 mb-3">{segment.description}</p>}
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
                              <div><p className="font-semibold">Revenue:</p><p>{segment.data.firmographics.revenue.join(', ')}</p></div>
                            )}
                            {segment.data.firmographics.industry && segment.data.firmographics.industry.length > 0 && (
                              <div><p className="font-semibold">Industry:</p><p>{segment.data.firmographics.industry.join(', ')}</p></div>
                            )}
                            {segment.data.firmographics.employees && segment.data.firmographics.employees.length > 0 && (
                              <div><p className="font-semibold">Employees:</p><p>{segment.data.firmographics.employees.join(', ')}</p></div>
                            )}
                            {segment.data.firmographics.geography && segment.data.firmographics.geography.length > 0 && (
                              <div><p className="font-semibold">Geography:</p><p>{segment.data.firmographics.geography.join(', ')}</p></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client References */}
            {outputs.client_references && outputs.client_references.length > 0 && (
              <div id="client-references" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Client References ({outputs.client_references.length})</h3>
                <div className="space-y-6">
                  {outputs.client_references.map((reference: any, index: number) => (
                    <div key={index} className="bg-white p-5 rounded-lg border border-red-200 shadow-sm">
                      <h4 className="font-bold text-lg text-fo-primary mb-2">{reference.name || reference.internalName || 'Unnamed Reference'}</h4>
                      {reference.description && <p className="text-sm text-gray-700 mb-3">{reference.description}</p>}
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
                        {reference.data?.keyStats && reference.data.keyStats.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-2">Key Stats:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                              {reference.data.keyStats.map((stat: string, i: number) => <li key={i}>{stat}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitors */}
            {outputs.competitors && outputs.competitors.length > 0 && (
              <div id="competitors" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Competitive Analysis ({outputs.competitors.length})</h3>
                <div className="space-y-6">
                  {outputs.competitors.map((competitor: any, index: number) => (
                    <div key={index} className="bg-white p-5 rounded-lg border border-orange-200 shadow-sm">
                      <h4 className="font-bold text-lg text-fo-primary mb-2">{competitor.name || competitor.internalName || competitor.companyName || 'Unnamed Competitor'}</h4>
                      {competitor.companyWebsite && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Website:</span>{' '}
                          <a href={competitor.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{competitor.companyWebsite}</a>
                        </p>
                      )}
                      {competitor.description && <p className="text-sm text-gray-700 mb-3">{competitor.description}</p>}
                      <div className="space-y-3 mt-4">
                        {competitor.data?.comparativeStrengths && competitor.data.comparativeStrengths.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-1">Their Strengths:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {competitor.data.comparativeStrengths.map((strength: string, idx: number) => <li key={idx}>{strength}</li>)}
                            </ul>
                          </div>
                        )}
                        {competitor.data?.keyDifferentiators && competitor.data.keyDifferentiators.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-1">Key Differentiators:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {competitor.data.keyDifferentiators.map((diff: string, idx: number) => <li key={idx}>{diff}</li>)}
                            </ul>
                          </div>
                        )}
                        {competitor.data?.reasonsWeWin && competitor.data.reasonsWeWin.length > 0 && (
                          <div className="bg-green-50 p-3 rounded-md border border-green-200">
                            <p className="font-semibold text-green-800 text-sm mb-1">🎯 Why We Win:</p>
                            <ul className="list-disc list-inside text-sm text-green-700 space-y-1">
                              {competitor.data.reasonsWeWin.map((reason: string, idx: number) => <li key={idx}>{reason}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Playbooks */}
            {outputs.campaign_ideas && outputs.campaign_ideas.length > 0 && (
              <div id="playbooks" className="border border-gray-200 rounded-lg p-6 bg-white scroll-mt-24">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Playbooks ({outputs.campaign_ideas.length})</h3>
                <p className="text-sm text-gray-600 mb-6">Sales playbooks created from segments, personas, and use cases</p>
                <div className="space-y-6">
                  {(enrichedCampaignIdeas || outputs.campaign_ideas).map((playbook: any, index: number) => (
                    <div key={index} className="bg-white p-5 rounded-lg border border-blue-200 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-bold text-lg text-fo-primary">{playbook.title}</h4>
                        {playbook.status && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">{playbook.status}</span>
                        )}
                      </div>
                      {playbook.description && <p className="text-sm text-gray-700 mb-3">{playbook.description}</p>}
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
                                {valueProp.personaName && <p className="font-semibold text-green-800 text-xs mb-1">{valueProp.personaName}</p>}
                                <p className="text-sm text-gray-700">{valueProp.value || valueProp}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {playbook.referenceNames && playbook.referenceNames.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="font-semibold text-gray-700 text-sm mb-2">Client References Included ({playbook.referencesIncluded || playbook.referenceNames.length}):</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                            {playbook.referenceNames.map((refName: string, idx: number) => <li key={idx}>{refName}</li>)}
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
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      {playbook.oId && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500"><span className="font-semibold">Octave ID:</span> {playbook.oId}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Admin Footer */}
        <div className="bg-gray-800 text-white rounded-lg p-6 text-center">
          <p className="text-sm mb-2">⚠️ Admin View Only</p>
          <p className="text-xs text-gray-400">This page does NOT trigger the 14-day countdown timer for the client.</p>
        </div>
        
        </div> {/* End of lg:ml-72 main content wrapper */}
      </div>
    </div>
  );
}
