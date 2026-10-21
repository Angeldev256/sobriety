// A deliberately small set of hairline icons (1.5px stroke, 24px grid). Used only for
// navigation and status where a label alone would be cramped. Everything else is typographic.

type Props = { className?: string; size?: number };
const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const HomeIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 10.5 12 4l8.5 6.5V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />
  </svg>
);

export const CheckInIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
  </svg>
);

export const ToolkitIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v4.5l3 2" />
  </svg>
);

export const HistoryIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20V4M4 20h16" />
    <path d="m7.5 15 4-4.5 3 2.5 5-6" />
  </svg>
);

export const AccountIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4.5 20.5c1.2-3.8 4-5.5 7.5-5.5s6.3 1.7 7.5 5.5" />
  </svg>
);

export const HelpIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />
  </svg>
);

export const PlusIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

export const BellIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
);
