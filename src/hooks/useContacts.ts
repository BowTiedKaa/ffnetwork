import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  company_id: string | null;
  role: string | null;
  warmth_level: string;
  last_contact_date: string | null;
  notes: string | null;
  contact_type: string;
  is_archived: boolean;
  archived_at: string | null;
  connector_influence_company_ids: string[] | null;
  recruiter_specialization: "industry_knowledge" | "interview_prep" | "offer_negotiation" | null;
  linkedin_url: string | null;
  created_at: string | null;
}

// Module-level cache
let cachedContacts: Contact[] | null = null;
let contactsLastFetched: number | null = null;
let cachedShowArchived: boolean | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useContacts(showArchived: boolean = false) {
  // Initialize with cache if available and matches filter
  const [contacts, setContacts] = useState<Contact[] | null>(() => {
    if (cachedContacts && cachedShowArchived === showArchived) {
      return cachedContacts;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // Not loading if we have valid cache
    if (cachedContacts && cachedShowArchived === showArchived) {
      const now = Date.now();
      const fresh = contactsLastFetched && now - contactsLastFetched < CACHE_DURATION;
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
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", showArchived)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    const typedContacts: Contact[] = (data || []).map(contact => ({
      ...contact,
      contact_type: contact.contact_type as string,
      recruiter_specialization: contact.recruiter_specialization as "industry_knowledge" | "interview_prep" | "offer_negotiation" | null,
    }));

    cachedContacts = typedContacts;
    contactsLastFetched = Date.now();
    cachedShowArchived = showArchived;
    setContacts(typedContacts);
    setIsLoading(false);
  }, [showArchived]);

  useEffect(() => {
    const now = Date.now();
    const fresh = contactsLastFetched && now - contactsLastFetched < CACHE_DURATION;
    const cacheValid = cachedContacts && cachedShowArchived === showArchived && fresh;

    if (cacheValid) {
      setContacts(cachedContacts);
      setIsLoading(false);
      // Background refresh
      refresh(false);
    } else {
      refresh(true);
    }
  }, [showArchived, refresh]);

  const refetch = useCallback(() => {
    cachedContacts = null;
    contactsLastFetched = null;
    return refresh(true);
  }, [refresh]);

  return { contacts, isLoading, error, refetch };
}

// Export cache invalidation for use after mutations
export function invalidateContactsCache() {
  cachedContacts = null;
  contactsLastFetched = null;
  cachedShowArchived = null;
}
