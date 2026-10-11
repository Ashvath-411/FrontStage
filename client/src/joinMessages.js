const codeAlphabet = /[^A-HJ-NP-Z2-9]/g;

export function codeFromInput(text) {
  const fromLink = text.match(/code=([^&\s]+)/i);
  const raw = fromLink ? fromLink[1] : text;
  return raw.toUpperCase().replace(codeAlphabet, '').slice(0, 6);
}

const joinProblems = {
  401: { text: 'That password is not right.', nextStep: 'Ask the host for the session password and type it again.' },
  403: { text: 'This session is locked or has already started.', nextStep: 'Ask the host to unlock it or to turn on late joining, then try again.' },
  404: { text: 'No live session has this code.', nextStep: 'Check the six characters with the host, or ask for a fresh link.', changeCode: true },
  409: { text: 'This session is full.', nextStep: 'Ask the host to raise the limit or free a seat, then try again.' },
  429: { text: 'Too many wrong passwords.', nextStep: 'Wait 10 minutes, then try again with the right password.' }
};

export function joinProblem(status, fallbackText) {
  return joinProblems[status] ?? { text: fallbackText || 'Joining did not work.', nextStep: 'Check your connection and try again.' };
}
