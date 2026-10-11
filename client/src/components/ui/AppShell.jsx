import { NavLink, useNavigate } from 'react-router-dom';
import { Wordmark } from './Wordmark.jsx';
import { UserMenu } from './UserMenu.jsx';
import { useAuth } from '../../authContext.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';

const hostLinks = [['/library', 'Library'], ['/setlists', 'Setlists'], ['/sessions', 'Sessions']];
const visitorLinks = [['/register', 'Host a session'], ['/join', 'Join with code'], ['/login', 'Log in']];

function navClass({ isActive }) {
  return `text-label inline-flex min-h-12 items-center no-underline ${isActive ? 'text-cyan' : 'text-muted hover:text-text'}`;
}

export function AppShell({ title, pageTitle, actions, children }) {
  const auth = useAuth();
  usePageTitle(pageTitle ?? title);
  const navigate = useNavigate();
  const links = auth.user ? hostLinks : visitorLinks;

  function signOut() {
    auth.signOut();
    navigate('/');
  }

  return (
    <div className="page-pad flex min-h-dvh flex-col pb-16">
      <a href="#main-content" className="skip-link pill pill-secondary no-underline">Skip to content</a>
      <header className="flex flex-wrap items-center justify-between gap-x-6 border-b border-line py-2">
        <Wordmark />
        <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5">
          {!auth.checking && links.map(([path, label]) => <NavLink key={path} to={path} className={navClass}>{label}</NavLink>)}
          {auth.user && <UserMenu name={auth.user.displayName} onSignOut={signOut} />}
        </nav>
      </header>
      {title && (
        <div className="flex flex-wrap items-end justify-between gap-4 pt-10 pb-8">
          <h1 className="font-accent text-3xl font-extrabold sm:text-4xl">{title}</h1>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">{children}</main>
    </div>
  );
}
