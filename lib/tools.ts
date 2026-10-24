export const CATEGORIES = ["Notices", "Exam prep", "Study", "Documents", "Planning"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Tool = {
  id: string;
  title: string;
  description: string;
  category: Category;
  keywords: string;
  href?: string; // absent = coming soon
  size: "lg" | "md" | "sm";
};

/** Single source for the home bento grid and the sidebar. */
export const TOOLS: Tool[] = [
  { id: "notices", title: "NoticePulse", description: "Every notice in one place, with version changes highlighted", category: "Notices", keywords: "notice board announcement exam date room change alert", href: "/notices", size: "lg" },
  { id: "examgraph", title: "ExamGraph", description: "See which topics keep appearing in past papers", category: "Exam prep", keywords: "past paper question syllabus topic heatmap frequency practice", href: "/examgraph", size: "lg" },
  { id: "planner", title: "Planner", description: "Exams and deadlines from your notices, in order", category: "Planning", keywords: "calendar task deadline schedule todo", href: "/planner", size: "md" },
  { id: "study", title: "Study Assistant", description: "Summaries, quizzes and answers from your lecture notes", category: "Study", keywords: "summary quiz flashcard question answer lecture notes explain", href: "/study", size: "md" },
  { id: "cover", title: "Cover Page", description: "Assignment cover pages, exported as PDF", category: "Documents", keywords: "cover page assignment report template pdf", href: "/cover-page", size: "sm" },
  { id: "assignment", title: "Assignment Studio", description: "Outlines and report structure", category: "Documents", keywords: "assignment report outline grammar writing", size: "sm" },
  { id: "slides", title: "Presentation Maker", description: "Turn course notes into slides", category: "Documents", keywords: "presentation slides pptx powerpoint", size: "sm" },
];

export function filterTools(tools: Tool[], query: string, category: Category | "All"): Tool[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tools.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    const hay = `${t.title} ${t.description} ${t.keywords} ${t.category}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
