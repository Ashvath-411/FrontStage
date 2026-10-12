import { useEffect } from 'react';

export function pageTitleText(title) {
  return title ? `${title} · FrontStage` : 'FrontStage';
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = pageTitleText(title);
  }, [title]);
}
