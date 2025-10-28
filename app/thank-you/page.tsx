'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import ClaireImage from '../Claire_v1.png';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function ThankYouPage() {
  useEffect(() => {
    // Load HubSpot Meetings Embed Script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-fo-primary to-fo-accent rounded-full flex items-center justify-center mb-6">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-fo-primary mb-4">
            Thank You for Completing Your Onboarding!
          </h1>
          <p className="text-xl text-fo-secondary max-w-2xl mx-auto">
            Thank you for filling out the onboarding form. Our GTM engineers are now setting up your Octave workspace.
          </p>
        </div>

        {/* Video Section */}
        <div className="bg-white rounded-lg shadow-fo-shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 text-center">
            A Message from Claire
          </h2>
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center relative overflow-hidden">
            <Image
              src={ClaireImage}
              alt="Claire"
              fill
              className="object-cover scale-110"
              style={{ objectPosition: 'center 15%' }}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center text-white">
                <div className="bg-black/40 backdrop-blur-sm rounded-lg px-8 py-6">
                  <p className="text-2xl font-bold mb-2">Thank You Video</p>
                  <p className="text-lg">Coming Soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HubSpot Booking Section */}
        <div className="bg-white rounded-lg shadow-fo-shadow p-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 text-center">
            Schedule Your GTM Kickoff Call
          </h2>
          <p className="text-fo-secondary text-center mb-8">
            Book a call with Corey to discuss your new Octave workspace and next steps.
          </p>
          
          {/* HubSpot Meetings Embed */}
          <div className="meetings-iframe-container" data-src="https://meetings.hubspot.com/corey-peck/gtm-kickoff-corey-ali?embed=true"></div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <div className="bg-fo-primary text-white rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-3">What Happens Next?</h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-semibold mb-2">1. Workspace Setup</div>
                <p>Our team is configuring your personalized Octave workspace with your specific requirements.</p>
              </div>
              <div>
                <div className="font-semibold mb-2">2. GTM Strategy</div>
                <p>{"We'll"} develop a customized go-to-market strategy based on your questionnaire responses.</p>
              </div>
              <div>
                <div className="font-semibold mb-2">3. Implementation</div>
                <p>Your fractional revenue officer will begin implementing the strategy within 48 hours.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center text-fo-secondary">
          <p className="mb-2">
            Questions? Contact your Fractional Ops representative or email{' '}
            <a href="mailto:support@fractionalops.com" className="text-fo-accent hover:underline">
              support@fractionalops.com
            </a>
          </p>
          <p className="text-sm">
            This onboarding process is powered by Fractional Ops and Octave.
          </p>
        </div>
      </div>
    </div>
  );
}
