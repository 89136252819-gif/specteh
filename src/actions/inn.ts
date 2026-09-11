"use server";

import { requireStaff } from "@/lib/auth";
import { lookupPartyByInn, type PartyByInn } from "@/lib/inn-lookup";

export type InnLookupResult = { ok: true; party: PartyByInn } | { ok: false; error: string };

export async function lookupCustomerByInn(inn: string): Promise<InnLookupResult> {
  await requireStaff();
  return lookupPartyByInn(inn);
}
