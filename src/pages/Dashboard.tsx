import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Flame, Target, TrendingUp } from "lucide-react";

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

const Dashboard = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [tasksResult, streakResult] = await Promise.all([
        supabase
          .from("daily_tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("due_date", new Date().toISOString().split("T")[0])
          .order("created_at", { ascending: true }),
        supabase
          .from("streaks")
          .select("*")
          .eq("user_id", user.id)
          .single(),
      ]);

      if (tasksResult.data) setTasks(tasksResult.data);
      if (streakResult.data) setStreak(streakResult.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Your daily networking goals</p>
      </div>

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
