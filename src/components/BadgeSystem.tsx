import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

interface BadgeSystemProps {
  streak: number;
  totalInteractions: number;
  warmContacts: number;
  companiesWithWarmPaths: number;
}

export const BadgeSystem = ({
  streak,
  totalInteractions,
  warmContacts,
  companiesWithWarmPaths,
}: BadgeSystemProps) => {
  const badges: BadgeData[] = [
    {
      id: "streak_3",
      name: "3 Days in a Row",
      description: "Maintained a 3-day streak",
      icon: "🔥",
      earned: streak >= 3,
    },
    {
      id: "streak_7",
      name: "Week Warrior",
      description: "Maintained a 7-day streak",
      icon: "⚡",
      earned: streak >= 7,
    },
    {
      id: "interactions_10",
      name: "Network Builder",
      description: "Logged 10 interactions",
      icon: "🤝",
      earned: totalInteractions >= 10,
    },
    {
      id: "warm_5",
      name: "Warm Network",
      description: "5 warm contacts",
      icon: "☀️",
      earned: warmContacts >= 5,
    },
    {
      id: "paths_3",
      name: "Path Finder",
      description: "3 companies with warm paths",
      icon: "🎯",
      earned: companiesWithWarmPaths >= 3,
    },
    {
      id: "first_connector",
      name: "First Connector",
      description: "Added your first connector",
      icon: "👥",
      earned: warmContacts > 0, // Simplified - would need actual connector count
    },
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const lockedBadges = badges.filter(b => !b.earned);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Earned Badges */}
          {earnedBadges.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Earned</p>
              <div className="grid grid-cols-3 gap-2">
                <TooltipProvider>
                  {earnedBadges.map((badge) => (
                    <Tooltip key={badge.id}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-3 border rounded-lg bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                          <span className="text-3xl mb-1">{badge.icon}</span>
                          <span className="text-xs font-medium text-center">{badge.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{badge.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* Locked Badges */}
          {lockedBadges.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Locked</p>
              <div className="grid grid-cols-3 gap-2">
                <TooltipProvider>
                  {lockedBadges.map((badge) => (
                    <Tooltip key={badge.id}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-3 border rounded-lg bg-muted/20 cursor-pointer opacity-50">
                          <Lock className="h-6 w-6 mb-1 text-muted-foreground" />
                          <span className="text-xs text-center text-muted-foreground">{badge.name}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{badge.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
