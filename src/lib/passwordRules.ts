import { z } from "zod";

// Single source of truth for password rules.
// Keep in sync with Supabase Auth settings if you ever enable
// server-side password strength there (currently disabled — Zod is
// the only enforcement layer).
export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number (0–9)", test: (v) => /[0-9]/.test(v) },
];

export const passwordSchema = z
  .string()
  .refine((v) => passwordRules.every((r) => r.test(v)), {
    message: "Password does not meet all requirements",
  });

export const passwordHelperText =
  "Use at least 8 characters with an uppercase letter, a lowercase letter, and a number.";