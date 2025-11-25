import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  contact_type: string;
  last_contact_date: string | null;
  warmth_level: string;
  connector_influence_company_ids: string[] | null;
  is_archived?: boolean;
  created_at?: string;
}

interface DailyTask {
  id: string;
  description: string;
  task_type: string;
  completed: boolean;
  company_id?: string;
  contact_id?: string;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
}

interface DashboardData {
  tasks: DailyTask[];
  streak: Streak | null;
  contacts: Contact[];
  companies: any[];
  interactions: any[];
  followUps: any[];
  loading: boolean;
}

export const useDashboardData = () => {
  const [data, setData] = useState<DashboardData>({
    tasks: [],
    streak: null,
    contacts: [],
    companies: [],
    interactions: [],
    followUps: [],
    loading: true,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      // First, fetch contacts to update warmth status
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false);

      // Calculate and batch update warmth status
      if (allContacts) {
        const now = new Date();
        const updates = allContacts
          .map(contact => {
            if (!contact.last_contact_date) return null;
            
            const lastContactDate = new Date(contact.last_contact_date);
            const daysSinceContact = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
            
            let newWarmthStatus: string;
            if (daysSinceContact <= 14) {
              newWarmthStatus = "warm";
            } else if (daysSinceContact <= 30) {
              newWarmthStatus = "hot";
            } else {
              newWarmthStatus = "cold";
            }
            
            if (contact.warmth_level !== newWarmthStatus) {
              return supabase
                .from("contacts")
                .update({ warmth_level: newWarmthStatus })
                .eq("id", contact.id);
            }
            return null;
          })
          .filter(Boolean);

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      }

      // Fetch all data in parallel
      const [tasksResult, streakResult, followUpsResult, contactsResult, companiesResult, interactionsResult] = await Promise.all([
        supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("due_date", today)
          .order("created_at", { ascending: true }),
        supabase
          .from("streaks")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("follow_ups")
          .select("*, contacts(*)")
          .eq("user_id", user.id)
          .eq("due_date", today)
          .eq("completed", false),
        supabase
          .from("contacts")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_archived", false),
        supabase
          .from("companies")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_archived", false),
        supabase
          .from("interactions")
          .select("*")
          .eq("user_id", user.id)
          .order("interaction_date", { ascending: false }),
      ]);

      setData({
        tasks: tasksResult.data || [],
        streak: streakResult.data,
        contacts: (contactsResult.data as Contact[]) || [],
        companies: companiesResult.data || [],
        interactions: interactionsResult.data || [],
        followUps: followUpsResult.data || [],
        loading: false,
      });

      return {
        contacts: contactsResult.data,
        companies: companiesResult.data,
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { ...data, refetch: fetchDashboardData };
};
