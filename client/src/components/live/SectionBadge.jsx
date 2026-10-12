export function SectionBadge({ name }) {
  if (!name) return null;
  return (
    <span className="text-label rounded-full border border-cyan px-3 py-1 font-semibold text-cyan uppercase">{name}</span>
  );
}
