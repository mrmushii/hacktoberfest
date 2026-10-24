"use client";

import { useTransition } from "react";
import { setViewDepartment } from "@/app/actions";

export function DeptSwitch({ current, own, departments }: { current: string; own: string; departments: string[] }) {
  const [pending, start] = useTransition();
  const all = [...new Set([own, ...departments])].filter(Boolean);
  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs">
      <span className="text-muted">Viewing</span>
      <select
        aria-label="Department to view"
        value={current}
        disabled={pending}
        onChange={(e) => {
          const fd = new FormData();
          fd.set("department", e.target.value);
          start(() => setViewDepartment(fd));
        }}
        className="bg-transparent font-medium outline-none"
      >
        {all.map((d) => (
          <option key={d} value={d}>
            {d}
            {d === own ? " (mine)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
