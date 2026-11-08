/** Collision-resistant enough for client-generated note ids (time prefix + 64 random bits). */
export function newId(now: () => number = Date.now, random: () => number = Math.random): string {
  const rand = () =>
    Math.floor(random() * 0xffffffff)
      .toString(36)
      .padStart(7, '0');
  return `${now().toString(36)}-${rand()}${rand()}`;
}
