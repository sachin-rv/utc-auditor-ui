"use client";

import { useMemo } from "react";
import CopyTextButton from "@/components/CopyTextButton";
import JsonTree from "@/components/JsonTree";

export default function ReportRawJson({ value }: { value: Record<string, unknown> }) {
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);

  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-panel2/40">
        <span className="text-[11px] text-mist">Raw report (support use)</span>
        <CopyTextButton value={text} label="Copy" />
      </div>
      <JsonTree value={value} />
    </div>
  );
}
