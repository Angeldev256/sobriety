"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavoriteMessage } from "@/app/(app)/dashboard/actions";

export function MessageOfTheDay({ id, body, favorited }: { id: number; body: string; favorited: boolean }) {
  const [fav, setFav] = useOptimistic(favorited);
  const [, startTransition] = useTransition();

  return (
    <section aria-labelledby="motd-heading" className="grid gap-6 md:grid-cols-[12rem_1fr]">
      <h2 id="motd-heading" className="eyebrow pt-2">Today&apos;s reflection</h2>
      <div>
        <blockquote className="heading-xl max-w-3xl text-balance">{body}</blockquote>
        <button
          type="button"
          className="btn btn-text mt-5 text-sm"
          aria-pressed={fav}
          onClick={() =>
            startTransition(async () => {
              setFav(!fav);
              await toggleFavoriteMessage(id, !fav);
            })
          }
        >
          {fav ? "Saved to favorites" : "Save to favorites"}
        </button>
      </div>
    </section>
  );
}
