import { Loader2 } from "lucide-react";

export default function PageLoader({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div className="flex flex-1 min-h-[40vh] w-full items-center justify-center px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-signal-pass" aria-hidden />
        <div className="text-sm text-mist">{label}</div>
      </div>
    </div>
  );
}
