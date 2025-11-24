'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ClaireImage from '../app/Claire_v1.png';

interface ClaireVideoPlaceholderProps {
  sectionTitle: string;
  sectionDescription: string;
  videoUrl?: string;
  sectionId?: string; // For tracking
}

export default function ClaireVideoPlaceholder({
  sectionTitle,
  sectionDescription,
  videoUrl,
  sectionId
}: ClaireVideoPlaceholderProps) {
  const [hasTracked, setHasTracked] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Track video view when component mounts (video is visible)
    if (videoUrl && !hasTracked && sectionId) {
      console.log(`🎥 Video viewed: ${sectionId} - ${sectionTitle}`);
      
      // Track in analytics (could be sent to Supabase or analytics service)
      try {
        // Store video view event
        const videoViews = JSON.parse(localStorage.getItem('claire_video_views') || '[]');
        videoViews.push({
          sectionId,
          sectionTitle,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('claire_video_views', JSON.stringify(videoViews));
        
        setHasTracked(true);
      } catch (error) {
        console.error('Failed to track video view:', error);
      }
    }

    // Set up iframe error detection
    if (videoUrl && videoRef.current) {
      const iframe = videoRef.current;
      iframe.onerror = () => {
        console.error('Video failed to load:', videoUrl);
        setVideoError(true);
      };
    }
  }, [videoUrl, sectionId, sectionTitle, hasTracked]);

  return (
    <div className="bg-gradient-to-r from-fo-light to-white rounded-lg p-6 mb-8 border-2 border-fo-primary shadow-lg">
      {/* Section Info at Top */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-fo-primary mb-2">
          {sectionTitle}
        </h3>
        <p className="text-sm text-fo-text-secondary leading-relaxed">
          {sectionDescription}
        </p>
      </div>
      
      {/* Video Container - Centered with 16:9 Aspect Ratio */}
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}> {/* 16:9 Aspect Ratio */}
          <div className="absolute inset-0 bg-gradient-to-br from-fo-primary to-fo-secondary rounded-lg overflow-hidden shadow-xl">
            {videoUrl && !videoError ? (
              <iframe
                ref={videoRef}
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
                  <div className="text-sm">
                    {videoError ? 'Video Loading...' : 'Video Coming Soon'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

