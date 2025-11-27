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
      {/* Left: Video Embed */}
      <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-xl" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
        <iframe 
          src="https://netorgft15591934-my.sharepoint.com/personal/corey_fractionalops_com/_layouts/15/embed.aspx?UniqueId=9dfe10f0-7d64-4939-90a9-bbad2a68c490&embed=%7B%22ust%22%3Atrue%2C%22hv%22%3A%22CopyEmbedCode%22%7D&referrer=StreamWebApp&referrerScenario=EmbedDialog.Create" 
          className="absolute top-0 left-0 w-full h-full"
          scrolling="no" 
          allowFullScreen 
          title="Quick-Wave-2.mp4"
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

