'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ClaireImage from '../Claire_v1.png';

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
  created_at: string;
}

const ErrorPlaceholder = ({ assetType }: { assetType: string }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
    <div className="text-yellow-600 mb-2">⚠️</div>
    <p className="text-gray-700 text-sm">
      I need more context before I create <strong>{assetType}</strong>. You can always book a GTM Kickoff Call on the previous page and we can review this together.
    </p>
  </div>
);

export default function ResultsPage() {
  const [outputs, setOutputs] = useState<OctaveOutputs | null>(null);
  const [loading, setLoading] = useState(true);
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
        setOutputs(data);
      }
    } catch (err) {
      console.error('Error in loadResults:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fo-light to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-secondary text-lg">Loading your personalized strategy...</p>
        </div>
      </div>
    );
  }

  if (!outputs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-lg shadow-fo-shadow p-12">
            <div className="text-6xl mb-4">🤔</div>
            <h1 className="text-3xl font-bold text-fo-primary mb-4">
              No Strategy Found
            </h1>
            <p className="text-fo-secondary mb-8">
              Please complete the questionnaire first to generate your personalized CRO strategy.
            </p>
            <button
              onClick={() => router.push('/questionnaire')}
              className="px-8 py-3 bg-gradient-to-r from-fo-primary to-fo-secondary text-white rounded-lg hover:opacity-90 font-semibold"
            >
              Start Questionnaire
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Header with Claire */}
        <div className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image
                src={ClaireImage}
                alt="Claire"
                width={96}
                height={96}
                className="object-cover scale-110"
                style={{ objectPosition: 'center 10%' }}
                priority
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-fo-primary mb-2">
                {outputs.company_name}&apos;s CRO Strategy
              </h1>
              <p className="text-fo-secondary">
                Built by Claire • Generated on {new Date(outputs.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Ideas */}
        <section className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 flex items-center gap-3">
            <span className="text-3xl">💡</span>
            Campaign Ideas
          </h2>
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
        <section className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 flex items-center gap-3">
            <span className="text-3xl">👥</span>
            Real Prospect List
          </h2>
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
        <section className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 flex items-center gap-3">
            <span className="text-3xl">📧</span>
            Outbound Copy (Cold Emails)
          </h2>
          
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
                      {email.body}
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
        <section className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 flex items-center gap-3">
            <span className="text-3xl">📱</span>
            LinkedIn Post Copy
          </h2>
          
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
        <section className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 flex items-center gap-3">
            <span className="text-3xl">💬</span>
            LinkedIn Connection Copy
          </h2>
          
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
        <section className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 flex items-center gap-3">
            <span className="text-3xl">📰</span>
            Newsletter Copy
          </h2>
          
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
        <section className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 flex items-center gap-3">
            <span className="text-3xl">📞</span>
            Sample Call-Prep
          </h2>
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

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-fo-primary to-fo-secondary text-white rounded-lg shadow-fo-shadow p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Turn It On?</h2>
          <p className="mb-6 text-white/90">
            Book your GTM Kickoff Call with Corey to activate your personalized CRO strategy
          </p>
          <button
            onClick={() => window.close()}
            className="bg-white text-fo-primary px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            ← Back to Booking Page
          </button>
        </div>
      </div>
    </div>
  );
}
