import { Link } from 'react-router-dom';

export function Wordmark() {
  return (
    <Link to="/" className="font-accent inline-flex min-h-12 items-center text-pretitle font-extrabold tracking-tight text-text no-underline">
      Front<span className="text-cyan">Stage</span>
    </Link>
  );
}
