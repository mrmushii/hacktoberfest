import { describe, expect, it } from "vitest";
import { diffNotice } from "./diff";
import { matchNotice } from "./match";
import { normalize, normDate, normTime, verifyDates } from "./normalize";
import type { NoticeFields } from "./schema";

const base: NoticeFields = normalize({
  title: "CSE-301 Midterm Exam", publishedOn: null, department: "cse", courseCode: "CSE 301", eventType: "exam", eventName: "Midterm",
  semester: 5, sections: ["a", "B"], date: "12 Nov 2026", time: "10:00 AM", room: "Room 402",
  deadline: null, cancelled: false, actions: [], evidence: [], uncertain: [],
});

describe("normalize", () => {
  it("canonicalizes dates, times, rooms, codes", () => {
    expect(base.date).toBe("2026-11-12");
    expect(base.time).toBe("10:00");
    expect(base.room).toBe("402");
    expect(base.courseCode).toBe("CSE-301");
    expect(base.sections).toEqual(["A", "B"]);
    expect(normalize({ ...base, sections: ["All sections", "Quiz 2", "Section C"] }).sections).toEqual(["C"]);
    expect(normDate("November 3, 2026")).toBe("2026-11-03");
    expect(normDate("03/11/2026")).toBe("2026-11-03");
    expect(normTime("2:30 pm")).toBe("14:30");
  });
  it("drops an event date that is just the issue date", () => {
    const f = normalize({ ...base, publishedOn: "2026-10-18", date: "18 October 2026", deadline: "2026-11-05" });
    expect(f.date).toBeNull();
    expect(f.uncertain).toContain("date");
  });
  it("flags unparseable dates as uncertain", () => {
    expect(normalize({ ...base, date: "next tuesday" }).uncertain).toContain("date");
  });
});

describe("diffNotice", () => {
  it("only room change reports only room", () => {
    const d = diffNotice(base, { ...base, room: "501" });
    expect(d).toEqual([{ field: "room", label: "Room", kind: "modified", before: "402", after: "501" }]);
  });
  it("spelling differences are not changes", () => {
    expect(diffNotice(base, normalize({ ...base, date: "2026-11-12", time: "10:00", room: "402" }))).toEqual([]);
  });
  it("reworded title and actions are not changes", () => {
    expect(diffNotice(base, { ...base, title: "REVISED: Midterm", actions: ["bring ID"] })).toEqual([]);
  });
  it("cancellation that omits the old date reports only the cancellation", () => {
    expect(diffNotice(base, { ...base, cancelled: true, date: null, time: null, room: null })).toEqual([
      { field: "cancelled", label: "Cancelled", kind: "added", before: null, after: "Yes" },
    ]);
  });
  it("date and time change", () => {
    expect(diffNotice(base, { ...base, date: "2026-11-15", time: "14:00" }).map((c) => c.field)).toEqual(["date", "time"]);
  });
});

describe("matchNotice", () => {
  const cand = (id: string, f: Partial<NoticeFields>, t = 0) => {
    const fields = { ...base, ...f };
    return { id, courseCode: fields.courseCode, department: fields.department, eventType: fields.eventType, fields, updatedAt: new Date(t) };
  };
  it("matches the same exam", () => {
    expect(matchNotice(base, [cand("a", {})])).toEqual(expect.objectContaining({ kind: "update", noticeId: "a", certain: true }));
  });
  it("does not merge midterm and final of the same course", () => {
    expect(matchNotice(base, [cand("f", { eventName: "Final" })])).toEqual({ kind: "new" });
  });
  it("matches differently worded names of the same exam", () => {
    expect(matchNotice({ ...base, eventName: "Midterm Examination" }, [cand("a", { eventName: "Data Structures Midterm" })])).toEqual(
      expect.objectContaining({ noticeId: "a" }),
    );
  });
  it("keeps Quiz 1 and Quiz 2 apart", () => {
    expect(matchNotice({ ...base, eventType: "exam", eventName: "Quiz 2" }, [cand("q1", { eventName: "Quiz 1" })])).toEqual({ kind: "new" });
  });
  it("does not merge other courses", () => {
    expect(matchNotice(base, [cand("x", { courseCode: "CSE-303" })])).toEqual({ kind: "new" });
  });
  it("multiple hits are uncertain and pick most recent", () => {
    expect(matchNotice(base, [cand("old", {}, 1), cand("new", {}, 2)])).toEqual(
      expect.objectContaining({ noticeId: "new", certain: false }),
    );
  });
});

describe("verifyDates", () => {
  it("flags a date that is not in the source text", () => {
    const src = "Notice dated 18 October 2026. Submit by 5 November 2026.";
    expect(verifyDates({ ...base, date: null, deadline: "2026-11-11" }, src).uncertain).toEqual(["deadline"]);
    expect(verifyDates({ ...base, date: null, deadline: "2026-11-05" }, src).uncertain).toEqual([]);
  });
});
