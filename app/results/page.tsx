'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import ClaireImage from '../Claire_v2.png';
import SectionIntro from '@/components/SectionIntro';

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
  };
  newsletters: {
    tactical: string;
    leadership: string;
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

export default function ResultsPage() {
  const [outputs, setOutputs] = useState<OctaveOutputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [activeEmailTab, setActiveEmailTab] = useState('personalizedSolutions');
  const [activePostTab, setActivePostTab] = useState('inspiring');
  const [activeDMTab, setActiveDMTab] = useState('newsletter');
  const [activeNewsletterTab, setActiveNewsletterTab] = useState('tactical');
  const [activeSection, setActiveSection] = useState('campaign-workflows');
  const router = useRouter();

  // Table of Contents sections
  const tocSections = [
    { id: 'campaign-workflows', label: 'Campaign Workflows', emoji: '' },
    { id: 'qualified-prospects', label: 'Qualified Prospects', emoji: '' },
    { id: 'cold-email-sequences', label: 'Cold Email Sequences', emoji: '' },
    { id: 'linkedin-posts', label: 'LinkedIn Posts', emoji: '' },
    { id: 'linkedin-dms', label: 'LinkedIn DMs', emoji: '' },
    { id: 'newsletter-content', label: 'Newsletter Content', emoji: '' },
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
  ];

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -20; // 20px above the section
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = tocSections.map(section => ({
        id: section.id,
        element: document.getElementById(section.id)
      })).filter(section => section.element !== null);

      // Find which section is currently in view
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
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
  }, []);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }

      const { data, error } = await supabase
        .from('octave_outputs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading results:', error);
      } else {
        // Parse JSONB fields that might be stringified
        console.log('📦 Raw data from Supabase:', data);
        
        console.log('🔍🔍🔍 RESULTS LOAD - RAW SERVICE OFFERING:');
        console.log('Type:', typeof data.service_offering);
        console.log('Value:', JSON.stringify(data.service_offering, null, 2));
        
        console.log('🔍🔍🔍 RESULTS LOAD - RAW SEGMENTS:');
        console.log('Type:', typeof data.segments);
        console.log('Is Array:', Array.isArray(data.segments));
        if (Array.isArray(data.segments) && data.segments[0]) {
          console.log('First segment:', JSON.stringify(data.segments[0], null, 2));
          console.log('First segment .data type:', typeof data.segments[0].data);
        }
        
        console.log('🔍🔍🔍 RESULTS LOAD - RAW CLIENT REFERENCES:');
        console.log('Type:', typeof data.client_references);
        console.log('Is Array:', Array.isArray(data.client_references));
        if (Array.isArray(data.client_references) && data.client_references[0]) {
          console.log('First reference:', JSON.stringify(data.client_references[0], null, 2));
          console.log('First reference .data type:', typeof data.client_references[0].data);
        }
        
        // Helper function to recursively parse nested .data fields (handles double nesting)
        const deepParseData = (obj: any): any => {
          // If it's a string, try to parse it
          if (typeof obj === 'string') {
            try {
              return deepParseData(JSON.parse(obj));
            } catch {
              return obj;
            }
          }
          // If it's an array, recursively parse each item
          if (Array.isArray(obj)) {
            return obj.map(item => deepParseData(item));
          }
          // If it's an object, recursively parse all properties (especially .data)
          if (obj && typeof obj === 'object') {
            const parsed: any = {};
            for (const key in obj) {
              if (key === 'data') {
                // Recursively parse .data fields (handles nested .data.data.data...)
                parsed[key] = deepParseData(obj[key]);
              } else {
                parsed[key] = obj[key];
              }
            }
            return parsed;
          }
          return obj;
        };

        const parsedData = {
          ...data,
          service_offering: deepParseData(data.service_offering),
          segments: deepParseData(data.segments),
          client_references: deepParseData(data.client_references),
          competitors: deepParseData(data.competitors),
          campaign_ideas: deepParseData(data.campaign_ideas),
          personas: deepParseData(data.personas),
          use_cases: deepParseData(data.use_cases)
        };
        
        console.log('✅ Parsed data:', {
          service_offering_type: typeof parsedData.service_offering,
          segments_count: Array.isArray(parsedData.segments) ? parsedData.segments.length : 'not array',
          segments_first_data_type: parsedData.segments?.[0]?.data ? typeof parsedData.segments[0].data : 'none',
          references_count: Array.isArray(parsedData.client_references) ? parsedData.client_references.length : 'not array',
          references_first_data_type: parsedData.client_references?.[0]?.data ? typeof parsedData.client_references[0].data : 'none',
          competitors_count: Array.isArray(parsedData.competitors) ? parsedData.competitors.length : 'not array',
          campaign_ideas_count: Array.isArray(parsedData.campaign_ideas) ? parsedData.campaign_ideas.length : 'not array',
        });
        
        console.log('🔍🔍🔍 RESULTS LOAD - PARSED SERVICE OFFERING:');
        console.log(JSON.stringify(parsedData.service_offering, null, 2));

        console.log('🔍🔍🔍 RESULTS LOAD - PARSED FIRST SEGMENT:');
        if (parsedData.segments?.[0]) {
          console.log(JSON.stringify(parsedData.segments[0], null, 2));
        }

        console.log('🔍🔍🔍 RESULTS LOAD - PARSED FIRST REFERENCE:');
        if (parsedData.client_references?.[0]) {
          console.log(JSON.stringify(parsedData.client_references[0], null, 2));
        }
        
        setOutputs(parsedData);
      }
    } catch (err) {
      console.error('Error in loadResults:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please sign in to download your strategy');
        return;
      }
      
      const response = await fetch('/api/download-strategy-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Claire_Strategy_${outputs?.company_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fo-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-dark text-lg font-semibold">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (!outputs) {
    return (
      <div className="min-h-screen bg-fo-light">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-lg shadow-lg p-12">
            <h1 className="text-3xl font-bold text-fo-dark mb-4">
              No workflows found.
            </h1>
            <p className="text-fo-text-secondary mb-8">
              Complete the questionnaire to build your revenue system.
            </p>
            <button
              onClick={() => router.push('/questionnaire')}
              className="px-8 py-3 bg-fo-orange text-white rounded-lg hover:bg-opacity-90 font-bold shadow-lg"
            >
              Start Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const emailTabs = [
    { id: 'personalizedSolutions', label: '3 Personalized Solutions', color: 'blue' },
    { id: 'leadMagnetShort', label: 'Lead Magnet (Short)', color: 'green' },
    { id: 'localCity', label: 'Local/Same City', color: 'purple' },
    { id: 'problemSolution', label: 'Problem/Solution', color: 'orange' },
    { id: 'leadMagnetLong', label: 'Lead Magnet (Long)', color: 'pink' }
  ];

  const postTabs = [
    { id: 'inspiring', label: 'Inspiring Post', color: 'blue' },
    { id: 'promotional', label: 'Promotional Post', color: 'green' },
    { id: 'actionable', label: 'Actionable Post', color: 'purple' }
  ];

  const dmTabs = [
    { id: 'newsletter', label: 'Newsletter CTA', color: 'blue' },
    { id: 'leadMagnet', label: 'Lead Magnet CTA', color: 'green' }
  ];

  const newsletterTabs = [
    { id: 'tactical', label: 'Tactical Writing', color: 'orange' },
    { id: 'leadership', label: 'Leadership Writing', color: 'purple' }
  ];

  // Section intro content
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
    ]
  };

  return (
    <div className="min-h-screen bg-fo-light">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
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
                {outputs.company_name}&apos;s Revenue Workflows
              </h1>
              <p className="text-fo-orange font-semibold text-sm mb-1">
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
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-lg"
            >
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  Download Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Campaign Ideas */}
        <section id="campaign-workflows" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Campaign Workflows
          </h2>
          
          {/* Section Intro */}
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

        {/* Prospect List */}
        <section id="qualified-prospects" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Qualified Prospects
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.qualifiedProspects}
            sectionId="qualified-prospects"
            videoUrl="https://drive.google.com/file/d/1V3T8gd6-y5OVB8nW0L9_9pjpqEAKzEda/preview"
          />
          
          {outputs.prospect_list && outputs.prospect_list.length > 0 ? (
            <>
              {(() => {
                // FILTER: Senior decision-makers with contact info
                const seniorityKeywords = ['owner', 'ceo', 'chief', 'president', 'vp', 'vice president', 'director', 'head', 'partner', 'operator', 'founder', 'managing', 'executive'];
                
                const fullyQualified = outputs.prospect_list.filter((p: any) => {
                  // Must have at least email OR mobile
                  const hasContact = p.email || p.mobile_number;
                  
                  // Must have senior title (contains any keyword)
                  const titleLower = (p.title || '').toLowerCase();
                  const isSenior = seniorityKeywords.some(keyword => titleLower.includes(keyword));
                  
                  return hasContact && isSenior;
                });

                // DEDUPLICATE: By company, keeping most senior person
                const deduped = Object.values(
                  fullyQualified.reduce((acc: any, prospect: any) => {
                    const company = prospect.company || 'Unknown';
                    
                    // If company not seen yet, or this person is more senior
                    if (!acc[company]) {
                      acc[company] = prospect;
                    } else {
                      // Determine seniority by currentSeniority field or job title keywords
                      const seniorityRanks: Record<string, number> = {
                        'C-Level': 1, 'VP': 2, 'Director': 3, 'Manager': 4, 'Individual Contributor': 5
                      };
                      
                      const currentSeniority = seniorityRanks[acc[company].currentSeniority] || 999;
                      const newSeniority = seniorityRanks[prospect.currentSeniority] || 999;
                      
                      // Lower number = more senior
                      if (newSeniority < currentSeniority) {
                        acc[company] = prospect;
                      }
                    }
                    
                    return acc;
                  }, {})
                );

                // LIMIT: Show max 50 contacts
                const finalList = deduped.slice(0, 50);
                
                return (
                  <>
                    <p className="text-gray-600 mb-4">
                      Found <strong>{finalList.length}</strong> fully qualified prospects (with LinkedIn, Email, and Mobile)
                    </p>
                    
                    <div className="space-y-3">
                      {finalList.map((prospect: any, index: number) => (
                  <div key={index} className="bg-fo-light p-4 rounded-lg border border-gray-200 hover:border-fo-primary transition-colors">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Left: Basic Info */}
                      <div>
                        <p className="font-semibold text-fo-primary">{prospect.name || `Prospect ${index + 1}`}</p>
                        <p className="text-sm text-fo-secondary">{prospect.title}</p>
                        <p className="text-sm text-gray-500">{prospect.company}</p>
                        
                        {/* LinkedIn */}
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
                      
                      {/* Right: Contact Info (ENRICHED DATA!) */}
                      <div className="space-y-2">
                        {/* Email */}
                        {prospect.email ? (
                          <div className="flex items-start gap-2">
                            <span className="text-green-600 text-sm">✓</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-500">Email</div>
                              <a 
                                href={`mailto:${prospect.email}`}
                                className="text-sm text-fo-primary hover:underline break-all"
                              >
                                {prospect.email}
                              </a>
                              {prospect.email_status && (
                                <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                                  prospect.email_status === 'valid' ? 'bg-green-100 text-green-700' :
                                  prospect.email_status === 'valid_catch_all' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {prospect.email_status.replace('_', ' ')}
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
                            <span className="text-green-600 text-sm">✓</span>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Mobile</div>
                              <a 
                                href={`tel:+${prospect.mobile_number}`}
                                className="text-sm text-fo-primary hover:underline"
                              >
                                +{prospect.mobile_number}
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
                        
                        {/* Email Provider */}
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
                  </>
                );
              })()}
              {outputs.prospect_list.length > 50 && (
                <p className="text-sm text-fo-secondary mt-4 text-center">
                  + {outputs.prospect_list.length - 10} more prospects with contact info available
                </p>
              )}
            </>
          ) : (
            <ErrorPlaceholder assetType="Prospect List" />
          )}
        </section>

        {/* Cold Email Sequences with Tabs */}
        <section id="cold-email-sequences" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              {/* Outlook logo */}
              <path d="M7 2h10c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm5 4c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="#0078D4"/>
            </svg>
            Cold Email Sequences
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.coldEmails}
            sectionId="cold-emails"
            videoUrl="https://drive.google.com/file/d/1t6tnBLxzvTkQXoW6ErnmDKMPwGyTq4sp/preview"
          />
          
          {/* Tabs */}
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

          {/* Email Content */}
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

        {/* LinkedIn Posts with Tabs */}
        <section id="linkedin-posts" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0A66C2">
              {/* LinkedIn logo */}
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
            </svg>
            LinkedIn Posts
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.linkedinPosts}
            sectionId="linkedin-posts"
            videoUrl="https://drive.google.com/file/d/108EHJ-Edh_YiXPw0AgkoTg5W5jkyyvQs/preview"
          />
          
          {/* Tabs */}
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

          {/* Post Content */}
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

        {/* LinkedIn DMs with Tabs */}
        <section id="linkedin-dms" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0A66C2">
              {/* LinkedIn logo */}
              <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
            </svg>
            LinkedIn DMs
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.linkedinDMs}
            sectionId="linkedin-dms"
            videoUrl="https://drive.google.com/file/d/1vtxH3UXdzaS8R99dRaPcy3Op1d1SxQWJ/preview"
          />
          
          {/* Tabs */}
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

          {/* DM Content */}
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

        {/* Newsletters with Tabs */}
        <section id="newsletter-content" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xl">
              K
            </div>
            Newsletter Content
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.newsletters}
            sectionId="newsletters"
            videoUrl="https://drive.google.com/file/d/1XYNwjRicEUyPlO3Jp9KuzQjLuOhSOQ2W/preview"
          />
          
          {/* Tabs */}
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

          {/* Newsletter Content */}
          {outputs.newsletters && outputs.newsletters[activeNewsletterTab as keyof typeof outputs.newsletters] ? (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="prose prose-lg max-w-none text-gray-900">
                <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                  {outputs.newsletters[activeNewsletterTab as keyof typeof outputs.newsletters].replace(/\n/g, '\n\n')}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <ErrorPlaceholder assetType={`Newsletter ${newsletterTabs.find(t => t.id === activeNewsletterTab)?.label}`} />
          )}
        </section>

        {/* Call Prep */}
        <section id="call-prep" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Call Prep
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.callPrep}
            sectionId="call-prep"
            videoUrl="https://drive.google.com/file/d/1q0SdjYjxpjfipFiYSGoL5QAPzqWZS-o0/preview"
          />
          
          {outputs.call_prep ? (
            <div className="space-y-6">
              {/* Discovery Questions - Each in its own dark shade box */}
              {outputs.call_prep.discoveryQuestions && outputs.call_prep.discoveryQuestions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Questions to Ask:</h3>
                  <div className="space-y-3">
                    {outputs.call_prep.discoveryQuestions.map((q: string, i: number) => (
                      <div key={i} className="bg-gray-800 text-white p-4 rounded-lg">
                        <p className="text-sm leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Call Script - with markdown rendering */}
              {outputs.call_prep.callScript && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Call Script:</h3>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="prose prose-lg max-w-none text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {outputs.call_prep.callScript.replace(/\n/g, '\n\n')}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Objection Handling - with markdown rendering */}
              {outputs.call_prep.objectionHandling && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Objection Handling:</h3>
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="prose prose-lg max-w-none text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                        {outputs.call_prep.objectionHandling.replace(/\n/g, '\n\n')}
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

        {/* Strategic Elements Appendix */}
        <section id="strategic-elements" className="bg-white rounded-lg shadow-lg p-8 mb-8 scroll-mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Strategic Elements Appendix
          </h2>
          <p className="text-gray-600 mb-6">
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
                      
                      {persona.internalName && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Internal Name:</span> {persona.internalName}
                        </p>
                      )}
                      
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
                      
                      {useCase.internalName && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Internal Name:</span> {useCase.internalName}
                        </p>
                      )}
                      
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
                      
                      {segment.internalName && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Internal Name:</span> {segment.internalName}
                        </p>
                      )}
                      
                      {segment.description && (
                        <p className="text-sm text-gray-700 mb-3">{segment.description}</p>
                      )}
                      
                      {segment.data?.fitExplanation && (
                        <div className="mb-3 bg-orange-50 p-3 rounded border border-orange-200">
                          <p className="font-semibold text-gray-700 text-sm mb-1">Fit Explanation:</p>
                          <p className="text-sm text-gray-600">{segment.data.fitExplanation}</p>
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
                      
                      {segment.qualifyingQuestions && segment.qualifyingQuestions.length > 0 && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-fo-primary font-semibold text-sm hover:underline">
                            View Qualifying Questions ({segment.qualifyingQuestions.length})
                          </summary>
                          <div className="mt-3 space-y-2 pl-4 border-l-2 border-orange-300">
                            {segment.qualifyingQuestions.map((q: any, i: number) => (
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
                      
                      {reference.name && reference.internalName && reference.name !== reference.internalName && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-semibold">Internal Name:</span> {reference.internalName}
                        </p>
                      )}
                      
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
                      <h4 className="font-bold text-lg text-fo-primary mb-2">{competitor.name || competitor.internalName || 'Unnamed Competitor'}</h4>
                      
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
                        {competitor.data?.businessModel && competitor.data.businessModel.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-1">Business Model:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {competitor.data.businessModel.map((model: string, idx: number) => (
                                <li key={idx}>{model}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
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
                        
                        {competitor.data?.comparativeWeaknesses && competitor.data.comparativeWeaknesses.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-1">Their Weaknesses:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {competitor.data.comparativeWeaknesses.map((weakness: string, idx: number) => (
                                <li key={idx}>{weakness}</li>
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
                        
                        {competitor.data?.customersWeWon && competitor.data.customersWeWon.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-1">Customers We Won From Them:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {competitor.data.customersWeWon.map((customer: string, idx: number) => (
                                <li key={idx}>{customer}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {competitor.data?.customersWeSwitched && competitor.data.customersWeSwitched.length > 0 && (
                          <div>
                            <p className="font-semibold text-gray-700 text-sm mb-1">Customers We Switched From Them:</p>
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                              {competitor.data.customersWeSwitched.map((customer: string, idx: number) => (
                                <li key={idx}>{customer}</li>
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
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-fo-accent text-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to execute?</h2>
          <p className="mb-6 text-white/90">
            Book your GTM Kickoff Call with Corey to activate these workflows
          </p>
          <button
            onClick={() => window.close()}
            className="bg-fo-orange text-white px-8 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-lg"
          >
            ← Back to Booking
          </button>
        </div>
        
        </div> {/* End of lg:ml-72 main content wrapper */}
      </div>
    </div>
  );
}
