import { useState } from 'react';
import { ToolPanel } from './ToolPanel.jsx';
import { songTemplates, templateBarCount, templateSections } from '../../engine/songTemplates.js';

export function TemplatePicker({ editor }) {
  const [chosen, setChosen] = useState('');

  function applyTemplate(template) {
    editor.changeStructure(() => ({ sections: templateSections(template.id) }));
    if (template.beatsPerBar) editor.setMeta({ ...editor.meta, beatsPerBar: template.beatsPerBar });
    setChosen(template.name);
  }

  return (
    <ToolPanel title="Start from a template" defaultOpen>
      <p className="text-label text-muted">Replaces the chart with empty bars in this shape. Undo brings the old chart back.</p>
      <div className="flex flex-wrap gap-2">
        {songTemplates.map((template) => (
          <button key={template.id} type="button" className="pill pill-secondary" onClick={() => applyTemplate(template)}>
            {template.name} <span className="tabular text-label font-normal text-muted">{templateBarCount(template)} bars</span>
          </button>
        ))}
      </div>
      {chosen && <p role="status" className="text-muted">{chosen} ready. Fill it with a loop or the chord palette.</p>}
    </ToolPanel>
  );
}
