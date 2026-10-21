"use client";

import { useState } from "react";

export function PasswordInput({
  id,
  name,
  autoComplete,
  describedBy,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        aria-describedby={describedBy}
        className="input pr-20"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-link"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
