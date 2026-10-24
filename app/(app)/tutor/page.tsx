import { PageTitle } from "@/components/ui";
import { TutorTool } from "./tool";

export default function Tutor() {
  return (
    <>
      <PageTitle title="Visual Tutor" sub="Type, photograph or upload a binary search tree exercise and watch it solved step by step on a whiteboard." />
      <TutorTool />
    </>
  );
}
