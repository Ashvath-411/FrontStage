import { describe, expect, it } from 'vitest';
import { codeFromInput, joinProblem } from './joinMessages.js';

describe('join code input', () => {
  it('uppercases, drops look-alike and stray characters and keeps six', () => {
    expect(codeFromInput('ab c-d ef')).toBe('ABCDEF');
    expect(codeFromInput('abcdefgh')).toBe('ABCDEF');
    expect(codeFromInput('O0I1AB')).toBe('AB');
  });

  it('takes the code out of a pasted share link', () => {
    expect(codeFromInput('https://frontstage.example/join?code=k7mq2z')).toBe('K7MQ2Z');
    expect(codeFromInput('Join me: http://localhost:3000/join?code=ABC234&x=1')).toBe('ABC234');
  });
});

describe('join problems', () => {
  it('gives every known failure a next step', () => {
    for (const status of [401, 403, 404, 409, 429]) {
      const problem = joinProblem(status);
      expect(problem.text.length).toBeGreaterThan(5);
      expect(problem.nextStep.length).toBeGreaterThan(5);
    }
    expect(joinProblem(404).changeCode).toBe(true);
    expect(joinProblem(500, 'Server down').text).toBe('Server down');
  });
});
