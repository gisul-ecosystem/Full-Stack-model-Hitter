/** Appended to assignment_description so the 8GB deep grader stays criteria-anchored. */
export const GRADING_INSTRUCTIONS = `
GRADING RULES (must follow):
- Grade against acceptance_criteria first. Every criterion must appear in criteria_results as met, partial, or missed (or not_met) with evidence_paths when possible.
- Only flag defects that are visible in the provided files. Do not invent incomplete functions, missing code, or hardcoded ports when environment variables are already used (e.g. process.env.PORT / os.environ.get("PORT")).
- Do not mark missing databases, unit tests, comments, MVC layers, or style/naming nits as high severity unless those items are listed in acceptance_criteria.
- Prefer concrete issues with path + fix over vague architecture lectures.
- Keep score_breakdown comments specific to that dimension; do not reuse the same sentence for every dimension.
`.trim();

export function withGradingInstructions(description: string): string {
  const base = description.trim();
  if (!base) return GRADING_INSTRUCTIONS;
  if (base.includes("GRADING RULES (must follow)")) return base;
  return `${base}\n\n${GRADING_INSTRUCTIONS}`;
}
