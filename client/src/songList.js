export function visibleSongs(songs, query, sortBy) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matching = songs.filter((song) => {
    const haystack = `${song.title} ${song.artist ?? ''}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
  const byTitle = (first, second) => first.title.localeCompare(second.title);
  const byRecent = (first, second) => new Date(second.updatedAt ?? 0) - new Date(first.updatedAt ?? 0) || byTitle(first, second);
  return [...matching].sort(sortBy === 'title' ? byTitle : byRecent);
}

export function copyTitle(title) {
  const suffix = ' (copy)';
  return `${title.slice(0, 120 - suffix.length)}${suffix}`;
}

export function songCopy(song) {
  const { _id, ownerId, createdAt, updatedAt, __v, ...fields } = song;
  return { ...fields, title: copyTitle(song.title) };
}
