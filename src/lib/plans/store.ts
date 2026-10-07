import "server-only";
import { q, sbInsert, sbSelect, sbUpdate } from "@/lib/dashboard/db";
import type { Horizon, Plan, PlanStatus } from "@/lib/plans/types";

/**
 * Each person's own plans. Every read and write is filtered by the owner, so
 * one person's list can't be read or changed through another's page.
 */

const T = "portal_plans";
const COLS = "id,title,notes,area,horizon,status,done_at,created_at";

type Row = { id: string; title: string; notes: string | null; area: string | null; horizon: Horizon; status: PlanStatus; done_at: string | null; created_at: string };
const toPlan = (r: Row): Plan => ({ id: r.id, title: r.title, notes: r.notes, area: r.area, horizon: r.horizon, status: r.status, doneAt: r.done_at, createdAt: r.created_at });
const clean = (s: string | null | undefined, max: number) => (s && s.trim() ? s.trim().slice(0, max) : null);
const mine = (ownerId: string, id?: string) => [q.eq("owner_id", ownerId), ...(id ? [q.eq("id", id)] : []), "removed_at=is.null"].join("&");

export async function listPlans(ownerId: string): Promise<Plan[]> {
  const rows = await sbSelect<Row>(T, [q.select(COLS), mine(ownerId), "order=created_at.asc", "limit=1000"].join("&"));
  return rows.map(toPlan);
}

export async function createPlan(ownerId: string, p: { title: string; notes?: string | null; area?: string | null; horizon: Horizon }): Promise<void> {
  await sbInsert(T, { owner_id: ownerId, title: p.title.trim().slice(0, 300), notes: clean(p.notes, 4000), area: clean(p.area, 40), horizon: p.horizon, status: "idea" });
}

export async function updatePlan(ownerId: string, id: string, p: { title?: string; notes?: string | null; area?: string | null; horizon?: Horizon; status?: PlanStatus }): Promise<void> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.title !== undefined) body.title = p.title.trim().slice(0, 300);
  if (p.notes !== undefined) body.notes = clean(p.notes, 4000);
  if (p.area !== undefined) body.area = clean(p.area, 40);
  if (p.horizon !== undefined) body.horizon = p.horizon;
  if (p.status !== undefined) {
    body.status = p.status;
    body.done_at = p.status === "done" ? new Date().toISOString() : null;
  }
  await sbUpdate(T, mine(ownerId, id), body);
}

export async function removePlan(ownerId: string, id: string): Promise<void> {
  await sbUpdate(T, mine(ownerId, id), { removed_at: new Date().toISOString() });
}
