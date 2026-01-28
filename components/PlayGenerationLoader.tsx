'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import ClaireImage from '../app/Claire_v2.png';

interface PlayGenerationLoaderProps {
  progress: number; // 0-100
  currentStep: string;
  playName: string;
}

export default function PlayGenerationLoader({ 
  progress, 
  currentStep,
  playName 
}: PlayGenerationLoaderProps) {
  
  return (
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
            I&apos;m <span className="bg-gradient-to-r from-fo-primary to-fo-secondary bg-clip-text text-transparent">Running Your Play</span>
          </h3>
          <p className="text-fo-secondary mb-2 font-semibold">
            {playName}
          </p>
          <p className="text-red-600 font-semibold text-lg mb-2">
            Don&apos;t close this window.
          </p>
          <p className="text-gray-900 text-sm">
            (Your output will appear automatically when ready)
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-fo-secondary mb-2">
            <span className="font-medium">{currentStep}</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-fo-primary to-fo-secondary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Step Status Grid */}
        <div className="bg-fo-light rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progress >= 25 ? 'bg-green-500' : progress >= 10 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className={progress >= 25 ? 'text-fo-primary font-semibold' : 'text-fo-secondary'}>
                Initializing...
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progress >= 50 ? 'bg-green-500' : progress >= 25 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className={progress >= 50 ? 'text-fo-primary font-semibold' : 'text-fo-secondary'}>
                Generating Copy...
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progress >= 75 ? 'bg-green-500' : progress >= 50 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className={progress >= 75 ? 'text-fo-primary font-semibold' : 'text-fo-secondary'}>
                Applying Highlights...
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className={progress >= 100 ? 'text-fo-primary font-semibold' : 'text-fo-secondary'}>
                Finalizing...
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm">
          <p className="text-fo-primary font-medium">
            ⚡ I&apos;m creating personalized, production-ready copy for you.
          </p>
        </div>
      </div>
    </div>
  );
}
