import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  conversation_name: string;
  sender_name: string;
  sender_avatar: string | null;
}

export const useMessageSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_messages', {
        search_query: searchQuery,
        max_results: 50,
      });

      if (error) {
        console.error('Search error:', error);
        setResults([]);
      } else {
        setResults((data as SearchResult[]) || []);
      }
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
  }, []);

  return { results, loading, query, search, clearSearch };
};
