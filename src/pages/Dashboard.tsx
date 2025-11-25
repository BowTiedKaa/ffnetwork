import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Flame, Target, TrendingUp, Users, TrendingUp as TrailblazerIcon, Calendar, Building2, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { LogInteractionDialog } from "@/components/LogInteractionDialog";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { SimpleOnboarding } from "@/components/SimpleOnboarding";
import { NetworkHeatmap } from "@/components/NetworkHeatmap";
import { WeeklySummary } from "@/components/WeeklySummary";
import { BadgeSystem } from "@/components/BadgeSystem";
import { OfferMomentumMeter } from "@/components/OfferMomentumMeter";
import { useDashboardData } from "@/hooks/useDashboardData";

const ONBOARDING_COMPLETE_KEY = "onboarding_complete";

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

interface TodayAction {
  type: "follow_up" | "cold_contact" | "company_overlap";
  contact: Contact;
  followUpId?: string;
  daysAgo?: number;
  targetCompany?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  // Use centralized data hook
  const { tasks, streak, contacts, companies, interactions, followUps, loading, refetch } = useDashboardData();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [logInteractionOpen, setLogInteractionOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  // Check if onboarding is needed (only for users with no contacts and not completed)
  useEffect(() => {
    if (loading) return;
    
    const onboardingComplete = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true";
    const hasContacts = contacts.length > 0;
    
    if (!onboardingComplete && !hasContacts) {
      setShowOnboarding(true);
    }
  }, [loading, contacts.length]);

  // Backfill company IDs for old contacts
  useEffect(() => {
    const backfillCompanyIds = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: contactsWithoutCompanyId } = await supabase
          .from("contacts")
          .select("id, company")
          .eq("user_id", user.id)
          .is("company_id", null)
          .not("company", "is", null);

        if (!contactsWithoutCompanyId || contactsWithoutCompanyId.length === 0) return;

        const { data: allCompanies } = await supabase
          .from("companies")
          .select("id, name")
          .eq("user_id", user.id)
          .eq("is_archived", false);

        if (!allCompanies) return;

        const updates = contactsWithoutCompanyId
          .map(contact => {
            const matchingCompany = allCompanies.find(
              c => c.name.toLowerCase() === contact.company?.toLowerCase()
            );
            if (matchingCompany) {
              return supabase
                .from("contacts")
                .update({ company_id: matchingCompany.id })
                .eq("id", contact.id);
            }
            return null;
          })
          .filter(Boolean);

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      } catch (error) {
        console.error("Error backfilling company IDs:", error);
      }
    };

    if (!loading) {
      backfillCompanyIds();
    }
  }, [loading]);

  // Generate today's actions (memoized)
  const todayActions = useMemo(() => {
    const actions: TodayAction[] = [];
    
    // 1. Follow-ups due today
    if (followUps) {
      followUps.forEach((followUp: any) => {
        if (followUp.contacts && actions.length < 3) {
          actions.push({
            type: "follow_up",
            contact: followUp.contacts,
            followUpId: followUp.id,
          });
        }
      });
    }

    // 2. Prioritize hot/cooling contacts (15-30 days) - support both new and legacy values
    if (contacts && actions.length < 3) {
      const hotContacts = contacts.filter(
        (contact: Contact) => contact.warmth_level === "hot" || contact.warmth_level === "cooling"
      );
      
      hotContacts.slice(0, 3 - actions.length).forEach((contact: Contact) => {
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

    // 3. Connectors with influence at target companies
    if (companies && contacts && actions.length < 3) {
      const targetCompanyIds = companies.map((c: any) => c.id);
      const connectorsWithInfluence = contacts.filter(
        (contact: Contact) =>
          contact.contact_type === "connector" &&
          contact.connector_influence_company_ids &&
          contact.connector_influence_company_ids.some(id => targetCompanyIds.includes(id))
      );

      connectorsWithInfluence.slice(0, 3 - actions.length).forEach((contact: Contact) => {
        const influencedCompany = companies?.find((c: any) => 
          contact.connector_influence_company_ids?.includes(c.id)
        );
        
        actions.push({
          type: "company_overlap",
          contact,
          targetCompany: influencedCompany?.name || contact.company || undefined,
        });
      });
    }

    // 4. Cold contacts tied to target companies
    if (companies && contacts && actions.length < 3) {
      const targetCompanies = companies.map((c: any) => c.name.toLowerCase());
      const overlappingContacts = contacts.filter(
        (contact: Contact) =>
          contact.company &&
          targetCompanies.includes(contact.company.toLowerCase()) &&
          contact.warmth_level === "cold" &&
          !actions.some(a => a.contact.id === contact.id)
      );

      overlappingContacts.slice(0, 3 - actions.length).forEach((contact: Contact) => {
        actions.push({
          type: "company_overlap",
          contact,
          targetCompany: contact.company || undefined,
        });
      });
    }

    // 5. Contacts with no recent interactions
    if (contacts && actions.length < 3) {
      const noRecentInteractions = contacts.filter(
        (contact: Contact) =>
          !contact.last_contact_date &&
          !actions.some(a => a.contact.id === contact.id)
      );
      
      noRecentInteractions.slice(0, 3 - actions.length).forEach((contact: Contact) => {
        actions.push({
          type: "cold_contact",
          contact,
          daysAgo: undefined,
        });
      });
    }

    // 6. Reliable recruiters
    if (contacts && actions.length < 3) {
      const reliableRecruiters = contacts.filter(
        (contact: Contact) =>
          contact.contact_type === "reliable_recruiter" &&
          !actions.some(a => a.contact.id === contact.id)
      );
      
      reliableRecruiters.slice(0, 3 - actions.length).forEach((contact: Contact) => {
        actions.push({
          type: "cold_contact",
          contact,
        });
      });
    }

    return actions;
  }, [contacts, companies, followUps]);

  const handleTaskComplete = useCallback(async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("daily_tasks")
        .update({ completed })
        .eq("id", taskId);

      if (error) throw error;

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
          }
        }

        toast({
          title: "Task completed!",
          description: "Interaction logged — keep building momentum! 🔥",
        });

        // Check for new badges
        const newStreak = streak?.current_streak || 0;
        if (newStreak === 3) {
          setTimeout(() => {
            toast({
              title: "🎉 New Badge Earned!",
              description: "3 Days in a Row — You're on fire!",
            });
          }, 1000);
        } else if (newStreak === 7) {
          setTimeout(() => {
            toast({
              title: "🎉 New Badge Earned!",
              description: "Week Warrior — 7 days strong!",
            });
          }, 1000);
        }
      }

      // Refetch data to update UI
      await refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  }, [streak, toast, refetch]);

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
    const { contact } = action;
    
    switch (action.type) {
      case "follow_up":
        return "Follow up today";
      case "cold_contact":
        if (contact.warmth_level === "hot" || contact.warmth_level === "cooling") {
          return action.daysAgo
            ? `Hot - last contact ${action.daysAgo} days ago`
            : "Hot - reconnect soon";
        }
        if (contact.contact_type === "reliable_recruiter") {
          return "Check in for new opportunities";
        }
        return action.daysAgo
          ? `Reconnect (last interaction ${action.daysAgo} days ago)`
          : "Reach out (no interaction logged)";
      case "company_overlap":
        if (contact.contact_type === "connector") {
          return `Warm path into ${action.targetCompany}`;
        }
        return `Works at ${action.targetCompany}`;
      default:
        return "";
    }
  };

  const calculateNetworkStrength = () => {
    if (!streak || contacts.length === 0) return 0;

    // Warm contacts (0-40 points)
    const warmContacts = contacts.filter(c => c.warmth_level === "warm" && !c.is_archived).length;
    const warmScore = Math.min(40, (warmContacts / 10) * 40);

    // Recent interactions last 30 days (0-20 points)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentInteractions = contacts.filter(c => 
      c.last_contact_date && new Date(c.last_contact_date) >= thirtyDaysAgo
    ).length;
    const recentScore = Math.min(20, (recentInteractions / 10) * 20);

    // Streak length (0-20 points)
    const streakScore = Math.min(20, (streak.current_streak / 30) * 20);

    // Weekly completed tasks (0-20 points)
    const weeklyScore = Math.min(20, (streak.total_tasks_completed / 100) * 20);

    return Math.round(warmScore + recentScore + streakScore + weeklyScore);
  };

  const calculateOfferMomentum = () => {
    const networkStrength = calculateNetworkStrength();
    
    // Warm paths to target companies (0-30 points)
    const warmContactsAtTargets = contacts.filter(c => 
      c.warmth_level === "warm" && 
      companies.some(comp => comp.name.toLowerCase() === c.company?.toLowerCase())
    ).length;
    const pathsScore = Math.min(30, (warmContactsAtTargets / 5) * 30);

    // Recent interactions last 7 days (0-30 points)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyInteractions = interactions.filter(i => 
      new Date(i.interaction_date) >= sevenDaysAgo
    ).length;
    const weeklyScore = Math.min(30, (weeklyInteractions / 5) * 30);

    // Streak strength (0-10 points)
    const streakBonus = Math.min(10, ((streak?.current_streak || 0) / 7) * 10);

    return Math.min(100, Math.round((networkStrength * 0.4) + pathsScore + weeklyScore + streakBonus));
  };

  const getWeeklyStats = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const interactionsThisWeek = interactions.filter(i => 
      new Date(i.interaction_date) >= sevenDaysAgo
    ).length;

    const warmContacts = contacts.filter(c => c.warmth_level === "warm").length;
    
    const coolingSaved = interactions.filter(i => {
      const date = new Date(i.interaction_date);
      const contact = contacts.find(c => c.id === i.contact_id);
      return date >= sevenDaysAgo && contact?.warmth_level === "warm";
    }).length;

    const newPaths = contacts.filter(c => {
      const created = new Date(c.created_at || 0);
      return created >= sevenDaysAgo && c.company;
    }).length;

    return {
      interactionsThisWeek,
      warmContacts,
      coolingSaved,
      newPaths,
      networkStrengthChange: 0, // TODO: Track historical network strength for comparison
      currentStreak: streak?.current_streak || 0,
    };
  };

  const getCompaniesWithWarmPaths = () => {
    return companies.filter(company => {
      return contacts.some(c => 
        c.warmth_level === "warm" && 
        c.company?.toLowerCase() === company.name.toLowerCase()
      );
    }).length;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const networkStrength = calculateNetworkStrength();
  const offerMomentum = calculateOfferMomentum();
  const weeklyStats = getWeeklyStats();
  const companiesWithWarmPaths = getCompaniesWithWarmPaths();

  const handleAddConnector = () => {
    // Navigate to contacts page with connector type preselected
    navigate("/contacts?addConnector=true");
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setShowOnboarding(false);
  };

  return (
    <>
      <SimpleOnboarding 
        open={showOnboarding} 
        onAddConnector={handleAddConnector}
        onComplete={handleOnboardingComplete}
      />
      
      <div className="space-y-6">
        {/* Header Section */}
        <div className="space-y-2 pb-4 border-b">
          <h1 className="text-3xl font-bold">Build a network that supports your next career step</h1>
          <p className="text-muted-foreground max-w-3xl">
            FF Network helps you stay organized with the people who matter and track your warm paths into companies so you can maintain consistent outreach.
          </p>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
            <p className="text-muted-foreground">Your daily networking goals</p>
          </div>
          <div className="w-64">
            <OfferMomentumMeter score={offerMomentum} />
          </div>
        </div>

        {/* Network Strength Score */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Network Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="text-5xl font-bold">{networkStrength}</div>
              <div className="text-muted-foreground pb-2">/100</div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {networkStrength >= 80 && "Exceptional momentum — Keep building!"}
              {networkStrength >= 60 && networkStrength < 80 && "Strong network — You're on track!"}
              {networkStrength >= 40 && networkStrength < 60 && "Growing steadily — Keep it up!"}
              {networkStrength >= 20 && networkStrength < 40 && "Building momentum — Stay consistent!"}
              {networkStrength < 20 && "Start small — Every connection counts!"}
            </p>
          </CardContent>
        </Card>

      {/* Weekly Summary and Heatmap Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <WeeklySummary {...weeklyStats} />
        <BadgeSystem
          streak={streak?.current_streak || 0}
          totalInteractions={interactions.length}
          warmContacts={contacts.filter(c => c.warmth_level === "warm").length}
          companiesWithWarmPaths={companiesWithWarmPaths}
        />
      </div>

      {/* Network Heatmap */}
      <NetworkHeatmap contacts={contacts} />

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
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">You're in good shape today!</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>What to do next:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your target companies for new paths</li>
                  <li>Add a new contact to expand your network</li>
                  <li>Review cooling contacts and plan reconnections</li>
                </ul>
              </div>
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
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300"
                            : action.contact.contact_type === "trailblazer"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300"
                            : action.contact.contact_type === "reliable_recruiter"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300"
                        }
                      >
                        {action.contact.contact_type === "connector" && (
                          <>
                            <Users className="h-3 w-3 mr-1" />
                            Connector
                          </>
                        )}
                        {action.contact.contact_type === "trailblazer" && (
                          <>
                            <TrailblazerIcon className="h-3 w-3 mr-1" />
                            Trailblazer
                          </>
                        )}
                        {action.contact.contact_type === "reliable_recruiter" && (
                          <>
                            <Briefcase className="h-3 w-3 mr-1" />
                            Reliable Recruiter
                          </>
                        )}
                        {action.contact.contact_type === "unspecified" && (
                          <>
                            <Users className="h-3 w-3 mr-1" />
                            Unspecified
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
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedContact(action.contact);
                        setLogInteractionOpen(true);
                      }}
                    >
                      Log Interaction
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setSelectedContact(action.contact);
                        setSendMessageOpen(true);
                      }}
                    >
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

      {/* Modals */}
      {selectedContact && (
        <>
          <LogInteractionDialog
            open={logInteractionOpen}
            onOpenChange={setLogInteractionOpen}
            contactId={selectedContact.id}
            contactName={selectedContact.name}
            onSuccess={() => {
              refetch();
              setSelectedContact(null);
            }}
          />
        </>
      )}

      {selectedContact && (
        <SendMessageDialog
          open={sendMessageOpen}
          onOpenChange={setSendMessageOpen}
          contactName={selectedContact.name}
          contactEmail={selectedContact.email}
          companyName={selectedContact.company}
          contactType={selectedContact.contact_type as "connector" | "trailblazer" | "reliable_recruiter" | "unspecified" | null}
          targetRole={selectedContact.role}
        />
      )}
      </div>
    </>
  );
};

export default Dashboard;
