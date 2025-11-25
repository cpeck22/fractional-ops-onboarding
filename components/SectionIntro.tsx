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
  return (
    <div className="mb-8 grid md:grid-cols-2 gap-6">
      {/* Left: Video Placeholder */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
        <div className="absolute inset-0 bg-gradient-to-br from-fo-primary to-fo-secondary rounded-lg overflow-hidden shadow-xl">
          {videoUrl ? (
            <iframe
              src={videoUrl}
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
              style={{ border: 'none' }}
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={ClaireImage}
                alt="Claire"
                fill
                className="object-cover scale-125"
                style={{ objectPosition: 'center 20%' }}
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white z-10">
                <div className="text-base font-semibold">Claire</div>
                <div className="text-sm">Video Coming Soon</div>
              </div>
            </div>
          )}
        </div>
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

