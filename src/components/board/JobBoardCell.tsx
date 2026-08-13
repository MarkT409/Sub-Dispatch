"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardJob } from "@/lib/board";
import {
  boardKindColor,
  formatBoardCellDisplay,
  parseBoardTyping,
} from "@/lib/board-typing";
import { filterAssigneeSuggestions } from "@/lib/sub-teams";

function assigneeQuery(raw: string) {
  const match = raw.match(/[-–—]\s*([^+]*)$/);
  if (!match) return null;
  return match[1] ?? "";
}

function applyAssigneeSuggestion(raw: string, suggestion: string) {
  const match = raw.match(/^(.*[-–—]\s*)([^+]*?)(\s*\+L.*)?$/i);
  if (!match) return raw;
  const prefix = match[1];
  const suffix = match[3] ?? "";
  return `${prefix}${suggestion}${suffix}`;
}

function autosize(el: HTMLTextAreaElement, dense: boolean) {
  const min = dense ? 36 : 44;
  // Measure without collapsing to 0 (that left a white gap in the cell)
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, min)}px`;
}

export function JobBoardCell({
  job,
  canWrite,
  dense = false,
  shaking = false,
  suggestions = [],
  onCommit,
}: {
  job?: BoardJob;
  canWrite: boolean;
  dense?: boolean;
  shaking?: boolean;
  suggestions?: string[];
  onCommit: (raw: string, existing?: BoardJob) => Promise<void>;
}) {
  const display = job ? formatBoardCellDisplay(job) : "";
  const [value, setValue] = useState(display);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const focused = useRef(false);
  const picking = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused.current) {
      setValue(job ? formatBoardCellDisplay(job) : "");
    }
  }, [job, display]);

  useEffect(() => {
    if (inputRef.current) autosize(inputRef.current, dense);
  }, [value, dense, canWrite]);

  const query = assigneeQuery(value);
  const matches =
    query !== null ? filterAssigneeSuggestions(suggestions, query) : [];

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const textSize = dense
    ? "text-xs sm:text-[13px]"
    : "text-[13px] sm:text-sm";
  const minH = dense ? "min-h-9" : "min-h-11";
  const color = boardKindColor(job?.work_kind);

  function pickSuggestion(name: string) {
    const next = applyAssigneeSuggestion(value, name);
    setValue(next);
    setOpen(false);
    picking.current = false;
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function commit() {
    if (picking.current) return;
    focused.current = false;
    setOpen(false);
    const next = value.replace(/\s+/g, " ").trim();
    const prev = display.trim();
    if (next === prev) {
      const parsed = parseBoardTyping(value, job?.work_kind);
      if (parsed && parsed !== "clear" && parsed.display !== value) {
        setValue(parsed.display);
      }
      return;
    }

    setSaving(true);
    try {
      await onCommit(value, job);
      const parsed = parseBoardTyping(value, job?.work_kind);
      if (parsed && parsed !== "clear") {
        setValue(parsed.display);
      } else if (parsed === "clear") {
        setValue("");
      }
    } catch {
      setValue(display);
    } finally {
      setSaving(false);
    }
  }

  const shakeClass = shaking ? "animate-board-shake" : "";

  if (!canWrite) {
    return (
      <div
        title={display || undefined}
        className={`box-border flex h-full w-full items-start px-1.5 py-1 ${minH} ${color} ${shakeClass}`}
      >
        <span
          className={`block w-full break-words font-bold leading-snug ${textSize}`}
        >
          {display}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`relative box-border flex h-full w-full flex-col overflow-visible ${minH} ${color}`}
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        disabled={saving}
        placeholder=""
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          autosize(e.currentTarget, dense);
        }}
        onFocus={() => {
          focused.current = true;
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (picking.current) return;
            void commit();
          }, 120);
        }}
        onKeyDown={(e) => {
          if (open && matches.length > 0) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => (i + 1) % matches.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => (i - 1 + matches.length) % matches.length);
              return;
            }
            if (e.key === "Tab" && matches[activeIdx]) {
              e.preventDefault();
              pickSuggestion(matches[activeIdx]);
              return;
            }
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              matches[activeIdx] &&
              query
            ) {
              e.preventDefault();
              pickSuggestion(matches[activeIdx]);
              return;
            }
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            inputRef.current?.blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            if (open && matches.length) {
              setOpen(false);
              return;
            }
            setValue(display);
            focused.current = false;
            inputRef.current?.blur();
          }
        }}
        title="Type r … or t … then address – name. Names autocomplete from Crew."
        className={`box-border w-full min-w-0 flex-1 resize-none overflow-hidden border-0 px-1.5 py-1 font-bold leading-snug outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400 disabled:opacity-60 ${color} ${minH} ${textSize} ${shakeClass}`}
      />
      {open && matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-40 max-h-40 overflow-auto border border-black/20 bg-white text-left text-xs font-semibold shadow-md dark:border-gray-500 dark:bg-gray-900">
          {matches.map((name, idx) => (
            <li key={name}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  picking.current = true;
                }}
                onClick={() => pickSuggestion(name)}
                className={`block w-full truncate px-1.5 py-1 text-left ${
                  idx === activeIdx
                    ? "bg-amber-500/25 text-gray-900 dark:text-white"
                    : "text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
