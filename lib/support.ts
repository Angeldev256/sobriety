import type { Relationship } from "@/lib/database.types";

export const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: "counselor", label: "Counsellor" },
  { value: "sponsor", label: "Sponsor" },
  { value: "health_worker", label: "Health worker" },
  { value: "faith_leader", label: "Faith leader" },
  { value: "family", label: "Family member" },
  { value: "friend", label: "Friend" },
  { value: "peer", label: "Peer in recovery" },
  { value: "other", label: "Someone else" },
];

export function relationshipLabel(r: Relationship): string {
  // 'professional' connections are opened by a paid consultation, never by an invite, so it's not in RELATIONSHIPS.
  if (r === "professional") return "Mental health professional";
  return RELATIONSHIPS.find((x) => x.value === r)?.label ?? "Helper";
}

/**
 * Normalises a phone number to international digits (no "+"), defaulting to Uganda (+256).
 *   "0772 123 456" → "256772123456",  "+256 772 123456" → "256772123456",  "772123456" → "256772123456".
 * Returns null when it can't be a valid number.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `256${digits.slice(1)}`;
  else if (digits.length === 9 && /^[37]/.test(digits)) digits = `256${digits}`;
  if (digits.startsWith("256") && digits.length !== 12) return null;
  return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

/** "256772123456" → "+256 772 123 456" (other countries: "+" and the digits). */
export function formatPhone(digits: string): string {
  if (digits.startsWith("256") && digits.length === 12) {
    return `+256 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return `+${digits}`;
}

export const whatsappLink = (digits: string, text?: string) =>
  `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const telLink = (digits: string) => `tel:+${digits}`;

/** Share-anywhere WhatsApp link (no recipient), e.g. for sending an invite. */
export const whatsappShareLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export type PeerView = {
  connectionId: string;
  peerId: string | null;
  peerName: string;
  relationship: Relationship;
  /** true when the viewer is the person in recovery on this connection */
  viewerIsMember: boolean;
  phone: string | null;
  isPreferred: boolean;
};

type ConnLike = {
  id: string;
  member_id: string;
  member_name: string;
  helper_id: string | null;
  helper_name: string;
  relationship: Relationship;
  phone: string | null;
  is_preferred: boolean;
};

/** The other person on a connection, from the viewer's side. */
export function peerOf(c: ConnLike, viewerId: string): PeerView {
  const viewerIsMember = c.member_id === viewerId;
  return {
    connectionId: c.id,
    peerId: viewerIsMember ? c.helper_id : c.member_id,
    peerName: viewerIsMember ? c.helper_name : c.member_name,
    relationship: c.relationship,
    viewerIsMember,
    // Only the member stores a phone number, and it's the helper's.
    phone: viewerIsMember ? c.phone : null,
    isPreferred: viewerIsMember && c.is_preferred,
  };
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
