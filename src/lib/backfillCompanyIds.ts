import { supabase } from "@/integrations/supabase/client";

export async function backfillCompanyIdsForCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. Fetch contacts that have a company string but no company_id
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, company")
    .eq("user_id", user.id)
    .is("company_id", null)
    .not("company", "is", null);

  if (contactsError || !contacts || contacts.length === 0) return;

  // 2. Fetch all companies for this user
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("user_id", user.id);

  if (companiesError || !companies || companies.length === 0) return;

  // 3. Build a normalized name -> companyId map
  const normalize = (name: string) => name.trim().toLowerCase();
  const companyMap = new Map<string, string>();
  for (const c of companies) {
    if (c.name) {
      companyMap.set(normalize(c.name), c.id);
    }
  }

  // 4. For each contact, find a matching company and update company_id
  for (const contact of contacts) {
    if (!contact.company) continue;
    const key = normalize(contact.company);
    const companyId = companyMap.get(key);
    if (!companyId) continue;

    await supabase
      .from("contacts")
      .update({ company_id: companyId })
      .eq("id", contact.id)
      .eq("user_id", user.id);
  }
}
