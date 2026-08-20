"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Palette } from "lucide-react";
import { CAR_COLOR_OPTIONS, CAR_COLOR_SWATCHES } from "@/lib/validation";

type Props = {
  value: string;
  onChange: (value: (typeof CAR_COLOR_OPTIONS)[number]) => void;
  onBlur?: () => void;
  hasError?: boolean;
};

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="h-4 w-4 shrink-0 rounded-full border border-black/10 shadow-sm"
      style={{ background: color }}
    />
  );
}

export function ColorSelect({ value, onChange, onBlur, hasError }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSwatch = value ? CAR_COLOR_SWATCHES[value as (typeof CAR_COLOR_OPTIONS)[number]] : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => {
          if (!open) onBlur?.();
        }}
        className={`flex w-full items-center gap-2.5 rounded-xl border bg-white py-2.5 pl-10 pr-9 text-left text-base text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-wuh-100 ${
          hasError ? "border-red-300" : "border-slate-200 focus:border-wuh-600"
        }`}
      >
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Palette className="h-[18px] w-[18px]" />
        </span>
        {selectedSwatch ? (
          <span className="flex items-center gap-2">
            <Swatch color={selectedSwatch} />
            {value}
          </span>
        ) : (
          <span className="text-slate-400">-- เลือกสีรถ --</span>
        )}
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </button>

      {open && (
        <ul className="absolute z-20 mt-1.5 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-card-hover">
          {CAR_COLOR_OPTIONS.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  onBlur?.();
                }}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition hover:bg-wuh-50 ${
                  value === option ? "bg-wuh-50 font-medium text-wuh-800" : "text-slate-700"
                }`}
              >
                <Swatch color={CAR_COLOR_SWATCHES[option]} />
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
