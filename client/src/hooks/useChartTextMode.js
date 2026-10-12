import { useState } from 'react';
import { formatChart } from '../engine/parseChart.js';
import { readChartText } from '../engine/chartEdits.js';

export function useChartTextMode(editor) {
  const [draft, setDraft] = useState(null);
  const [textError, setTextError] = useState('');

  function openText() {
    setDraft(formatChart(editor.sections, editor.defaults));
    setTextError('');
  }

  function readDraft() {
    if (draft === null) return { sections: editor.sections };
    const result = readChartText(draft, editor.defaults);
    setTextError(result.error ?? '');
    return result;
  }

  function closeText() {
    const result = readDraft();
    if (result.error) return false;
    if (draft !== formatChart(editor.sections, editor.defaults)) editor.replaceChart(result.sections);
    setDraft(null);
    return true;
  }

  return { isText: draft !== null, draft, setDraft, textError, openText, closeText, readDraft };
}
