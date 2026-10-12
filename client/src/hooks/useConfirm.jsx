import { useRef, useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';

export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolveRef = useRef(null);

  function ask(options) {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setRequest(options);
    });
  }

  function answer(confirmed) {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setRequest(null);
  }

  return { ask, dialog: <ConfirmDialog request={request} onAnswer={answer} /> };
}
