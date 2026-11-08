"use client";

import { useTransition } from "react";
import { completeConsultation } from "@/app/(app)/pro/actions";

export function CompleteButton({ bookingId, patientName }: { bookingId: string; patientName: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={pending}
      onClick={() => {
        if (confirm(`Mark this session with ${patientName} as complete? The session room will close; they can book again any time.`)) {
          start(() => completeConsultation(bookingId));
        }
      }}
    >
      {pending ? "Completing…" : "Mark session complete"}
    </button>
  );
}
