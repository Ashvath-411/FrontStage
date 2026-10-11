import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../authContext.jsx';
import { LoadingRows } from './LoadState.jsx';

export function RequireHost({ page: Page }) {
  const auth = useAuth();
  const location = useLocation();
  if (auth.checking) return <div className="page-pad py-10"><LoadingRows label="Checking your login" /></div>;
  if (!auth.user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Page />;
}
