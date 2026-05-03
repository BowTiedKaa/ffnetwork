import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserAccess {
  loading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

export function useUserAccess(userId: string | null | undefined): UserAccess {
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchAccess = async () => {
    if (!userId) {
      setIsApproved(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("is_approved").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setIsApproved(!!profile?.is_approved);
    setIsAdmin(!!roles?.some((r: { role: string }) => r.role === "admin"));
    setLoading(false);
  };

  useEffect(() => {
    fetchAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { loading, isApproved, isAdmin, refetch: fetchAccess };
}
