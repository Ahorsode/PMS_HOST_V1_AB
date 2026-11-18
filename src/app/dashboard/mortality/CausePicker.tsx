'use client';

import React from 'react';
import { MORTALITY_REASONS } from '../flocks/FlockForm';

/** Cause, then what exactly (the same lists as the flock form). Unknown needs no detail. */
export function CausePicker({ cause, detail, onChange }: { cause: string; detail: string; onChange: (cause: string, detail: string) => void }) {
  const details = cause !== 'Unknown' ? MORTALITY_REASONS[cause] ?? [] : [];
  const select = 'mt-1 h-12 w-full rounded-xl border border-ql-line bg-ql-ground px-3 text-[15px] text-ql-text';
  return (
    <>
      <label className="block font-ql-sans text-[13px] text-ql-muted">
        Cause
        <select
          value={cause}
          onChange={(event) => onChange(event.target.value, event.target.value === 'Unknown' ? 'Unknown cause yet' : '')}
          className={select}
        >
          {Object.keys(MORTALITY_REASONS).map((entry) => (
            <option key={entry} value={entry}>{entry === 'Unknown' ? 'Unknown cause yet' : entry}</option>
          ))}
        </select>
      </label>
      {details.length > 0 ? (
        <label className="block font-ql-sans text-[13px] text-ql-muted">
          What exactly
          <select value={detail} onChange={(event) => onChange(cause, event.target.value)} className={select}>
            <option value="">Select one</option>
            {details.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}
