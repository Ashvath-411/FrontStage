import { useEffect, useRef, useState } from 'react';
import { parseMidiMessage } from '../midi/midiMessages.js';

export const allDevices = 'all';

function midiSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
}

function listInputs(access) {
  return [...access.inputs.values()].map((input) => ({ id: input.id, name: input.name || 'MIDI keyboard', state: input.state }));
}

function accessProblem(problem) {
  if (problem?.name === 'SecurityError' || problem?.name === 'NotAllowedError') return 'denied';
  return 'error';
}

export function useMidiInput(onMessage) {
  const [status, setStatus] = useState(midiSupported() ? 'idle' : 'unsupported');
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(allDevices);
  const accessRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const access = accessRef.current;
    if (!access || status !== 'ready') return undefined;
    function attach() {
      setDevices(listInputs(access));
      access.inputs.forEach((input) => {
        const listening = deviceId === allDevices || deviceId === input.id;
        input.onmidimessage = listening
          ? (event) => onMessageRef.current(parseMidiMessage(event.data), { timeStamp: event.timeStamp, deviceName: input.name || 'MIDI keyboard' })
          : null;
      });
    }
    attach();
    access.onstatechange = attach;
    return () => {
      access.onstatechange = null;
      access.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
    };
  }, [status, deviceId]);

  useEffect(() => {
    navigator.permissions?.query({ name: 'midi' })
      .then((permission) => permission.state === 'granted' && connect())
      .catch(() => null);
  }, []);

  async function connect() {
    if (!midiSupported()) return setStatus('unsupported');
    setStatus('asking');
    try {
      accessRef.current = await navigator.requestMIDIAccess({ sysex: false });
      setStatus('ready');
    } catch (problem) {
      setStatus(accessProblem(problem));
    }
  }

  const selectedName = devices.find((device) => device.id === deviceId)?.name ?? null;
  return { status, devices, deviceId, setDeviceId, selectedName, connect };
}
