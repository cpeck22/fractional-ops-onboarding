'use client';

import { useState } from 'react';
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
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white flex items-center justify-center px-4 py-8">
      <div className="max-w-3xl w-full">
        {/* Video Section */}
        <div className="bg-white rounded-lg shadow-fo-shadow p-8">
          <h2 className="text-2xl font-bold text-fo-primary mb-6 text-center">
            Build My Plan Now
          </h2>
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden shadow-md mb-6">
            <iframe
              src="https://drive.google.com/file/d/1dwl4jfsXEZdujPDJwBUOGEVFmdadHdxC/preview"
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
              style={{ border: 'none' }}
            />
          </div>
          
          {/* Build My Plan Now Button */}
          <div className="text-center">
            <button
              onClick={handleGenerateStrategy}
              disabled={isGenerating}
              className="bg-purple-600 text-white px-10 py-4 rounded-lg font-bold text-lg hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Generating...
                </>
              ) : (
                'Build My Plan Now'
              )}
            </button>
          </div>
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
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-fo-primary shadow-lg">
                    <Image
                      src={ClaireImage}
                      alt="Claire"
                      fill
                      className="object-cover"
                      style={{ objectPosition: 'center 35%' }}
                      priority
                    />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-fo-primary mb-2">
                  I&apos;m <span className="bg-gradient-to-r from-fo-primary to-fo-secondary bg-clip-text text-transparent">Generating Your Strategy</span>
                </h3>
                <p className="text-fo-secondary mb-2">
                  This usually takes me 2 minutes
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
                    <span className={progress >= 20 ? 'text-fo-primary' : 'text-fo-secondary'}>List Builder</span>
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
                <p className="text-fo-primary font-medium">
                  ⚡ I&apos;m setting up 14 workflows in parallel to build real examples for you.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
