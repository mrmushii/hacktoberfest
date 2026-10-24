import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function currentUser() {
  const id = (await cookies()).get("uid")?.value;
  return (id && (await db.user.findUnique({ where: { id } }))) || db.user.findFirst({ orderBy: { name: "asc" } });
}

export const fmtDue = (due: string) => {
  const [d, t] = due.split("T");
  const date = new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return t ? `${date}, ${t}` : date;
};
