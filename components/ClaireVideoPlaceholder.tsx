'use client';

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
        <div className="flex-shrink-0 w-full md:w-64 h-36 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden shadow-lg">
          {videoUrl ? (
            <video className="w-full h-full object-cover" controls>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-center text-white">
              <div className="text-5xl mb-2">👩‍💼</div>
              <div className="text-sm font-semibold">Claire</div>
              <div className="text-xs text-gray-300 mt-1">Video Coming Soon</div>
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

