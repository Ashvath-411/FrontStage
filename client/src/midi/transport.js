import { playClick } from '../audio/clickScheduler.js';
import { clickBeats } from './recorder.js';

const tickMs = 25;
const lookAheadSeconds = 0.12;
export const clickVolume = 0.5;

export function noteEventsBetween(take, fromBeat, toBeat) {
  const inWindow = (beat) => beat >= fromBeat && beat < toBeat;
  const events = [];
  take.notes.forEach((note) => {
    if (inWindow(note.start)) events.push({ beat: note.start, kind: 'on', pitch: note.pitch, velocity: note.velocity });
    if (inWindow(note.end)) events.push({ beat: note.end, kind: 'off', pitch: note.pitch });
  });
  take.pedal.forEach((change) => inWindow(change.beat) && events.push({ beat: change.beat, kind: 'pedal', down: change.down }));
  const order = { off: 0, pedal: 1, on: 2 };
  return events.sort((first, second) => first.beat - second.beat || order[first.kind] - order[second.kind]);
}

export function createTransport(context, piano) {
  let job = null;
  let timer = null;

  function timeOf(beat) {
    return job.plan.beatZero + beat * job.plan.beatSeconds;
  }

  function play(event) {
    const when = Math.max(context.currentTime, timeOf(event.beat));
    if (event.kind === 'on') piano.noteOn(event.pitch, event.velocity, when);
    if (event.kind === 'off') piano.noteOff(event.pitch, when);
    if (event.kind === 'pedal') piano.setPedal(event.down, when);
  }

  function tick() {
    const { plan } = job;
    const windowEnd = Math.min(plan.endBeat, (context.currentTime + lookAheadSeconds - plan.beatZero) / plan.beatSeconds);
    if (windowEnd > job.doneBeat) {
      clickBeats(job.doneBeat, windowEnd, plan.click).forEach((entry) => {
        job.clicks.push(playClick(context, Math.max(context.currentTime, timeOf(entry.beat)), entry.accent, clickVolume));
      });
      if (plan.take) noteEventsBetween(plan.take, job.doneBeat, windowEnd).forEach(play);
      job.doneBeat = windowEnd;
    }
    if (context.currentTime >= timeOf(plan.endBeat)) {
      const onEnd = plan.onEnd;
      stop();
      onEnd?.();
    }
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    if (!job) return;
    job.clicks.forEach((click) => click.stop());
    if (job.plan.take) piano.allNotesOff();
    job = null;
  }

  function start(plan) {
    stop();
    job = { plan, doneBeat: plan.fromBeat, clicks: [] };
    timer = setInterval(tick, tickMs);
    tick();
  }

  return { start, stop };
}
