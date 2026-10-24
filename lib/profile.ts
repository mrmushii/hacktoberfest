import { auth } from "@/auth";
import { db } from "@/lib/db";

/** The signed-in student, or null. Every page, action and API route goes through this. */
export async function currentUser() {
  const id = (await auth())?.user?.id;
  return id ? db.user.findUnique({ where: { id } }) : null;
}

/** Department whose notices and courses are being browsed (own department unless switched). */
export const viewDept = (u: { viewDepartment: string | null; department: string | null }) => u.viewDepartment ?? u.department ?? "";

export const fmtDue = (due: string) => {
  const [d, t] = due.split("T");
  const date = new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return t ? `${date}, ${t}` : date;
};
