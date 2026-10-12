import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { LibraryPage } from './pages/LibraryPage.jsx';
import { SongEditorPage } from './pages/SongEditorPage.jsx';
import { SetlistsPage } from './pages/SetlistsPage.jsx';
import { SetlistBuilderPage } from './pages/SetlistBuilderPage.jsx';
import { SessionNewPage } from './pages/SessionNewPage.jsx';
import { JoinPage } from './pages/JoinPage.jsx';
import { LivePage } from './pages/LivePage.jsx';
import { SessionsPage } from './pages/SessionsPage.jsx';
import { RequireHost } from './components/ui/RequireHost.jsx';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/library" element={<RequireHost page={LibraryPage} />} />
      <Route path="/songs/:id" element={<RequireHost page={SongEditorPage} />} />
      <Route path="/setlists" element={<RequireHost page={SetlistsPage} />} />
      <Route path="/setlists/:id" element={<RequireHost page={SetlistBuilderPage} />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/session/new" element={<RequireHost page={SessionNewPage} />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/session/:id" element={<LivePage />} />
    </Routes>
  );
}
