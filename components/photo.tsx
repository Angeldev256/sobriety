"use client";

import Image, { type ImageLoader } from "next/image";
import { useState } from "react";
import { creditLink, PHOTOS, unsplashSrc, type PhotoKey } from "@/lib/photos";

// Let Unsplash's CDN do the resizing: the browser requests exactly the width it needs.
const unsplashLoader: ImageLoader = ({ src, width, quality }) => unsplashSrc(src, width, quality ?? 70);

type Props = {
  name: PhotoKey;
  /** Tailwind classes for the frame, including its aspect ratio, e.g. "aspect-[4/3] rounded-lg" */
  className?: string;
  /** Responsive sizes hint, e.g. "(min-width: 768px) 50vw, 100vw" */
  sizes: string;
  priority?: boolean;
  credit?: "overlay" | "none";
};

/** An Unsplash photo with a gentle fallback and a small photographer credit. */
export function Photo({ name, className = "", sizes, priority = false, credit = "overlay" }: Props) {
  const photo = PHOTOS[name];
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`relative overflow-hidden bg-surface-2 ${className}`}>
      {!failed && (
        <Image
          loader={unsplashLoader}
          src={photo.id}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setFailed(true)}
          className="object-cover motion-safe:transition-opacity motion-safe:duration-500"
          style={{ objectPosition: "focus" in photo ? photo.focus : "50% 50%" }}
        />
      )}
      {credit === "overlay" && !failed && (
        <figcaption className="absolute right-2 bottom-2 rounded-full bg-black/55 px-2.5 py-1 text-[0.625rem] leading-none text-white/85 backdrop-blur-sm">
          Photo:{" "}
          <a href={creditLink(photo.profile)} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            {photo.photographer}
          </a>{" "}
          /{" "}
          <a href={creditLink("https://unsplash.com")} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            Unsplash
          </a>
        </figcaption>
      )}
    </figure>
  );
}
