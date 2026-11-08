/** Host the universal / App Links are configured for (app.json, public/.well-known). */
export const STORY_LINK_HOST = 'hnreader.codebyramiz.com';

/**
 * Story id from a route param. Deep links (`hnreader://story/:id`,
 * `https://hnreader.codebyramiz.com/story/:id`) land on `app/story/[id].tsx`,
 * so anything a user or another app typed can arrive here.
 */
export function parseStoryId(param: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === undefined || !/^\d+$/.test(raw)) return undefined;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}
