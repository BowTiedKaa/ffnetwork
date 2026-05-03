import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { RedeemCodeDialog } from "./RedeemCodeDialog";

interface Props {
  title?: string;
  className?: string;
}

export const UpgradePrompt = ({ title, className }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className={`p-6 bg-amber-50 border-amber-200 ${className || ""}`}>
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="space-y-3 flex-1">
            <p className="font-semibold text-amber-900">{title || "This is a Pro feature."}</p>
            <p className="text-sm text-amber-900">
              FF Network Pro gives you unlimited contacts, AI message drafting, the Pitch Builder,
              and call prep guides — everything you need to run the Former Fed methodology.
            </p>
            <p className="text-sm text-amber-900">
              Get an access code at{" "}
              <a href="https://formerfed.gumroad.com" target="_blank" rel="noreferrer" className="underline font-medium">
                formerfed.gumroad.com
              </a>
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>I have a code</Button>
          </div>
        </div>
      </Card>
      <RedeemCodeDialog open={open} onOpenChange={setOpen} />
    </>
  );
};