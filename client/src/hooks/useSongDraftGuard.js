import { useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { clearSongDraft, draftWorthRestoring, readSongDraft, songContent, writeSongDraft } from '../songDraft.js';

const autosaveDelayMs = 800;

export function useSongDraftGuard(editor, songId, confirm) {
  const draftKey = songId ?? 'new';
  const current = songContent(editor.meta, editor.sections, editor.annotations);
  const savedContentRef = useRef(null);
  const [savedContent, setSavedContent] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null);
  const dirty = savedContent !== null && current !== savedContent;

  useEffect(() => {
    if (editor.loading || savedContentRef.current !== null) return;
    savedContentRef.current = current;
    setSavedContent(current);
    const draft = readSongDraft(draftKey);
    if (draftWorthRestoring(draft, current)) setPendingDraft(draft);
  }, [editor.loading, current, draftKey]);

  useEffect(() => {
    if (!dirty) return undefined;
    const timer = setTimeout(() => writeSongDraft(draftKey, current), autosaveDelayMs);
    return () => clearTimeout(timer);
  }, [dirty, current, draftKey]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const currentContentRef = useRef(current);
  currentContentRef.current = current;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => savedContentRef.current !== null && savedContentRef.current !== currentContentRef.current && currentLocation.pathname !== nextLocation.pathname);
  const blockerRef = useRef(blocker);
  blockerRef.current = blocker;
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirmRef.current.ask({
      title: 'Leave without saving?',
      text: 'Your changes are not saved. A draft stays on this device and is offered the next time you open this song.',
      confirmLabel: 'Leave',
      cancelLabel: 'Keep editing'
    }).then((leave) => (leave ? blockerRef.current.proceed() : blockerRef.current.reset()));
  }, [blocker.state]);

  function markSaved(savedSongId, sections = editor.sections) {
    const savedNow = songContent(editor.meta, sections, editor.annotations);
    savedContentRef.current = savedNow;
    setSavedContent(savedNow);
    clearSongDraft(draftKey);
    if (savedSongId) clearSongDraft(savedSongId);
  }

  function restoreDraft() {
    editor.restore(JSON.parse(pendingDraft.content));
    setPendingDraft(null);
  }

  function discardDraft() {
    clearSongDraft(draftKey);
    setPendingDraft(null);
  }

  return { dirty, pendingDraft, restoreDraft, discardDraft, markSaved };
}
