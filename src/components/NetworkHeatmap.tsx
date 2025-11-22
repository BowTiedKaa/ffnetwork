import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Briefcase, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Contact {
  id: string;
  name: string;
  company: string | null;
  contact_type: string;
  warmth_level: string;
  connector_influence_company_ids: string[] | null;
}

interface NetworkHeatmapProps {
  contacts: Contact[];
}

export const NetworkHeatmap = ({ contacts }: NetworkHeatmapProps) => {
  const getContactColor = (warmth: string, type: string) => {
    if (type === "connector" && warmth === "warm") return "bg-purple-500";
    if (warmth === "warm") return "bg-green-500";
    if (warmth === "cooling") return "bg-yellow-500";
    return "bg-gray-400";
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case "connector":
        return Users;
      case "trailblazer":
        return TrendingUp;
      case "reliable_recruiter":
        return Briefcase;
      default:
        return null;
    }
  };

  const getContactSize = (type: string, warmth: string, hasInfluence: boolean) => {
    if (hasInfluence) return "h-12 w-12";
    if (type === "connector") return "h-10 w-10";
    if (warmth === "warm") return "h-9 w-9";
    if (type === "reliable_recruiter") return "h-7 w-7";
    return "h-8 w-8";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Network Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Add contacts to see your network visualization
          </p>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-8 gap-3 p-4">
              {contacts.map((contact) => {
                const Icon = getContactIcon(contact.contact_type);
                const hasInfluence = contact.connector_influence_company_ids && contact.connector_influence_company_ids.length > 0;
                const size = getContactSize(contact.contact_type, contact.warmth_level, hasInfluence || false);
                const color = getContactColor(contact.warmth_level, contact.contact_type);

                return (
                  <Tooltip key={contact.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`${size} ${color} rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
                          hasInfluence ? "ring-2 ring-purple-300 ring-offset-2" : ""
                        }`}
                      >
                        {Icon && <Icon className="h-4 w-4 text-white" />}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">{contact.name}</p>
                        {contact.company && (
                          <p className="text-xs text-muted-foreground">{contact.company}</p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">
                            {contact.contact_type.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {contact.warmth_level}
                          </Badge>
                          {hasInfluence && (
                            <Badge className="bg-purple-500 text-xs">
                              Influential
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}

        {/* Legend */}
        <div className="mt-4 pt-4 border-t space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Legend:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-green-500 rounded-full" />
              <span>Warm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-yellow-500 rounded-full" />
              <span>Cooling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-400 rounded-full" />
              <span>Cold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-purple-500 rounded-full ring-2 ring-purple-300" />
              <span>Influential</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
