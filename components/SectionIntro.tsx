'use client';

import Image from 'next/image';
import ClaireImage from '../app/Claire_v2.png';

interface SectionIntroProps {
  whatIsThisFor: string[];
  videoUrl?: string;
  sectionId: string;
}

export default function SectionIntro({
  whatIsThisFor,
  videoUrl,
  sectionId
}: SectionIntroProps) {
  return (
    <div className="mb-8 grid md:grid-cols-2 gap-6 items-start">
      {/* Left: Video Embed or Coming Soon Placeholder */}
      <div className="flex items-start justify-center min-h-full">
        {videoUrl ? (
          <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-xl" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
            <iframe 
              src={videoUrl}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen 
              title="Section Introduction Video"
              style={{ border: 'none' }}
            />
            {/* Overlay to block download button in top-right corner */}
            <div 
              className="absolute top-0 right-0 w-16 h-16 bg-transparent pointer-events-auto z-10"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.preventDefault()}
            />
          </div>
        ) : (
          <div className="relative w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden shadow-xl flex items-center justify-center" style={{ paddingTop: '56.25%' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
              <div className="relative w-24 h-24 mb-4">
                <Image
                  src={ClaireImage}
                  alt="Claire"
                  fill
                  className="object-cover rounded-full border-4 border-white shadow-lg"
                />
              </div>
              <p className="text-2xl font-bold text-gray-700 text-center">Video Coming Soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: How do I use this in real life? + CTA Button */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-blue-600 mb-4">
          How do I use this in real life?
        </h3>
        <div className="space-y-2 mb-6">
          {whatIsThisFor.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-green-600 mt-0.5 flex-shrink-0 text-lg">✓</span>
              <p className="text-sm text-gray-900 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
        
        {/* CTA Button - Green with white font */}
        <a 
          href="https://meetings.hubspot.com/corey-peck/claire-roi-roadmap-call"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all shadow-md"
        >
          Add to CRM Now
        </a>
      </div>
    </div>
  );
}
