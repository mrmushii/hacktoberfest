import { PageTitle } from "@/components/ui";
import { NoticeUpload } from "./upload";

export default function NewNotice() {
  return (
    <>
      <PageTitle title="Upload notice" sub="AI extracts the details. You review them before anything is published." />
      <NoticeUpload />
    </>
  );
}
