"use client";

import { theme } from "@/lib/theme";

type Term = { name: string; startDate: string; endDate: string };
type AcademicYearValue = { year: number; terms: Term[] };

const inputClass = theme.input;
const labelClass = "mb-2 block text-sm font-medium text-[#8B90A7]";

export function AcademicYearStep({
  value,
  onChange,
}: {
  value: AcademicYearValue;
  onChange: (next: AcademicYearValue) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block max-w-xs">
        <span className={labelClass}>Current year</span>
        <input
          type="number"
          value={value.year}
          onChange={(event) => onChange({ ...value, year: Number(event.target.value) })}
          className={inputClass}
        />
      </label>

      <div className="space-y-3">
        {value.terms.map((term, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-xl border border-[#252A3A] bg-[#0F1117] p-4 md:grid-cols-3"
          >
            <input
              value={term.name}
              onChange={(event) =>
                onChange({
                  ...value,
                  terms: value.terms.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, name: event.target.value } : item,
                  ),
                })
              }
              placeholder={`Term ${index + 1}`}
              className={inputClass}
            />
            <input
              type="date"
              value={term.startDate}
              onChange={(event) =>
                onChange({
                  ...value,
                  terms: value.terms.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, startDate: event.target.value } : item,
                  ),
                })
              }
              className={inputClass}
            />
            <input
              type="date"
              value={term.endDate}
              onChange={(event) =>
                onChange({
                  ...value,
                  terms: value.terms.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, endDate: event.target.value } : item,
                  ),
                })
              }
              className={inputClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
