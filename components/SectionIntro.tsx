'use client';

import Image from 'next/image';
import ClaireImage from '../app/Claire_v1.png';

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
  // Use environment variable for public video URL
  // Set NEXT_PUBLIC_INTRO_VIDEO_URL in .env.local and Vercel
  // For YouTube: https://www.youtube.com/embed/YOUR_VIDEO_ID
  // For Vimeo: https://player.vimeo.com/video/YOUR_VIDEO_ID
  const publicVideoUrl = process.env.NEXT_PUBLIC_INTRO_VIDEO_URL || 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  
  return (
    <div className="mb-8 grid md:grid-cols-2 gap-6">
      {/* Left: Video Embed */}
      <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-xl" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
        <iframe 
          src={publicVideoUrl}
          className="absolute top-0 left-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen 
          title="Section Introduction Video"
          style={{ border: 'none' }}
        />
      </div>

      {/* Right: How do I use this? + CTA Button */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-blue-600 mb-4">
          How do I use this?
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

