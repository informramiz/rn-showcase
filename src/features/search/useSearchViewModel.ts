import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';
import { useOpenStory } from '@/features/history/useOpenStory';
import { useReadIds } from '@/features/history/useReadIds';
import type { SearchScope } from '@/shared/data/ports';
import { dbKeys, localQueryOptions } from '@/shared/data/queryKeys';
import { tokenize } from '@/shared/data/search';
import { useServices } from '@/shared/services/AppServices';

const SCOPES: readonly SearchScope[] = ['all', 'saved'];

/**
 * Full-text search over stories already on the device (FTS5 on native), so it
 * works offline. useDeferredValue keeps typing responsive without a timer.
 */
export function useSearchViewModel() {
  const { repos } = useServices();
  const client = useQueryClient();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const deferred = useDeferredValue(query.trim());
  const hasQuery = tokenize(deferred).length > 0;

  // The searchable cache changes while this tab is away (downloads, pruning), so re-run on focus.
  useFocusEffect(
    useCallback(() => {
      void client.invalidateQueries({ queryKey: dbKeys.search });
    }, [client]),
  );

  const { data, isFetching } = useQuery({
    queryKey: dbKeys.searchFor(deferred, scope),
    queryFn: () => repos.cache.search(deferred, scope),
    enabled: hasQuery,
    placeholderData: keepPreviousData,
    ...localQueryOptions,
  });

  return {
    state: {
      query,
      scope,
      scopes: SCOPES,
      hasQuery,
      searching: isFetching,
      results: hasQuery ? (data ?? []) : [],
      readIds: useReadIds(),
    },
    actions: { setQuery, setScope, openStory: useOpenStory() },
  };
}
