'use client';

import { useState, useEffect } from 'react';

interface StrategyTimerProps {
  expiresAt: string; // ISO timestamp
  showCTA?: boolean;
}

export default function StrategyTimer({ expiresAt, showCTA = true }: StrategyTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) {
    return (
      <div className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
        Strategy Expired
      </div>
    );
  }

  const { days, hours, minutes } = timeLeft;

  // Color logic based on days remaining (CEO's vision: green/orange/red text colors)
  let daysTextColor = 'text-green-600'; // Default: 14-11 days (Green)
  let bgColor = 'bg-gray-900'; // Dark background
  let textColor = 'text-white';

  if (days <= 5) {
    daysTextColor = 'text-red-600'; // Red for urgency
  } else if (days <= 10) {
    daysTextColor = 'text-orange-500'; // Orange for warning
  }

  return (
    <div className={`${bgColor} ${textColor} px-6 py-3 rounded-lg font-bold flex items-center gap-3 shadow-lg`}>
      {/* Diamond Icon - removed per CEO feedback */}
      
      {/* Timer Text - colored based on urgency */}
      <span className={`text-lg font-bold ${daysTextColor}`}>
        {days} day{days !== 1 ? 's' : ''} left
      </span>

      {showCTA && (
        <>
          <span className="text-white/60 mx-2">|</span>
          <a
            href="https://meetings.hubspot.com/corey-peck/gtm-kickoff-call"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline whitespace-nowrap text-white"
          >
            Upgrade now and add to your CRM
          </a>
        </>
      )}
    </div>
  );
}

