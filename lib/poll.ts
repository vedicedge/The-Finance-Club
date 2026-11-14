/**
 * fetch() for projector polling: never cached, and never allowed to hang. A request stuck on bad
 * Wi-Fi is abandoned after `ms`, so the next poll always runs and the screen keeps up by itself.
 */
export async function pollFetch(url: string, ms = 6000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { cache: 'no-store', signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}
