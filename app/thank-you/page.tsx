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

      // ===== PHASE 1: Data Generation (Prospecting + Enrichment) =====
      setCurrentStep('Phase 1: Finding prospects and enriching contacts...');
      setProgress(10);

      console.log('🎯 Starting Phase 1: Data Generation');

      const phase1Response = await fetch('/api/octave/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!phase1Response.ok) {
        const error = await phase1Response.json();
        console.error('Phase 1 failed:', error);
        alert(`Phase 1 failed: ${error.error || 'Unknown error'}`);
        setIsGenerating(false);
        return;
      }

      const phase1Result = await phase1Response.json();
      console.log('✅ Phase 1 complete:', phase1Result);
      
      setProgress(50);
      setCurrentStep('Phase 2: Generating personalized content...');

      // ===== PHASE 2: Content Generation (All Agents) =====
      console.log('🎯 Starting Phase 2: Content Generation');
      
      // Simulate progress updates for Phase 2
      const phase2Steps = [
        { step: 'Generating Cold Email: Personalized Solutions...', progress: 55 },
        { step: 'Generating Cold Email: Lead Magnet Short...', progress: 60 },
        { step: 'Generating Cold Email: Local/Same City...', progress: 65 },
        { step: 'Generating Cold Email: Problem/Solution...', progress: 70 },
        { step: 'Generating Cold Email: Lead Magnet Long...', progress: 75 },
        { step: 'Generating LinkedIn Posts...', progress: 80 },
        { step: 'Generating LinkedIn DMs...', progress: 85 },
        { step: 'Generating Newsletters...', progress: 90 },
        { step: 'Generating Call Prep...', progress: 95 },
      ];

      let currentStepIndex = 0;
      const progressInterval = setInterval(() => {
        if (currentStepIndex < phase2Steps.length) {
          setCurrentStep(phase2Steps[currentStepIndex].step);
          setProgress(phase2Steps[currentStepIndex].progress);
          currentStepIndex++;
        }
      }, 12000); // Update every 12 seconds for Phase 2

      const phase2Response = await fetch('/api/octave/generate-strategy-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      clearInterval(progressInterval);

      if (!phase2Response.ok) {
        const error = await phase2Response.json();
        console.error('Phase 2 failed (non-critical):', error);
        // Don't fail completely - prospects are already saved
        alert(`Phase 2 warning: Some content may not have generated. Check results page.`);
      }

      const phase2Result = await phase2Response.json();
      console.log('✅ Phase 2 complete:', phase2Result);

      setCurrentStep('Complete! Opening results...');
      setProgress(100);
      
      // Wait a moment then redirect to results
      setTimeout(() => {
        router.push('/results');
        setIsGenerating(false);
      }, 1000);

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
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden shadow-md mb-6 relative">
            <iframe
              src="https://drive.google.com/file/d/1lJ6Ur1sonko5DmCqAUW5N_LobfMlkopJ/preview"
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
              style={{ border: 'none' }}
            />
            {/* Overlay to block download button in top-right corner */}
            <div 
              className="absolute top-0 right-0 w-16 h-16 bg-transparent z-10"
              onClick={(e) => e.preventDefault()}
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
                  I&apos;m <span className="bg-gradient-to-r from-fo-primary to-fo-secondary bg-clip-text text-transparent">Making Your Sales Plan</span>
                </h3>
                <p className="text-fo-secondary mb-2">
                  This usually takes me 5-10 minutes
                </p>
                <p className="text-red-600 font-semibold text-lg mb-2">
                  Don&apos;t close this window.
                </p>
                <p className="text-gray-600 text-sm">
                  (It will update automatically once I&apos;m done)
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
