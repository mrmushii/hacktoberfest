import { db } from "@/lib/db";
import { currentUser } from "@/lib/profile";
import { CoverPage } from "./cover";

export default async function Cover() {
  const [user, courses] = await Promise.all([currentUser(), db.course.findMany({ orderBy: { code: "asc" } })]);
  return <CoverPage student={user?.name ?? ""} section={user ? `${user.department}-${user.semester}${user.section}` : ""} courses={courses.map((c) => `${c.code}: ${c.title}`)} />;
}
