'use client';

import { useEffect, useState } from 'react';

const PHONE_QUERY = '(max-width: 767.98px)';

/**
 * True below the md breakpoint. Starts false (desktop markup) until mounted,
 * so only use it in client-only places such as dialogs that render after
 * mount, where it never causes a hydration mismatch.
 */
export function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return phone;
}
