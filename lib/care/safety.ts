// A plain keyword safety net that runs alongside the AI's own crisis judgement. If either one
// flags a message, the person sees crisis lines straight away. It errs on the side of showing them.

const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bkill(ing)?\s+(my\s*self|myself)\b/i,
  /\bend(ing)?\s+(it\s+all|my\s+life)\b/i,
  /\b(want|wanna|going)\s+to\s+die\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|wake\s+up)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bself[\s-]?harm/i,
  /\b(cut|cutting|hurt|hurting)\s+(my\s*self|myself)\b/i,
  /\boverdos/i,
  /\b(took|swallowed)\s+(all|too\s+many)\s+(the\s+)?(pills|tablets)\b/i,
  /\b(seizures?|convulsions?|having\s+fits)\b/i,
  /\bhallucinat/i,
  /\bkill\s+(him|her|them|someone|somebody)\b/i,
  // Luganda: "okwetta" / "nneetta" (to kill oneself), "njagala okufa" (I want to die)
  /\b(okw?etta|nn?eetta|kwetta)\b/i,
  /\bnjagala\s+okufa\b/i,
  // Swahili: "kujiua" (to kill oneself), "nataka kufa" (I want to die)
  /\bkujiua\b/i,
  /\bnataka\s+kufa\b/i,
];

export function looksLikeCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}
