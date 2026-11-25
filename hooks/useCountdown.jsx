import { useCallback, useEffect, useState } from 'react';

// Counts down in whole seconds, for the "Resend code in 00:30" text.
export default function useCountdown(initialSeconds = 30) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return undefined;

    const id = setTimeout(() => setSeconds((current) => current - 1), 1000);

    return () => clearTimeout(id);
  }, [seconds]);

  const restart = useCallback(
    (value = initialSeconds) => setSeconds(value),
    [initialSeconds]
  );

  const label = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    seconds % 60
  ).padStart(2, '0')}`;

  return { seconds, label, restart };
}
