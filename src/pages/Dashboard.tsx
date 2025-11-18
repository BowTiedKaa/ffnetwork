import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Flame, Target, TrendingUp, Users, TrendingUp as TrailblazerIcon, Calendar, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DailyTask {
  id: string;
  task_type: string;
  description: string;
  completed: boolean;
  contact_id: string | null;
  company_id: string | null;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
}

interface Contact {
  id: string;
  name: string;
  company: string | null;
  contact_type: string;
  last_contact_date: string | null;
  warmth_level: string;
}

interface TodayAction {
  type: "follow_up" | "cold_contact" | "company_overlap";
  contact: Contact;
  followUpId?: string;
  daysAgo?: number;
  targetCompany?: string;
}

const Dashboard = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [todayActions, setTodayActions] = useState<TodayAction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

      // First, fetch all contacts and update their warmth status
      const { data: allContacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("user_id", user.id);

      // Calculate and update warmth status for each contact
      if (allContacts) {
        const now = new Date();
        const updates = allContacts.map(contact => {
          if (!contact.last_contact_date) return null;
          
          const lastContactDate = new Date(contact.last_contact_date);
          const daysSinceContact = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
          
          let newWarmthStatus: string;
          if (daysSinceContact <= 30) {
            newWarmthStatus = "warm";
          } else if (daysSinceContact <= 60) {
            newWarmthStatus = "cooling";
          } else {
            newWarmthStatus = "cold";
          }
          
          // Only update if warmth status changed
          if (contact.warmth_level !== newWarmthStatus) {
            return supabase
              .from("contacts")
              .update({ warmth_level: newWarmthStatus })
              .eq("id", contact.id);
          }
          return null;
        }).filter(Boolean);

        // Execute all updates
        await Promise.all(updates);
      }

      // Now fetch all data including updated contacts
      const [tasksResult, streakResult, followUpsResult, contactsResult, companiesResult] = await Promise.all([
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
          .eq("user_id", user.id),
        supabase
          .from("companies")
          .select("name")
          .eq("user_id", user.id),
      ]);

      if (tasksResult.data) setTasks(tasksResult.data);
      if (streakResult.data) setStreak(streakResult.data);

      // Generate today's actions
      const actions: TodayAction[] = [];
      
      // 1. Follow-ups due today
      if (followUpsResult.data) {
        followUpsResult.data.forEach((followUp: any) => {
          if (followUp.contacts && actions.length < 3) {
            actions.push({
              type: "follow_up",
              contact: followUp.contacts,
              followUpId: followUp.id,
            });
          }
        });
      }

      // 2. Prioritize cooling contacts (31-60 days)
      if (contactsResult.data && actions.length < 3) {
        const coolingContacts = contactsResult.data.filter(
          (contact: Contact) => contact.warmth_level === "cooling"
        );
        
        coolingContacts.slice(0, 3 - actions.length).forEach((contact: Contact) => {
          const daysAgo = contact.last_contact_date
            ? Math.floor(
                (new Date().getTime() - new Date(contact.last_contact_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;
          
          actions.push({
            type: "cold_contact",
            contact,
            daysAgo: daysAgo || undefined,
          });
        });
      }

      // 3. Cold contacts tied to target companies
      if (companiesResult.data && contactsResult.data && actions.length < 3) {
        const targetCompanies = companiesResult.data.map((c: any) => c.name.toLowerCase());
        const overlappingContacts = contactsResult.data.filter(
          (contact: Contact) =>
            contact.company &&
            targetCompanies.includes(contact.company.toLowerCase()) &&
            contact.warmth_level === "cold"
        );

        overlappingContacts.slice(0, 3 - actions.length).forEach((contact: Contact) => {
          actions.push({
            type: "company_overlap",
            contact,
            targetCompany: contact.company || undefined,
          });
        });
      }

      // 4. Fill remaining with other cold contacts
      if (contactsResult.data && actions.length < 3) {
        const coldContacts = contactsResult.data.filter(
          (contact: Contact) =>
            contact.warmth_level === "cold" &&
            !actions.some(a => a.contact.id === contact.id)
        );
        
        coldContacts.slice(0, 3 - actions.length).forEach((contact: Contact) => {
          const daysAgo = contact.last_contact_date
            ? Math.floor(
                (new Date().getTime() - new Date(contact.last_contact_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : null;
          
          actions.push({
            type: "cold_contact",
            contact,
            daysAgo: daysAgo || undefined,
          });
        });
      }

      setTodayActions(actions);
    } catch (error) {
      // Error silently handled - user will see empty state
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("daily_tasks")
        .update({ completed })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed } : t));

      if (completed) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const today = new Date().toISOString().split("T")[0];
          const { data: currentStreak } = await supabase
            .from("streaks")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (currentStreak) {
            const lastActivity = currentStreak.last_activity_date;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split("T")[0];

            let newStreak = currentStreak.current_streak;
            if (lastActivity === yesterdayStr) {
              newStreak += 1;
            } else if (lastActivity !== today) {
              newStreak = 1;
            }

            await supabase
              .from("streaks")
              .update({
                current_streak: newStreak,
                longest_streak: Math.max(newStreak, currentStreak.longest_streak),
                total_tasks_completed: currentStreak.total_tasks_completed + 1,
                last_activity_date: today,
              })
              .eq("user_id", user.id);

            setStreak({
              current_streak: newStreak,
              longest_streak: Math.max(newStreak, currentStreak.longest_streak),
              total_tasks_completed: currentStreak.total_tasks_completed + 1,
            });
          }
        }

        toast({
          title: "Task completed!",
          description: "Great job keeping your streak alive! 🔥",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case "reach_out": return "bg-primary";
      case "follow_up": return "bg-accent";
      case "warm_up": return "bg-yellow-500";
      case "research": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getActionMessage = (action: TodayAction) => {
    switch (action.type) {
      case "follow_up":
        return "Follow up today";
      case "cold_contact":
        return action.daysAgo
          ? `Reconnect (last interaction ${action.daysAgo} days ago)`
          : "Reach out (no interaction logged)";
      case "company_overlap":
        return `Reach out about ${action.targetCompany}`;
      default:
        return "";
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Your daily networking goals</p>
      </div>

      {/* Today's Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Actions</CardTitle>
          <CardDescription>
            Personalized steps to keep your network warm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>You're in good shape today. Add a new contact or check your target companies.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayActions.map((action, index) => (
                <div
                  key={`${action.contact.id}-${index}`}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{action.contact.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          action.contact.contact_type === "connector"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-accent/10 text-accent border-accent/20"
                        }
                      >
                        {action.contact.contact_type === "connector" ? (
                          <>
                            <Users className="h-3 w-3 mr-1" />
                            Connector
                          </>
                        ) : (
                          <>
                            <TrailblazerIcon className="h-3 w-3 mr-1" />
                            Trailblazer
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getActionMessage(action)}
                    </p>
                    {action.contact.company && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {action.contact.company}
                      </div>
                    )}
                    {action.contact.last_contact_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Last interaction: {formatDistanceToNow(new Date(action.contact.last_contact_date), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Log Interaction
                    </Button>
                    <Button size="sm">
                      Send Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak?.current_streak || 0} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep it going!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak?.longest_streak || 0} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Your best run
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak?.total_tasks_completed || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed all time
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>
            Complete your daily networking tasks to maintain your streak
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tasks for today. Add contacts and companies to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) =>
                      handleTaskComplete(task.id, checked as boolean)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getTaskTypeColor(task.task_type)}>
                        {task.task_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className={task.completed ? "line-through text-muted-foreground" : ""}>
                      {task.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
