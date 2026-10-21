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

export const MicIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <rect x="9" y="3.5" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" />
  </svg>
);

export const MicOffIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M15 10V6.5a3 3 0 0 0-5.6-1.5M9 9v2.5a3 3 0 0 0 4.6 2.5M5.5 11.5a6.5 6.5 0 0 0 10.4 5.2M18.4 13a6.5 6.5 0 0 0 .1-1.5M12 18v2.5M4 4l16 16" />
  </svg>
);

export const VideoIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
    <path d="m15.5 10.5 5-3v9l-5-3" />
  </svg>
);

export const VideoOffIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M15.5 13.5v1.5a2.5 2.5 0 0 1-2.5 2.5H5.5A2.5 2.5 0 0 1 3 15V9a2.5 2.5 0 0 1 2-2.45M9 6.5h4a2.5 2.5 0 0 1 2.5 2.5v1.5l5-3v9M4 4l16 16" />
  </svg>
);

export const PhoneIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />
  </svg>
);

export const PhoneOffIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M3 13.5c4.9-4.7 13.1-4.7 18 0l-2.2 2.6-3.8-1.3v-2.6a10 10 0 0 0-6 0v2.6l-3.8 1.3z" />
  </svg>
);

export const ChatIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5.5h16v10H9l-5 4z" />
  </svg>
);

export const SupportIcon = ({ className, size }: Props) => (
  <svg {...base(size)} className={className}>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M2.5 19c.8-3 2.9-4.5 5.5-4.5s4.7 1.5 5.5 4.5M13.5 15c.8-.3 1.6-.5 2.5-.5 2.6 0 4.7 1.5 5.5 4.5" />
  </svg>
);
