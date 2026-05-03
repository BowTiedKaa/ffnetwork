import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Tier = "free" | "pro";

export interface UserAccess {
  loading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  tier: Tier;
  tierExpiresAt: string | null;
  isPro: boolean;
  refetch: () => Promise<void>;
}

export function useUserAccess(userId: string | null | undefined): UserAccess {
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tier, setTier] = useState<Tier>("free");
  const [tierExpiresAt, setTierExpiresAt] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    if (!userId) {
      setIsApproved(false);
      setIsAdmin(false);
      setTier("free");
      setTierExpiresAt(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_approved, tier, tier_expires_at")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    setIsApproved(!!profile?.is_approved);
    setIsAdmin(!!roles?.some((r: { role: string }) => r.role === "admin"));

    let effectiveTier: Tier = (profile?.tier as Tier) || "free";
    const expires = profile?.tier_expires_at || null;

    // Auto-downgrade expired pro
    if (effectiveTier === "pro" && expires && new Date(expires).getTime() < Date.now()) {
      effectiveTier = "free";
      await supabase
        .from("profiles")
        .update({ tier: "free" })
        .eq("id", userId);
    }

    setTier(effectiveTier);
    setTierExpiresAt(expires);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  return {
    loading,
    isApproved,
    isAdmin,
    tier,
    tierExpiresAt,
    isPro: tier === "pro",
    refetch: fetchAccess,
  };
}
