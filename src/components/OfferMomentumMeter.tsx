import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";

interface OfferMomentumMeterProps {
  score: number;
}

export const OfferMomentumMeter = ({ score }: OfferMomentumMeterProps) => {
  const getColor = () => {
    if (score >= 61) return "bg-green-500";
    if (score >= 31) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getMessage = () => {
    if (score >= 80) return "High momentum — interviews incoming!";
    if (score >= 61) return "Strong position — keep pushing!";
    if (score >= 40) return "Building momentum — stay consistent";
    if (score >= 31) return "Gaining traction — reach out more";
    return "Start small — every connection counts";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Offer Momentum</span>
            </div>
            <span className="text-2xl font-bold">{score}</span>
          </div>
          
          {/* Progress bar */}
          <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full ${getColor()} transition-all duration-500 ease-out`}
              style={{ width: `${score}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">{getMessage()}</p>
        </div>
      </CardContent>
    </Card>
  );
};
