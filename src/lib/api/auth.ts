import { requireSupabase } from "../supabaseClient";
import type { Role } from "../types";

export type DbRole = "farmer" | "agronomist" | "company_admin" | "researcher" | "platform_admin";

export function dbRoleToAppRole(role: DbRole): Role {
  if (role === "company_admin") return "company";
  if (role === "platform_admin") return "admin";
  return role as Role;
}

export function appRoleToDbRole(role: "farmer" | "company"): DbRole {
  return role === "company" ? "company_admin" : "farmer";
}

export interface LiveProfile {
  id: string;
  organization_id: string | null;
  full_name: string;
  role: DbRole;
  region: string | null;
}

export async function signIn(email: string, password: string) {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data; // data.session is null if email confirmation is required
}

export async function signOut() {
  const sb = requireSupabase();
  await sb.auth.signOut();
}

export async function getSession() {
  const sb = requireSupabase();
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Creates the caller's organization + admin/farmer profile in one atomic call. */
export async function bootstrapOrganization(orgName: string, fullName: string, role: "farmer" | "company") {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("bootstrap_organization", {
    org_name: orgName,
    full_name: fullName,
    as_role: appRoleToDbRole(role),
  });
  if (error) throw error;
  return data as LiveProfile;
}

export async function fetchMyProfile(): Promise<LiveProfile | null> {
  const sb = requireSupabase();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
  if (error) throw error;
  return data as LiveProfile | null;
}
