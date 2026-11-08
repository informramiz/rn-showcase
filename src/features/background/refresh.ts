import { toSummary, type StorySummary } from '@/shared/api';
import type { HnSource } from '@/shared/data/hnSource';
import type { Repositories } from '@/shared/data/ports';

export interface CommentUpdate {
  story: StorySummary;
  newComments: number;
}

/**
 * One background refresh: warm the cache with the first page of top stories,
 * then compare each saved story's comment count with the last count the user
 * saw. Failures on one story never stop the others.
 */
export async function refreshInBackground(
  { repos, hn }: { repos: Repositories; hn: HnSource },
  notify: (update: CommentUpdate) => Promise<void>,
): Promise<CommentUpdate[]> {
  try {
    await hn.storyPage(await hn.storyIds('top'), 0);
  } catch (e) {
    console.warn('Top stories prefetch failed', e);
  }

  const updates: CommentUpdate[] = [];
  for (const bookmark of await repos.bookmarks.list()) {
    try {
      const item = await hn.item(bookmark.story.id);
      const count = item.descendants ?? 0;
      if (count === bookmark.knownDescendants) continue;
      await repos.bookmarks.setKnownDescendants(item.id, count);
      if (count > bookmark.knownDescendants) {
        updates.push({ story: toSummary(item), newComments: count - bookmark.knownDescendants });
      }
    } catch (e) {
      console.warn(`Refreshing saved story ${String(bookmark.story.id)} failed`, e);
    }
  }
  for (const update of updates) await notify(update);
  return updates;
}
