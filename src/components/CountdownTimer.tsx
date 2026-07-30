'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete: () => void;
}

export default function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      
      setSeconds(diff);
      
      if (diff === 0) {
        onComplete();
      }
    };

    updateTimer(); // Initial call
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  return (
    <div className="text-center">
      <div className="text-2xl font-bold font-mono">
        {seconds}s
      </div>
      <div className="text-xs text-muted">until refresh</div>
    </div>
  );
}
