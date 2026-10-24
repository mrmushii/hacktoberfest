import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/profile";
import { profileForm } from "@/lib/profile-draft";
import { Wizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/");
  const { draft, courses, departments } = await profileForm(user, (await cookies()).get("theme")?.value);
  return <Wizard initial={draft} image={user.image} email={user.email} departments={departments} courses={courses} />;
}
