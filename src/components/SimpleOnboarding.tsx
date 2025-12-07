import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, X } from "lucide-react";

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

  const handleClose = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent 
        className="max-w-lg [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Custom close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="space-y-6 py-4">
          {step === 1 && (
            <div className="text-center space-y-6">
              <Sparkles className="h-16 w-16 mx-auto text-primary" />
              <div className="space-y-3">
                <h2 className="text-2xl font-bold">Welcome to FF Network</h2>
                <p className="text-muted-foreground">
                  This app helps you track the people who can support your next career move and stay consistent with outreach.
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
                  Start by adding a connector — someone you've worked with who can open doors or make warm introductions.
                </p>
              </div>
              <div className="space-y-3">
                <Button onClick={handleAddConnector} size="lg" className="w-full">
                  Add a connector
                </Button>
                <button
                  onClick={handleClose}
                  className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
