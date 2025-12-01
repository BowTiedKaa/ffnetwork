import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Users } from "lucide-react";

interface SimpleOnboardingProps {
  open: boolean;
  onAddConnector: () => void;
  onComplete: () => void;
}

export const SimpleOnboarding = ({ open, onAddConnector, onComplete }: SimpleOnboardingProps) => {
  const [step, setStep] = useState(1);

  const handleAddConnector = () => {
    onAddConnector();
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-lg" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="space-y-6 py-4">
          {step === 1 && (
            <div className="text-center space-y-6">
              <Sparkles className="h-16 w-16 mx-auto text-primary" />
              <div className="space-y-3">
          <h2 className="text-2xl font-bold">Welcome to FF Network</h2>
          <p className="text-muted-foreground">
            FF Network helps you track the people who can help your career move and stay consistent with outreach.
          </p>
              </div>
              <Button onClick={() => setStep(2)} size="lg" className="w-full">
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-6">
              <Users className="h-16 w-16 mx-auto text-primary" />
              <div className="space-y-3">
                <h2 className="text-2xl font-bold">Add Your First Connector</h2>
                <p className="text-muted-foreground">
                  Start by adding a connector — someone you've worked with who can open doors for you.
                </p>
              </div>
              <Button onClick={handleAddConnector} size="lg" className="w-full">
                Add a connector
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
