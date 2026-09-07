const STYLES: Record<string, { dot: string; text: string; label: string }> = {
  success: { dot: "bg-signal-pass", text: "text-signal-pass", label: "Passing" },
  pass: { dot: "bg-signal-pass", text: "text-signal-pass", label: "Passing" },
  active: { dot: "bg-signal-pass", text: "text-signal-pass", label: "Active" },
  completed_with_errors: { dot: "bg-signal-warn", text: "text-signal-warn", label: "Errors" },
  warning: { dot: "bg-signal-warn", text: "text-signal-warn", label: "Warning" },
  failed: { dot: "bg-signal-fail", text: "text-signal-fail", label: "Failed" },
  fail: { dot: "bg-signal-fail", text: "text-signal-fail", label: "Failed" },
  no_reports: { dot: "bg-mist", text: "text-mist", label: "No audits yet" },
};

export default function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const s = STYLES[status] ?? STYLES.no_reports;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${s.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} animate-pulse`} />
      {s.label}
    </span>
  );
}
