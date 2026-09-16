"use client";

import { useState } from "react";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectionSize(value: unknown[] | Record<string, unknown>): string {
  const n = Array.isArray(value) ? value.length : Object.keys(value).length;
  if (Array.isArray(value)) return n === 1 ? "1 item" : `${n} items`;
  return n === 1 ? "1 key" : `${n} keys`;
}

function Primitive({ value }: { value: string | number | boolean | null }) {
  if (value === null) return <span className="text-mist">null</span>;
  if (typeof value === "boolean") return <span className="text-signal-info">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-signal-warn tabular-nums">{String(value)}</span>;
  return <span className="text-signal-pass break-all">"{value}"</span>;
}

function Node({
  name,
  value,
  defaultOpen,
}: {
  name?: string;
  value: unknown;
  defaultOpen?: boolean;
}) {
  const expandable = Array.isArray(value) || isRecord(value);
  const [open, setOpen] = useState(Boolean(defaultOpen));

  if (!expandable) {
    return (
      <div className="flex gap-2 min-w-0 leading-5">
        {name != null ? <span className="text-chalk shrink-0">{name}:</span> : null}
        <Primitive value={value as string | number | boolean | null} />
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((item, i) => [String(i), item] as const)
    : Object.entries(value);
  const brackets = Array.isArray(value) ? ["[", "]"] : ["{", "}"];

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 max-w-full text-left hover:text-chalk group"
        aria-expanded={open}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 text-mist transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        {name != null ? <span className="text-chalk">{name}:</span> : null}
        <span className="text-mist">
          {open ? brackets[0] : `${brackets[0]} ${collectionSize(value)} ${brackets[1]}`}
        </span>
      </button>
      {open ? (
        <div className="ml-2 pl-3 border-l border-line space-y-0.5 mt-0.5">
          {entries.map(([key, child]) => (
            <Node key={key} name={key} value={child} />
          ))}
          <div className="text-mist leading-5">{brackets[1]}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function JsonTree({ value }: { value: unknown }) {
  return (
    <div className="px-3 py-3 text-[11px] font-mono text-mist overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
      <Node value={value as JsonValue} defaultOpen />
    </div>
  );
}
