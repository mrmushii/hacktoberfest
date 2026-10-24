import { cookies } from "next/headers";
import { currentUser } from "@/lib/profile";
import { profileForm } from "@/lib/profile-draft";
import { ProfileEditor } from "@/components/profile-editor";
import { PageTitle } from "@/components/ui";

export default async function Page() {
  const user = (await currentUser())!;
  const { draft, courses, departments } = await profileForm(user, (await cookies()).get("theme")?.value);
  return (
    <>
      <PageTitle title="Profile" sub="Your academic details decide which notices and courses you see." />
      <ProfileEditor mode="profile" initial={draft} courses={courses} departments={departments} />
    </>
  );
}
