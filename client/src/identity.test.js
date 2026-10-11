import { beforeEach, describe, expect, it, vi } from 'vitest';

function fakeLocalStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

async function loadModules() {
  vi.resetModules();
  const api = await import('./api.js');
  const recent = await import('./recentSessions.js');
  return { ...api, ...recent };
}

const hour = 60 * 60 * 1000;

beforeEach(() => {
  globalThis.window = { localStorage: fakeLocalStorage() };
});

describe('one identity on one device', () => {
  it('keeps the host token when joining as a member, and member tokens when logging out', async () => {
    const { hostToken, memberToken, rememberJoinedSession, sessionTokens, recentJoinedSessions } = await loadModules();
    hostToken.set('host-token');
    rememberJoinedSession({ sessionId: 's1', token: 'member-token', name: 'Session One', code: 'ABCDEF' });
    expect(hostToken.get()).toBe('host-token');
    expect(sessionTokens('s1')).toEqual({ token: 'host-token', memberToken: 'member-token' });
    hostToken.set(null);
    expect(memberToken.get('s1')).toBe('member-token');
    expect(recentJoinedSessions().map((entry) => entry.name)).toEqual(['Session One']);
  });

  it('keeps the rejoin list across a reload, newest first', async () => {
    const first = await loadModules();
    first.rememberJoinedSession({ sessionId: 's1', token: 't1', code: 'AAAAAA' }, 1000);
    first.rememberJoinedSession({ sessionId: 's2', token: 't2', code: 'BBBBBB', name: 'Session Two' }, 2000);
    first.rememberJoinedSession({ sessionId: 's1', name: 'Session One' }, 3000);
    const afterReload = await loadModules();
    expect(afterReload.recentJoinedSessions(4000).map((entry) => [entry.name, entry.code])).toEqual([['Session Two', 'BBBBBB'], ['Session One', 'AAAAAA']]);
  });

  it('drops sessions joined more than 24 hours ago, with their tokens', async () => {
    const { rememberJoinedSession, recentJoinedSessions, memberToken } = await loadModules();
    rememberJoinedSession({ sessionId: 'old', token: 'old-token', code: 'OLDOLD' }, 0);
    rememberJoinedSession({ sessionId: 'new', token: 'new-token', code: 'NEWNEW' }, 20 * hour);
    expect(recentJoinedSessions(25 * hour).map((entry) => entry.sessionId)).toEqual(['new']);
    expect(memberToken.get('old')).toBeNull();
  });

  it('forgets a session and its token', async () => {
    const { rememberJoinedSession, forgetJoinedSession, recentJoinedSessions, memberToken } = await loadModules();
    rememberJoinedSession({ sessionId: 's1', token: 't1', code: 'AAAAAA' });
    forgetJoinedSession('s1');
    expect(recentJoinedSessions()).toEqual([]);
    expect(memberToken.get('s1')).toBeNull();
  });

  it('survives storage that throws', async () => {
    globalThis.window = { get localStorage() { throw new Error('blocked'); } };
    const { rememberJoinedSession, recentJoinedSessions } = await loadModules();
    expect(() => rememberJoinedSession({ sessionId: 's1', token: 't1', code: 'AAAAAA' })).not.toThrow();
    expect(recentJoinedSessions()).toEqual([]);
  });
});

describe('ended sessions', () => {
  it('leave the rejoin list but keep the token so the ended screen still loads', async () => {
    const { rememberJoinedSession, forgetJoinedSession, recentJoinedSessions, memberToken } = await loadModules();
    rememberJoinedSession({ sessionId: 's1', token: 't1', code: 'AAAAAA' });
    forgetJoinedSession('s1', { keepToken: true });
    expect(recentJoinedSessions()).toEqual([]);
    expect(memberToken.get('s1')).toBe('t1');
  });
});
