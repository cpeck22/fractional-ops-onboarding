'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
  created_at: string;
}

const ErrorPlaceholder = ({ assetType }: { assetType: string }) => (
  <div className="bg-fo-light border-l-4 border-fo-orange rounded-lg p-6">
    <div className="text-fo-orange mb-2 font-bold">⚠️ Need more context</div>
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
  const router = useRouter();

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
        
        const parsedData = {
          ...data,
          service_offering: typeof data.service_offering === 'string' 
            ? JSON.parse(data.service_offering) 
            : data.service_offering,
          segments: (() => {
            let segs = typeof data.segments === 'string' ? JSON.parse(data.segments) : data.segments;
            // Parse the .data field inside each segment
            if (Array.isArray(segs)) {
              segs = segs.map((seg: any) => ({
                ...seg,
                data: typeof seg.data === 'string' ? JSON.parse(seg.data) : seg.data
              }));
            }
            return segs;
          })(),
          client_references: (() => {
            let refs = typeof data.client_references === 'string' ? JSON.parse(data.client_references) : data.client_references;
            // Parse the .data field inside each reference
            if (Array.isArray(refs)) {
              refs = refs.map((ref: any) => ({
                ...ref,
                data: typeof ref.data === 'string' ? JSON.parse(ref.data) : ref.data
              }));
            }
            return refs;
          })(),
          personas: typeof data.personas === 'string'
            ? JSON.parse(data.personas)
            : data.personas,
          use_cases: typeof data.use_cases === 'string'
            ? JSON.parse(data.use_cases)
            : data.use_cases
        };
        
        console.log('✅ Parsed data:', {
          service_offering_type: typeof parsedData.service_offering,
          segments_count: Array.isArray(parsedData.segments) ? parsedData.segments.length : 'not array',
          segments_first_data_type: parsedData.segments?.[0]?.data ? typeof parsedData.segments[0].data : 'none',
          references_count: Array.isArray(parsedData.client_references) ? parsedData.client_references.length : 'not array',
          references_first_data_type: parsedData.client_references?.[0]?.data ? typeof parsedData.client_references[0].data : 'none',
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        
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
              className="px-6 py-3 bg-fo-orange text-white rounded-lg hover:bg-opacity-90 font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-lg"
            >
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <span className="text-xl">📄</span>
                  Download Report
                </>
              )}
            </button>
          </div>
        </div>

        {/* Campaign Ideas */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-primary">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            💡 Campaign Workflows
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.campaignIdeas}
            sectionId="campaign-ideas"
          />
          
          {outputs.campaign_ideas && outputs.campaign_ideas.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {outputs.campaign_ideas.map((campaign: any, index: number) => (
                <div key={index} className="bg-gradient-to-br from-fo-light to-white p-6 rounded-lg border border-fo-primary/20">
                  <h3 className="font-bold text-lg text-fo-primary mb-2">
                    Campaign {campaign.id}: {campaign.title}
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
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-green">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            👥 Qualified Prospects
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.qualifiedProspects}
            sectionId="qualified-prospects"
          />
          
          {outputs.prospect_list && outputs.prospect_list.length > 0 ? (
            <>
              <p className="text-fo-secondary mb-4">
                Found <strong>{outputs.prospect_list.length}</strong> qualified prospects matching your ideal customer profile
              </p>
              <div className="space-y-3">
                {outputs.prospect_list.slice(0, 10).map((prospect: any, index: number) => (
                  <div key={index} className="bg-fo-light p-4 rounded-lg border border-gray-200 hover:border-fo-primary transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-fo-primary">{prospect.name || `Prospect ${index + 1}`}</p>
                        <p className="text-sm text-fo-secondary">{prospect.title}</p>
                        <p className="text-sm text-gray-500">{prospect.company}</p>
                      </div>
                      {prospect.linkedIn && (
                        <a 
                          href={prospect.linkedIn} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          LinkedIn →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {outputs.prospect_list.length > 10 && (
                <p className="text-sm text-fo-secondary mt-4 text-center">
                  + {outputs.prospect_list.length - 10} more prospects available in your Octave workspace
                </p>
              )}
            </>
          ) : (
            <ErrorPlaceholder assetType="Prospect List" />
          )}
        </section>

        {/* Cold Email Sequences with Tabs */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-orange">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            📧 Cold Email Sequences
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.coldEmails}
            sectionId="cold-emails"
          />
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {emailTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveEmailTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activeEmailTab === tab.id
                    ? 'bg-fo-primary text-white'
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
                  <div className="bg-fo-primary text-white px-6 py-3">
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
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-secondary">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            📱 LinkedIn Posts
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.linkedinPosts}
            sectionId="linkedin-posts"
          />
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {postTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePostTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activePostTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Post Content */}
          {outputs.linkedin_posts && outputs.linkedin_posts[activePostTab as keyof typeof outputs.linkedin_posts] ? (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {outputs.linkedin_posts[activePostTab as keyof typeof outputs.linkedin_posts]}
              </pre>
            </div>
          ) : (
            <ErrorPlaceholder assetType={`${postTabs.find(t => t.id === activePostTab)?.label}`} />
          )}
        </section>

        {/* LinkedIn DMs with Tabs */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-primary">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            💬 LinkedIn DMs
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.linkedinDMs}
            sectionId="linkedin-dms"
          />
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {dmTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDMTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activeDMTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* DM Content */}
          {outputs.linkedin_dms && outputs.linkedin_dms[activeDMTab as keyof typeof outputs.linkedin_dms] ? (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-lg border-2 border-indigo-200">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {outputs.linkedin_dms[activeDMTab as keyof typeof outputs.linkedin_dms]}
              </pre>
            </div>
          ) : (
            <ErrorPlaceholder assetType={`LinkedIn DM ${dmTabs.find(t => t.id === activeDMTab)?.label}`} />
          )}
        </section>

        {/* Newsletters with Tabs */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-green">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            📰 Newsletter Content
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.newsletters}
            sectionId="newsletters"
          />
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {newsletterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveNewsletterTab(tab.id)}
                className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${
                  activeNewsletterTab === tab.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Newsletter Content */}
          {outputs.newsletters && outputs.newsletters[activeNewsletterTab as keyof typeof outputs.newsletters] ? (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-lg border-2 border-orange-200">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {outputs.newsletters[activeNewsletterTab as keyof typeof outputs.newsletters]}
              </pre>
            </div>
          ) : (
            <ErrorPlaceholder assetType={`Newsletter ${newsletterTabs.find(t => t.id === activeNewsletterTab)?.label}`} />
          )}
        </section>

        {/* Call Prep */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-orange">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            📞 Call Prep
          </h2>
          
          {/* Section Intro */}
          <SectionIntro 
            whatIsThisFor={sectionIntros.callPrep}
            sectionId="call-prep"
          />
          
          {outputs.call_prep ? (
            <div className="space-y-6">
              {outputs.call_prep.discoveryQuestions && outputs.call_prep.discoveryQuestions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-fo-primary mb-3">Discovery Questions:</h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                    {outputs.call_prep.discoveryQuestions.map((q: string, i: number) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {outputs.call_prep.callScript && (
                <div>
                  <h3 className="font-semibold text-fo-primary mb-3">Call Script:</h3>
                  <div className="bg-fo-light p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                      {outputs.call_prep.callScript}
                    </pre>
                  </div>
                </div>
              )}
              
              {outputs.call_prep.objectionHandling && (
                <div>
                  <h3 className="font-semibold text-fo-primary mb-3">Objection Handling:</h3>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                      {outputs.call_prep.objectionHandling}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ErrorPlaceholder assetType="Call Prep Example" />
          )}
        </section>

        {/* Misc. Section (formerly Workspace Library) */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-fo-accent">
          <h2 className="text-2xl font-bold text-fo-dark mb-6">
            📋 Library Assets
          </h2>
          <p className="text-fo-secondary mb-6">
            Foundational library materials created in your Octave workspace
          </p>

          <div className="space-y-8">
            {/* Service Offering - FULL DETAIL */}
            {outputs.service_offering && (
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                <h3 className="text-xl font-bold text-fo-primary mb-4 flex items-center gap-2">
                  <span>🎯</span> Service Offering
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
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50">
                <h3 className="text-xl font-bold text-fo-primary mb-4 flex items-center gap-2">
                  <span>👥</span> Personas ({outputs.personas.length})
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
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gradient-to-br from-green-50 to-teal-50">
                <h3 className="text-xl font-bold text-fo-primary mb-4 flex items-center gap-2">
                  <span>✨</span> Use Cases ({outputs.use_cases.length})
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
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
                <h3 className="text-xl font-bold text-fo-primary mb-4 flex items-center gap-2">
                  <span>🎯</span> Market Segments ({outputs.segments.length})
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
              <div className="border-2 border-gray-300 rounded-lg p-6 bg-gradient-to-br from-red-50 to-pink-50">
                <h3 className="text-xl font-bold text-fo-primary mb-4 flex items-center gap-2">
                  <span>🏢</span> Client References ({outputs.client_references.length})
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
      </div>
    </div>
  );
}
