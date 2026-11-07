import { strings } from '@/shared/i18n/strings';
import type { HNItem, StorySummary } from './types';

export function toSummary(item: HNItem): StorySummary {
  return {
    id: item.id,
    title: item.title ?? strings.story.untitled,
    url: item.url,
    by: item.by,
    time: item.time,
    score: item.score,
    descendants: item.descendants,
  };
}
