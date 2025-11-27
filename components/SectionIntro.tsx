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

      {/* Right: How do I use this? */}
      <div className="bg-gradient-to-br from-fo-light to-white rounded-lg p-6 border-2 border-fo-primary/30">
        <h3 className="text-lg font-bold text-fo-dark mb-4">
          💡 How do I use this?
        </h3>
        <div className="space-y-2">
          {whatIsThisFor.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-fo-primary mt-1 flex-shrink-0">•</span>
              <p className="text-sm text-fo-secondary leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

