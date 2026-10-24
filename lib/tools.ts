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
  purpose: string; // why a student would reach for it, shown in the preview
  steps: string[]; // how it works, 3-4 short steps
  demo?: string; // recorded walkthrough under public/, made by `npm run demos`
};

/** Single source for the home bento grid. */
export const TOOLS: Tool[] = [
  { id: "notices", title: "NoticePulse", description: "Every notice in one place, with version changes highlighted", category: "Notices", keywords: "notice board announcement exam date room change alert", href: "/notices", size: "lg", purpose: "Never miss a changed exam date or room: see exactly what moved since the last version.", steps: ["Upload a notice PDF, photo or pasted text", "AI reads the date, time, room and batch", "Changes from the previous version are highlighted", "Students in that batch are notified"], demo: "/demos/notices.webm" },
  { id: "examgraph", title: "ExamGraph", description: "See which topics keep appearing in past papers", category: "Exam prep", keywords: "past paper question syllabus topic heatmap frequency practice", href: "/examgraph", size: "lg", purpose: "Find out which topics come up again and again before you start revising.", steps: ["Pick one of your courses", "Past papers are matched to syllabus topics", "See how often each topic appeared", "Practise with questions on the hottest topics"], demo: "/demos/examgraph.webm" },
  { id: "planner", title: "Planner", description: "Exams and deadlines from your notices, in order", category: "Planning", keywords: "calendar task deadline schedule todo", href: "/planner", size: "md", purpose: "Every exam and deadline from your notices, in one ordered list.", steps: ["Dates are pulled from published notices", "Tasks are sorted by what is due first", "Tick tasks off as you finish them"], demo: "/demos/planner.webm" },
  { id: "study", title: "Study Assistant", description: "Summaries, quizzes and answers from your lecture notes", category: "Study", keywords: "summary quiz flashcard question answer lecture notes explain", href: "/study", size: "md", purpose: "Turn long lecture notes into a summary, a quiz or quick answers.", steps: ["Choose a lecture document", "Get a summary with page references", "Take a quiz or ask your own question"], demo: "/demos/study.webm" },
  { id: "buddy", title: "Study Buddy", description: "Daily goals, help when you're stuck, a mistake log and mock exams", category: "Study", keywords: "study buddy session goals progress stuck explain mistakes report mock exam streak", href: "/buddy", size: "md", purpose: "Study with a partner who plans your session, explains what you're stuck on, and tracks your mistakes.", steps: ["Pick a course and get today's goals", "Ask for help whenever you're stuck", "Wrong answers go into your mistake log", "Finish with a report or a mock exam"] },
  { id: "tutor", title: "Visual Tutor", description: "Watch a data-structure problem solved on a whiteboard, step by step", category: "Study", keywords: "tutor whiteboard binary search tree bst algorithm visual explain voice data structure", href: "/tutor", size: "md", purpose: "See exactly how a binary search tree changes with every insert, search and delete.", steps: ["Type, photograph or upload a BST exercise", "Each step is computed exactly and drawn on the board", "A tutor narrates every step, then quizzes you"] },
  { id: "cover", title: "Cover Page", description: "Assignment cover pages, exported as PDF", category: "Documents", keywords: "cover page assignment report template pdf", href: "/cover-page", size: "sm", purpose: "Make a neat assignment cover page in a minute, ready to print.", steps: ["Pick a template", "Fill in course, title and your details", "Preview it live, then export as PDF"], demo: "/demos/cover.webm" },
  { id: "assignment", title: "Assignment Studio", description: "Outlines and report structure", category: "Documents", keywords: "assignment report outline grammar writing", size: "sm", purpose: "Plan the structure of an assignment or report before you write it.", steps: ["Paste the assignment brief", "Get an outline with sections", "Check grammar as you write"] },
  { id: "slides", title: "Presentation Maker", description: "Turn course notes into slides", category: "Documents", keywords: "presentation slides pptx powerpoint", size: "sm", purpose: "Turn course notes into a slide deck for a presentation.", steps: ["Choose your notes", "Pick how many slides", "Download the slides"] },
];

export function filterTools(tools: Tool[], query: string, category: Category | "All"): Tool[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tools.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    const hay = `${t.title} ${t.description} ${t.keywords} ${t.category}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
