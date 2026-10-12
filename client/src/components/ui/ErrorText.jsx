export function ErrorText({ error }) {
  if (!error) return null;
  return <p role="alert" className="text-alert">{error}</p>;
}
