'use client';

import Image from 'next/image';
import ClaireImage from '../app/Claire_v1.png';

interface ClaireVideoPlaceholderProps {
  sectionTitle: string;
  sectionDescription: string;
  videoUrl?: string; // For future actual videos
}

export default function ClaireVideoPlaceholder({
  sectionTitle,
  sectionDescription,
  videoUrl
}: ClaireVideoPlaceholderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8 border-2 border-blue-200 shadow-md">
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Video Placeholder */}
        <div className="flex-shrink-0 w-full md:w-64 h-36 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center relative overflow-hidden shadow-lg">
          {videoUrl ? (
            <video className="w-full h-full object-cover" controls>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
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
              <div className="absolute bottom-2 left-0 right-0 text-center text-white z-10">
                <div className="text-sm font-semibold">Claire</div>
                <div className="text-xs">Video Coming Soon</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Section Info */}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-blue-600 mb-3">
            {sectionTitle}
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            {sectionDescription}
          </p>
        </div>
      </div>
    </div>
  );
}

