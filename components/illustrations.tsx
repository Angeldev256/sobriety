import type { ReactNode } from "react";

// Flat, theme-aware illustrations drawn in code: no downloads, crisp at any size, and they
// follow light/dark mode through the --illo-* tokens in globals.css.

type Props = { className?: string; title?: string };

function Frame({ title, className, viewBox, children }: Props & { viewBox: string; children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

/** Sunrise over rolling green-blue hills, with one person standing on the crest. */
export function SunriseHills(props: Props) {
  return (
    <Frame viewBox="0 0 800 560" {...props}>
      <rect width="800" height="560" fill="var(--illo-sky)" />
      <circle cx="560" cy="300" r="92" fill="var(--illo-sun)" />
      <circle cx="560" cy="300" r="132" fill="none" stroke="var(--illo-sun)" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="560" cy="300" r="176" fill="none" stroke="var(--illo-sun)" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M180 150q12-10 24 0q12-10 24 0" fill="none" stroke="var(--illo-ink)" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M250 110q9-8 18 0q9-8 18 0" fill="none" stroke="var(--illo-ink)" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M0 330C120 270 230 290 330 320s230 10 330-40 140-30 140-30v300H0z" fill="var(--illo-hill-1)" />
      <path d="M0 400c140-60 260-70 380-30s250 40 420-40v230H0z" fill="var(--illo-hill-2)" />
      <path d="M0 470c160-70 330-90 480-50s220 30 320 10v130H0z" fill="var(--illo-hill-3)" />
      <path d="M420 560c10-40 60-70 40-110s-70-40-40-80" fill="none" stroke="var(--illo-sky)" strokeOpacity="0.55" strokeWidth="10" strokeLinecap="round" />
      {/* person on the crest, facing the sunrise */}
      <g fill="var(--illo-ink)">
        <circle cx="372" cy="318" r="9" />
        <path d="M362 330h20l4 34h-6l-3 26h-10l-3-26h-6z" />
      </g>
    </Frame>
  );
}

/** Three people side by side — a support circle. */
export function SupportCircle(props: Props) {
  return (
    <Frame viewBox="0 0 640 420" {...props}>
      <rect width="640" height="420" fill="var(--illo-sky)" />
      <circle cx="320" cy="210" r="168" fill="none" stroke="var(--illo-hill-2)" strokeWidth="2" strokeDasharray="4 10" />
      <circle cx="320" cy="210" r="120" fill="var(--illo-hill-1)" />
      <g fill="var(--illo-hill-2)">
        <circle cx="212" cy="196" r="30" />
        <path d="M152 312c6-50 30-78 60-78s54 28 60 78z" />
        <circle cx="428" cy="196" r="30" />
        <path d="M368 312c6-50 30-78 60-78s54 28 60 78z" />
      </g>
      <g fill="var(--illo-hill-3)">
        <circle cx="320" cy="168" r="38" />
        <path d="M244 318c8-64 38-100 76-100s68 36 76 100z" />
      </g>
      <circle cx="320" cy="70" r="10" fill="var(--illo-sun)" />
    </Frame>
  );
}

/** A path winding up the hills toward the light. */
export function PathForward(props: Props) {
  return (
    <Frame viewBox="0 0 640 420" {...props}>
      <rect width="640" height="420" fill="var(--illo-sky)" />
      <circle cx="430" cy="150" r="58" fill="var(--illo-sun)" />
      <path d="M0 210c110-30 210-20 320 10s220 10 320-30v240H0z" fill="var(--illo-hill-1)" />
      <path d="M0 290c120-40 250-40 360-10s180 20 280-10v150H0z" fill="var(--illo-hill-2)" />
      <path d="M0 360c150-30 320-40 640-20v80H0z" fill="var(--illo-hill-3)" />
      <path
        d="M250 420c30-40 120-50 110-90s-110-30-90-70 120-30 150-60"
        fill="none"
        stroke="var(--illo-sky)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M250 420c30-40 120-50 110-90s-110-30-90-70 120-30 150-60" fill="none" stroke="var(--illo-sun)" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" />
    </Frame>
  );
}

/** Still water at dawn on the lake: a canoe, papyrus at the shore. */
export function LakeCalm(props: Props) {
  return (
    <Frame viewBox="0 0 640 420" {...props}>
      <rect width="640" height="420" fill="var(--illo-sky)" />
      <circle cx="440" cy="230" r="64" fill="var(--illo-sun)" />
      <rect y="230" width="640" height="190" fill="var(--illo-hill-2)" />
      <g stroke="var(--illo-sky)" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round">
        <path d="M380 256h120M400 276h80M410 296h60M120 270h90M60 320h140M300 340h110M470 360h120" />
      </g>
      <path d="M0 230h640" stroke="var(--illo-hill-3)" strokeWidth="2" />
      {/* canoe and paddler */}
      <g fill="var(--illo-ink)">
        <path d="M250 300h120c-10 14-30 20-60 20s-50-6-60-20z" />
        <circle cx="312" cy="270" r="7" />
        <path d="M304 280h16l2 20h-20z" />
      </g>
      <path d="M330 262l-22 52" stroke="var(--illo-ink)" strokeWidth="3" strokeLinecap="round" />
      {/* papyrus */}
      <g stroke="var(--illo-hill-3)" strokeWidth="3" strokeLinecap="round" fill="var(--illo-hill-3)">
        <path d="M40 420V250M70 420V270M100 420V240M20 420V290" />
        <circle cx="40" cy="244" r="12" />
        <circle cx="70" cy="264" r="10" />
        <circle cx="100" cy="232" r="13" />
        <circle cx="20" cy="284" r="9" />
      </g>
    </Frame>
  );
}
