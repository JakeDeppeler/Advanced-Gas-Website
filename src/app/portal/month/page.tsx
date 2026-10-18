import { redirect } from "next/navigation";

/** This month is Pace › Month now; an old link keeps the month it asked for. */
export default function MonthPage({ searchParams }: { searchParams: { m?: string } }) {
  redirect(`/portal/pace?view=month${searchParams?.m ? `&m=${encodeURIComponent(searchParams.m)}` : ""}`);
}
