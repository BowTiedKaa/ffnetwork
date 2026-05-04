import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Admin from "./Admin";

const { rpcMock, selectOrderMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  selectOrderMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === "profiles") {
          return {
            order: () => Promise.resolve({ data: [], error: null }),
            in: () => Promise.resolve({ data: [], error: null }),
          };
        }
        if (table === "user_roles") {
          return Promise.resolve({ data: [], error: null });
        }
        if (table === "access_codes") {
          return { order: selectOrderMock };
        }
        return { order: () => Promise.resolve({ data: [], error: null }) };
      },
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    }),
    rpc: rpcMock,
  },
}));

beforeEach(() => {
  let codeFetches = 0;
  selectOrderMock.mockImplementation(() => {
    codeFetches += 1;
    return Promise.resolve({
      data:
        codeFetches > 1
          ? [
              {
                id: "code-36",
                code: "FF-TEST-36",
                duration_months: 36,
                created_at: new Date().toISOString(),
                is_active: true,
                used_by: null,
                used_at: null,
              },
            ]
          : [],
      error: null,
    });
  });
  rpcMock.mockResolvedValue({ data: ["FF-TEST-36"], error: null });
});

describe("Admin access-code generation", () => {
  it("shows the 3-year option and generates 36-month records", async () => {
    const user = userEvent.setup();
    render(<Admin />);

    await user.click(screen.getByRole("tab", { name: "Codes" }));
    await user.click(screen.getByRole("button", { name: /generate codes/i }));
    await user.click(screen.getByRole("combobox"));

    const option = await screen.findByText('3 years (Gumroad "Be More Earn More")');
    expect(option).toBeTruthy();

    await user.click(option);
    await user.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith("generate_access_codes", {
        _count: 5,
        _duration_months: 36,
      }),
    );

    const generatedDialog = screen.getByText(/Generated 1 codes/i).closest("div");
    expect(generatedDialog).toBeTruthy();
    expect(within(generatedDialog as HTMLElement).getByText("FF-TEST-36")).toBeTruthy();
  });
});