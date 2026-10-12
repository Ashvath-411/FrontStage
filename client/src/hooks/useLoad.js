import { useCallback, useEffect, useState } from 'react';

export function useLoad(loader) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    loader()
      .then(setData)
      .catch((problem) => setError(problem.message))
      .finally(() => setLoading(false));
  }, [loader]);

  useEffect(load, [load]);

  return { data, setData, error, loading, retry: load };
}
