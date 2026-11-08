import { describe, expect, it } from "vitest";
import { rankProfessionals, type CareNeeds } from "@/lib/care/matching";
import { paymentMatches } from "@/lib/care/payment-match";
import { looksLikeCrisis } from "@/lib/care/safety";
import type { ProfessionalCard } from "@/lib/database.types";

const pro = (over: Partial<ProfessionalCard> & { user_id: string }): ProfessionalCard => ({
  full_name: `Pro ${over.user_id}`,
  profession: "counsellor",
  licence_body: "Uganda Counselling Association",
  institution: null,
  bio: "",
  specialties: [],
  languages: ["English"],
  session_modes: ["chat", "audio", "video"],
  fee_ugx: 50000,
  ...over,
});

const needs = (over: Partial<CareNeeds> = {}): CareNeeds => ({
  specialties: [],
  needs_medical_review: false,
  severity: "moderate",
  preferred_languages: [],
  preferred_modes: [],
  max_budget_ugx: null,
  ...over,
});

describe("rankProfessionals", () => {
  it("ranks the professional who covers the person's needs first, with readable reasons", () => {
    const [top, second] = rankProfessionals(needs({ specialties: ["alcohol", "dual_diagnosis"] }), [
      pro({ user_id: "a", specialties: ["gambling"] }),
      pro({ user_id: "b", specialties: ["alcohol", "dual_diagnosis"] }),
    ]);
    expect(top.professional.user_id).toBe("b");
    expect(top.reasons).toContain("Works with alcohol");
    expect(second.professional.user_id).toBe("a");
  });

  it("puts someone who can review medication first when withdrawal needs medical review", () => {
    const [top] = rankProfessionals(needs({ specialties: ["alcohol"], needs_medical_review: true }), [
      pro({ user_id: "counsellor", specialties: ["alcohol", "relapse_prevention"] }),
      pro({ user_id: "psychiatrist", profession: "psychiatrist", specialties: ["alcohol"] }),
    ]);
    expect(top.professional.user_id).toBe("psychiatrist");
    expect(top.reasons[0]).toBe("Can review withdrawal and medication");
  });

  it("prefers a shared local language and warns when the fee is above budget", () => {
    const matches = rankProfessionals(needs({ preferred_languages: ["Luganda"], max_budget_ugx: 40000 }), [
      pro({ user_id: "english", fee_ugx: 30000 }),
      pro({ user_id: "luganda", languages: ["English", "Luganda"], fee_ugx: 60000 }),
    ]);
    const luganda = matches.find((m) => m.professional.user_id === "luganda")!;
    expect(luganda.reasons).toContain("Speaks Luganda");
    expect(luganda.warnings).toContain("Above the budget you mentioned");
  });

  it("is deterministic on ties (cheaper first) and respects the limit", () => {
    const pros = [pro({ user_id: "x", fee_ugx: 80000 }), pro({ user_id: "y", fee_ugx: 40000 }), pro({ user_id: "z", fee_ugx: 60000 }), pro({ user_id: "w" })];
    const ids = rankProfessionals(needs(), pros, 3).map((m) => m.professional.user_id);
    expect(ids).toEqual(["y", "w", "z"]);
  });

  it("returns nothing when no one is available", () => {
    expect(rankProfessionals(needs({ specialties: ["alcohol"] }), [])).toEqual([]);
  });
});

describe("paymentMatches", () => {
  const booking = { tx_ref: "care-abc", fee_ugx: 50000 };
  const tx = { id: 1, tx_ref: "care-abc", status: "successful", amount: 50000, currency: "UGX" };

  it("accepts a successful UGX payment of the full fee for this booking", () => {
    expect(paymentMatches(tx, booking)).toBe(true);
  });

  it.each([
    ["an unsuccessful payment", { status: "failed" }],
    ["a pending payment", { status: "pending" }],
    ["less than the fee", { amount: 49999 }],
    ["another currency", { currency: "USD" }],
    ["another booking's reference", { tx_ref: "care-other" }],
  ])("rejects %s", (_label, change) => {
    expect(paymentMatches({ ...tx, ...change }, booking)).toBe(false);
  });
});

describe("looksLikeCrisis", () => {
  it.each([
    "I want to kill myself",
    "sometimes I think about suicide",
    "I took all the pills last night",
    "I've been having seizures when I stop drinking",
    "I don't want to live anymore",
    "njagala okufa",
    "nataka kufa",
  ])("flags %j", (text) => {
    expect(looksLikeCrisis(text)).toBe(true);
  });

  it.each([
    "I want to end my drinking",
    "The price fits my budget",
    "Betting is killing my savings",
    "I drink about four beers a day",
  ])("doesn't flag %j", (text) => {
    expect(looksLikeCrisis(text)).toBe(false);
  });
});
