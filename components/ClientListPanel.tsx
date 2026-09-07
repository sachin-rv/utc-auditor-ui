"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import StatusPill from "@/components/StatusPill";
import { listContainer, listItem } from "@/components/PageEnter";
import { cardInteractiveClass, emptyStateClass, fieldCompactClass } from "@/lib/ui";

export interface ClientRow {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  projectCount: number;
  status: string;
}

export default function ClientListPanel({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState("");
  const reduced = useReducedMotion();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, query]);

  return (
    <div>
      <div className="relative mb-5">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className={`${fieldCompactClass} pl-10`}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={emptyStateClass}>
          {clients.length === 0 ? "No clients yet. Create one to get started." : `No clients match “${query}”.`}
        </div>
      ) : (
        <motion.div
          className="grid gap-3"
          variants={reduced ? undefined : listContainer}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          {filtered.map((c) => (
            <motion.div
              key={c.id}
              variants={reduced ? undefined : listItem}
              whileHover={reduced ? undefined : { y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              <Link
                href={`/dashboard/client/${c.id}`}
                className={`group ${cardInteractiveClass} p-5 flex items-center justify-between`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-panel2 border border-line flex items-center justify-center font-display font-bold text-mist group-hover:text-signal-pass group-hover:border-signal-pass/30 group-hover:scale-105 transition-all">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-chalk transition-colors group-hover:text-signal-pass">
                      {c.name}
                    </div>
                    <div className="text-xs text-mist mt-0.5 transition-colors group-hover:text-signal-pass">
                      {c.slug} · {c.contactEmail} · {c.projectCount} project{c.projectCount === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusPill status={c.status} className="group-hover:text-signal-pass" />
                  <span className="text-mist group-hover:text-signal-pass group-hover:translate-x-0.5 inline-block transition-all">
                    →
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
