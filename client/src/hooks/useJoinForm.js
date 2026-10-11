import { useState } from 'react';
import { api } from '../api.js';
import { rememberJoinedSession } from '../recentSessions.js';
import { joinProblem } from '../joinMessages.js';
import { readStored, writeStored } from '../storage.js';

const lastNameKey = 'setlist.lastName';
const lastInstrumentKey = 'setlist.lastInstrument';

export function useJoinForm(initialCode) {
  const [fields, setFields] = useState({
    code: initialCode,
    displayName: readStored(lastNameKey) ?? '',
    instrument: readStored(lastInstrumentKey) ?? 'drums',
    password: ''
  });
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(name, value) {
    setFields({ ...fields, [name]: value });
  }

  async function join() {
    setBusy(true);
    setProblem(null);
    try {
      const result = await api.joinSession(fields);
      rememberJoinedSession({ sessionId: result.sessionId, token: result.token, code: fields.code });
      writeStored(lastNameKey, fields.displayName);
      writeStored(lastInstrumentKey, fields.instrument);
      return result.sessionId;
    } catch (failure) {
      setProblem(joinProblem(failure.status, failure.message));
      setBusy(false);
      return null;
    }
  }

  return { fields, update, problem, busy, join };
}
