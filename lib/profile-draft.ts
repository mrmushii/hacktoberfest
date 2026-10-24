import { db } from "@/lib/db";
import type { CourseOpt, Draft } from "@/components/profile-steps";

/** Load the editable profile plus the course and department options shared by onboarding and /profile. */
export async function profileForm(user: { id: string; name: string; university: string | null; studentId: string | null; department: string | null; semester: number | null; section: string | null; language: string; notifyTypes: string }, theme: string | undefined) {
  const [courses, enrolled] = await Promise.all([
    db.course.findMany({ orderBy: { code: "asc" } }),
    db.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true } }),
  ]);
  const draft: Draft = {
    name: user.name,
    university: user.university ?? "",
    studentId: user.studentId ?? "",
    department: user.department ?? "",
    semester: user.semester,
    section: user.section ?? "",
    courseIds: enrolled.map((e) => e.courseId),
    language: user.language === "bn" ? "bn" : "en",
    notifyTypes: JSON.parse(user.notifyTypes),
    theme: theme === "light" || theme === "dark" ? theme : "system",
  };
  const opts: CourseOpt[] = courses.map(({ id, code, title, department, semester }) => ({ id, code, title, department, semester }));
  return { draft, courses: opts, departments: [...new Set(courses.map((c) => c.department))] };
}
