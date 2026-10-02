import { useEffect, useState } from 'react';

// Gent city center - used whenever we don't have (or can't ask for) the
// visitor's real position, so "X km van jou" still means something
// instead of showing nothing.
const GENT_CENTER = { lat: 51.0543, lng: 3.7174 };
const GEOLOCATION_TIMEOUT_MS = 5000;

/**
 * Asks the browser for the visitor's coordinates once (on mount), for the
 * "X m/km van jou" distance label on listing cards. Falls back to Gent's
 * city center if geolocation is denied, unavailable, or times out - the
 * visitor is never blocked on this and no permission prompt is shown more
 * than once per page load.
 *
 * @returns {{ lat: number, lng: number, isFallback: boolean }}
 */
const useVisitorPosition = () => {
  const [position, setPosition] = useState({ ...GENT_CENTER, isFallback: true });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isFallback: false,
        });
      },
      () => {
        // Denied, unavailable, or timed out - keep the Gent-center
        // fallback already in state.
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  return position;
};

export default useVisitorPosition;
