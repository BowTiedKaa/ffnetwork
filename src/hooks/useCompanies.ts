import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  target_role: string | null;
  notes: string | null;
  priority: number;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string | null;
}

// Module-level cache
let cachedCompanies: Company[] | null = null;
let companiesLastFetched: number | null = null;
let cachedShowArchived: boolean | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useCompanies(showArchived: boolean = false) {
  // Initialize with cache if available and matches filter
  const [companies, setCompanies] = useState<Company[] | null>(() => {
    if (cachedCompanies && cachedShowArchived === showArchived) {
      return cachedCompanies;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Not loading if we have valid cache
    if (cachedCompanies && cachedShowArchived === showArchived) {
      const now = Date.now();
      const fresh = companiesLastFetched && now - companiesLastFetched < CACHE_DURATION;
      return !fresh;
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (showLoader: boolean) => {
    if (showLoader) setIsLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", showArchived)
      .order("priority", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    cachedCompanies = data || [];
    companiesLastFetched = Date.now();
    cachedShowArchived = showArchived;
    setCompanies(cachedCompanies);
    setIsLoading(false);
  }, [showArchived]);

  useEffect(() => {
    const now = Date.now();
    const fresh = companiesLastFetched && now - companiesLastFetched < CACHE_DURATION;
    const cacheValid = cachedCompanies && cachedShowArchived === showArchived && fresh;

    if (cacheValid) {
      setCompanies(cachedCompanies);
      setIsLoading(false);
      // Background refresh
      refresh(false);
    } else {
      refresh(true);
    }
  }, [showArchived, refresh]);

  const refetch = useCallback(() => {
    cachedCompanies = null;
    companiesLastFetched = null;
    return refresh(true);
  }, [refresh]);

  return { companies, isLoading, error, refetch };
}

// Export cache invalidation for use after mutations
export function invalidateCompaniesCache() {
  cachedCompanies = null;
  companiesLastFetched = null;
  cachedShowArchived = null;
}
