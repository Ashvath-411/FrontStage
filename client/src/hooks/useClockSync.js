import { useEffect, useState } from 'react';
import { api } from '../api.js';

const samplesPerSync = 5;
const resyncMs = 60000;

async function measureSample() {
  const sentAt = Date.now();
  const { now } = await api.serverTime();
  const receivedAt = Date.now();
  const rttMs = receivedAt - sentAt;
  return { rttMs, offsetMs: now + rttMs / 2 - receivedAt };
}

async function bestSample() {
  let best = null;
  for (let sample = 0; sample < samplesPerSync; sample += 1) {
    const measured = await measureSample();
    if (!best || measured.rttMs < best.rttMs) best = measured;
  }
  return best;
}

export function useClockSync() {
  const [clock, setClock] = useState({ offsetMs: 0, rttMs: null, syncedAt: null });

  useEffect(() => {
    let active = true;
    async function sync() {
      try {
        const best = await bestSample();
        if (active) setClock({ ...best, syncedAt: Date.now() });
      } catch {
        return;
      }
    }
    sync();
    const timer = setInterval(sync, resyncMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return clock;
}
