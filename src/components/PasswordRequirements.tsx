import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { passwordRules } from "@/lib/passwordRules";

interface Props {
  value: string;
  className?: string;
}

export function PasswordRequirements({ value, className }: Props) {
  const touched = value.length > 0;
  return (
    <ul
      className={cn("space-y-1 text-xs", className)}
      aria-label="Password requirements"
    >
      {passwordRules.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2 transition-colors",
              !touched && "text-muted-foreground",
              touched && ok && "text-emerald-600 dark:text-emerald-400",
              touched && !ok && "text-muted-foreground",
            )}
          >
            {ok ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <X
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  touched ? "text-destructive" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
            )}
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? "met" : "not met"}</span>
          </li>
        );
      })}
    </ul>
  );
}