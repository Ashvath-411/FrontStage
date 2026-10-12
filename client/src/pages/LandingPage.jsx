import { Link } from 'react-router-dom';
import { AppShell } from '../components/ui/AppShell.jsx';
import { AmbientBeatBars } from '../components/ui/AmbientBeatBars.jsx';
import { RejoinBanner } from '../components/ui/RejoinBanner.jsx';
import { useAuth } from '../authContext.jsx';

function HeroActions({ signedIn }) {
  if (signedIn) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link to="/sessions" className="pill pill-primary no-underline">Your sessions</Link>
        <Link to="/library" className="pill pill-secondary no-underline">Library</Link>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <Link to="/join" className="pill pill-primary no-underline">Join with code</Link>
      <Link to="/register" className="pill pill-secondary no-underline">Host a session</Link>
    </div>
  );
}

export function LandingPage() {
  const auth = useAuth();
  return (
    <AppShell pageTitle="">
      <RejoinBanner />
      <div className="flex flex-1 flex-col justify-center gap-6 py-8">
        <p className="text-label uppercase text-muted">Live charts for the whole band</p>
        <h1 className="font-accent max-w-4xl text-4xl leading-tight font-extrabold sm:text-6xl lg:text-7xl">
          Every musician on the same bar.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Share one code. Every phone and tablet shows the song, the chord of the moment and the count to the next tune, in time.
        </p>
        <HeroActions signedIn={Boolean(auth.user)} />
        <AmbientBeatBars />
      </div>
      <footer className="text-label text-muted">FrontStage. Built for rehearsals and gigs.</footer>
    </AppShell>
  );
}
