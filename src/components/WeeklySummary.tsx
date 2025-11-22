import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

interface WeeklySummaryProps {
  interactionsThisWeek: number;
  warmContacts: number;
  coolingSaved: number;
  newPaths: number;
  networkStrengthChange: number;
  currentStreak: number;
}

export const WeeklySummary = ({
  interactionsThisWeek,
  warmContacts,
  coolingSaved,
  newPaths,
  networkStrengthChange,
  currentStreak,
}: WeeklySummaryProps) => {
  const getMomentumIcon = () => {
    if (networkStrengthChange > 5) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (networkStrengthChange < -5) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-yellow-600" />;
  };

  const getMomentumText = () => {
    if (networkStrengthChange > 5) return "Strong upward momentum!";
    if (networkStrengthChange < -5) return "Time to re-engage your network";
    return "Steady progress";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">This Week's Momentum</p>
            <div className="flex items-center gap-2">
              {getMomentumIcon()}
              <span className="text-sm font-medium">{getMomentumText()}</span>
            </div>
          </div>
          {networkStrengthChange !== 0 && (
            <Badge variant={networkStrengthChange > 0 ? "default" : "destructive"}>
              {networkStrengthChange > 0 ? "+" : ""}{networkStrengthChange}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{interactionsThisWeek}</p>
            <p className="text-xs text-muted-foreground">Interactions logged</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{warmContacts}</p>
            <p className="text-xs text-muted-foreground">Warm contacts</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{coolingSaved}</p>
            <p className="text-xs text-muted-foreground">Cooling contacts saved</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold">{newPaths}</p>
            <p className="text-xs text-muted-foreground">New paths created</p>
          </div>
        </div>

        {currentStreak > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <Badge variant="outline" className="gap-1">
                🔥 {currentStreak} days
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
