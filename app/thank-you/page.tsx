'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import ClaireImage from '../Claire_v2.png';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function ThankYouPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progress, setProgress] = useState(0);

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

  const handleGenerateStrategy = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('Initializing...');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Please log in to generate your strategy.');
        setIsGenerating(false);
        return;
      }

      // Simulate progress updates (since we do not have SSE yet)
      const progressSteps = [
        { step: 'Listing agents in workspace...', progress: 7 },
        { step: 'Extracting persona job titles...', progress: 13 },
        { step: 'Running Prospector Agent...', progress: 20 },
        { step: 'Generating Cold Email: Personalized Solutions...', progress: 27 },
        { step: 'Generating Cold Email: Lead Magnet Short...', progress: 33 },
        { step: 'Generating Cold Email: Local/Same City...', progress: 40 },
        { step: 'Generating Cold Email: Problem/Solution...', progress: 47 },
        { step: 'Generating Cold Email: Lead Magnet Long...', progress: 53 },
        { step: 'Generating LinkedIn Post: Inspiring...', progress: 60 },
        { step: 'Generating LinkedIn Post: Promotional...', progress: 67 },
        { step: 'Generating LinkedIn Post: Actionable...', progress: 73 },
        { step: 'Generating LinkedIn DM: Newsletter CTA...', progress: 80 },
        { step: 'Generating LinkedIn DM: Lead Magnet CTA...', progress: 87 },
        { step: 'Generating Newsletter: Tactical...', progress: 93 },
        { step: 'Generating Newsletter: Leadership...', progress: 97 },
        { step: 'Generating Call Prep...', progress: 99 },
        { step: 'Saving results...', progress: 100 },
      ];

      let currentStepIndex = 0;
      const progressInterval = setInterval(() => {
        if (currentStepIndex < progressSteps.length) {
          setCurrentStep(progressSteps[currentStepIndex].step);
          setProgress(progressSteps[currentStepIndex].progress);
          currentStepIndex++;
        }
      }, 8000); // Update every 8 seconds (approx 2 min total)

      // Call the generate-strategy API
      const response = await fetch('/api/octave/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setCurrentStep('Complete! Opening results...');
        setProgress(100);
        
        // Wait a moment then open results
        setTimeout(() => {
          window.open('/results', '_blank');
          setIsGenerating(false);
        }, 1000);
      } else {
        const error = await response.json();
        console.error('Strategy generation failed:', error);
        alert(`Failed to generate strategy: ${error.error || 'Unknown error'}`);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error generating strategy:', error);
      alert('An error occurred while generating your strategy. Please try again.');
      setIsGenerating(false);
    }
  };

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
            💙 A Message from Claire
          </h2>
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden shadow-md">
            <iframe
              src="https://drive.google.com/file/d/1dwl4jfsXEZdujPDJwBUOGEVFmdadHdxC/preview"
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
              style={{ border: 'none' }}
            />
          </div>
        </div>

        {/* View Strategy Button - Above HubSpot */}
        <div className="bg-gradient-to-r from-fo-primary to-fo-secondary rounded-lg shadow-fo-shadow p-8 mb-8 text-center">
          <div className="mb-4">
            <span className="text-5xl">🎯</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Generate Your CRO Strategy
          </h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Click below to have Claire build your personalized strategy with campaign ideas, prospect lists, email sequences, and more.
          </p>
          <button
            onClick={handleGenerateStrategy}
            disabled={isGenerating}
            className="bg-white text-fo-primary px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-fo-primary border-t-transparent rounded-full"></div>
                Generating...
              </>
            ) : (
              <>
                <span>🎯</span>
                CRO Strategy Built By Claire - Click to Generate
                <span>→</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Modal */}
        {isGenerating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-fo-primary to-fo-secondary rounded-full mb-4">
                  <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full"></div>
                </div>
                
                {/* Claire Headshot */}
                <div className="flex justify-center mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-fo-primary shadow-lg">
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
                </div>
                
                <h3 className="text-2xl font-bold text-fo-primary mb-2">
                  I&apos;m <span className="bg-gradient-to-r from-fo-primary to-fo-secondary bg-clip-text text-transparent">Generating Your Strategy</span>
                </h3>
                <p className="text-fo-secondary mb-2">
                  This usually takes me <span className="line-through text-gray-400">2 minutes</span>
                </p>
                <p className="text-red-600 font-semibold text-lg">
                  Please don&apos;t close this window.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-fo-secondary mb-2">
                  <span>{currentStep}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-fo-primary to-fo-secondary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Agent Status Grid */}
              <div className="bg-fo-light rounded-lg p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${progress >= 20 ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`}></div>
                    <span className={progress >= 20 ? 'text-fo-primary' : 'text-fo-secondary'}>Prospector</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${progress >= 53 ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`}></div>
                    <span className={progress >= 53 ? 'text-fo-primary' : 'text-fo-secondary'}>Cold Emails (5)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${progress >= 73 ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`}></div>
                    <span className={progress >= 73 ? 'text-fo-primary' : 'text-fo-secondary'}>LinkedIn Posts (3)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${progress >= 87 ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`}></div>
                    <span className={progress >= 87 ? 'text-fo-primary' : 'text-fo-secondary'}>LinkedIn DMs (2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${progress >= 97 ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`}></div>
                    <span className={progress >= 97 ? 'text-fo-primary' : 'text-fo-secondary'}>Newsletters (2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${progress >= 99 ? 'bg-green-500' : 'bg-gray-300 animate-pulse'}`}></div>
                    <span className={progress >= 99 ? 'text-fo-primary' : 'text-fo-secondary'}>Call Prep</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center text-sm">
                <p className="text-fo-secondary">
                  ⚡ <span className="line-through text-gray-400">Running 14 AI agents in parallel to build your custom strategy</span>
                </p>
                <p className="text-red-600 font-medium mt-2">
                  I&apos;m setting up 14 workflows <span className="text-fo-secondary">to build real examples for you.</span>
                </p>
              </div>
            </div>
          </div>
        )}

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
