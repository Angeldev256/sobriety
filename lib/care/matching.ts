import type { ProfessionalCard, Profession, SessionMode, Specialty } from "@/lib/database.types";
import { modeLabel, specialtyLabel } from "@/lib/care/constants";

/** What the intake assessment tells the matcher. Produced by the AI, validated before use. */
export type CareNeeds = {
  specialties: Specialty[];
  needs_medical_review: boolean;
  severity: "low" | "moderate" | "high" | "crisis";
  preferred_languages: string[];
  preferred_modes: SessionMode[];
  max_budget_ugx: number | null;
};

export type Match = { professional: ProfessionalCard; score: number; reasons: string[]; warnings: string[] };

const MEDICAL: Profession[] = ["psychiatrist", "psychiatric_nurse"];
const CLINICAL: Profession[] = ["psychiatrist", "clinical_psychologist"];

/**
 * Ranks verified professionals for one person's needs. Deterministic and explainable: every point
 * comes with a reason the person can read. The AI only describes needs; it never picks a professional.
 */
export function rankProfessionals(needs: CareNeeds, pros: ProfessionalCard[], limit = 3): Match[] {
  const wantLangs = new Set(needs.preferred_languages.map((l) => l.toLowerCase()));
  const scored = pros.map((p) => {
    let score = 0;
    const reasons: string[] = [];
    const warnings: string[] = [];

    for (const s of needs.specialties) {
      if (p.specialties.includes(s)) {
        score += 3;
        reasons.push(`Works with ${specialtyLabel(s).toLowerCase()}`);
      }
    }

    if (needs.needs_medical_review) {
      if (MEDICAL.includes(p.profession)) {
        score += 5;
        reasons.unshift("Can review withdrawal and medication");
      } else {
        warnings.push("Can't prescribe or review medication");
      }
    }

    if ((needs.severity === "high" || needs.severity === "crisis") && CLINICAL.includes(p.profession)) {
      score += 2;
      reasons.push("Clinically trained for complex needs");
    }

    if (wantLangs.size > 0) {
      const shared = p.languages.filter((l) => wantLangs.has(l.toLowerCase()));
      const local = shared.filter((l) => l !== "English");
      if (shared.length > 0) {
        score += 2;
        if (local.length > 0) reasons.push(`Speaks ${local.join(" and ")}`);
      } else {
        score -= 2;
        warnings.push("Doesn't list your preferred language");
      }
    }

    if (needs.preferred_modes.length > 0) {
      const shared = needs.preferred_modes.filter((m) => p.session_modes.includes(m));
      if (shared.length > 0) score += 1;
      else {
        score -= 3;
        warnings.push(`Doesn't offer ${needs.preferred_modes.map((m) => modeLabel(m).toLowerCase()).join(" or ")}`);
      }
    }

    if (needs.max_budget_ugx != null) {
      if (p.fee_ugx <= needs.max_budget_ugx) {
        score += 2;
        reasons.push("Within your budget");
      } else {
        score -= 3;
        warnings.push("Above the budget you mentioned");
      }
    }

    return { professional: p, score, reasons, warnings };
  });

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.professional.fee_ugx - b.professional.fee_ugx ||
        a.professional.full_name.localeCompare(b.professional.full_name),
    )
    .slice(0, limit)
    .map((m) => ({ ...m, reasons: m.reasons.slice(0, 4) }));
}
