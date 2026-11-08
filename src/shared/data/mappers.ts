import type { HNItem, StorySummary } from '@/shared/api';

/** Copy only the summary fields into an item, for stories saved before their full item was cached. */
export function summaryToItem(story: StorySummary): HNItem {
  return {
    id: story.id,
    type: 'story',
    title: story.title,
    url: story.url,
    by: story.by,
    time: story.time,
    score: story.score,
    descendants: story.descendants,
  };
}

/** Trim optional user text; blank becomes undefined. */
export function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === '' ? undefined : trimmed;
}
