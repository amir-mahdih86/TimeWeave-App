import { useState, useEffect, useRef } from 'react';

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update immediately
    setCurrentTime(new Date());

    const updateTime = () => {
      setCurrentTime(new Date());
    };

    // Calculate milliseconds until the next minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    // Set initial timeout to sync with the minute boundary
    const initialTimeout = setTimeout(() => {
      updateTime();
      // After syncing, update every minute exactly
      intervalRef.current = setInterval(updateTime, 60000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return currentTime;
}