import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CONTACT_COACHING, ContactType } from "@/lib/contactCoaching";

interface CallPrepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName?: string;
  contactType: ContactType;
}

export const CallPrepDialog = ({ open, onOpenChange, contactName, contactType }: CallPrepDialogProps) => {
  const meta = CONTACT_COACHING[contactType] || CONTACT_COACHING.unspecified;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Call Prep{contactName ? ` — ${contactName}` : ""} ({meta.label})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 text-sm">
            <span className="font-semibold">Goal:</span> {meta.goal}
          </div>
          <ul className="space-y-2 text-sm list-disc pl-5">
            {meta.callPrep.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};