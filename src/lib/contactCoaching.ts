export type ContactType =
  | "connector"
  | "trailblazer"
  | "reliable_recruiter"
  | "unspecified";

export interface ContactTypeMeta {
  label: string;
  description: string;
  goal: string;
  callPrep: string[];
  colorClass: string; // for type card accent
}

export const CONTACT_COACHING: Record<ContactType, ContactTypeMeta> = {
  trailblazer: {
    label: "Trailblazer",
    description: "Has your background, made the transition you want",
    goal: "Get their blueprint. End with: Who else should I talk to?",
    callPrep: [
      "Open: One sentence on your current role and transition target",
      "Ask: How did you evaluate revenue roles vs. cost centers when you left?",
      "Ask: What would you do differently if you were starting today?",
      "Close: Who else in your network should I be speaking with?",
      "Follow-up: Send thank-you within 24 hours, restate your ask",
    ],
    colorClass: "border-blue-300 bg-blue-50 dark:bg-blue-950/20",
  },
  connector: {
    label: "Connector",
    description: "Understands your value, can broker introductions",
    goal: "Get a warm intro to a hiring manager or recruiter.",
    callPrep: [
      "Open: One sentence — what you did, what you're targeting",
      "Ask: How does [company] evaluate candidates with federal backgrounds?",
      "The ask: Would you be open to introducing me to someone closer to hiring?",
      "Do not leave without confirming a specific next step",
      "Follow-up: 24 hours + restate intro request. Check in at 3-5 days if no response.",
    ],
    colorClass: "border-purple-300 bg-purple-50 dark:bg-purple-950/20",
  },
  reliable_recruiter: {
    label: "Reliable Recruiter",
    description: "Places feds into revenue roles",
    goal: "Understand what clients need. Position yourself as the solution.",
    callPrep: [
      "Open: What are your clients prioritizing in candidates right now?",
      "Ask: What makes the feds you've placed stand out?",
      "Ask: Are there specific roles where my background would be a strong fit?",
      "Do NOT ask them to keep you in mind. Ask for a specific next step.",
      "Follow-up: Reference what they told you, not generic check-in language",
    ],
    colorClass: "border-green-300 bg-green-50 dark:bg-green-950/20",
  },
  unspecified: {
    label: "Contact",
    description: "General contact",
    goal: "Set a specific goal before you call.",
    callPrep: [
      "Define a specific goal for this conversation before reaching out",
      "Open: Brief context on who you are and why you're reaching out",
      "Ask one focused question tied to your goal",
      "Close: Confirm a concrete next step before ending",
      "Follow-up: Thank-you within 24 hours referencing what you discussed",
    ],
    colorClass: "border-gray-300 bg-gray-50 dark:bg-gray-900/40",
  },
};
