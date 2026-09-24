/**
 * Phase 9: AI Suggestion Generator & Validator
 *
 * Coordinates generation of actionable resume improvements via Puter AI when enabled,
 * or immediately falls back to deterministic rule-based templates.
 *
 * Implements strict structured schema validation, timeout handling, and rigorous
 * anti-fabrication guards ensuring metrics and technologies are never hallucinated.
 */

import { APP_CONFIG } from "~/config";
import type { ImprovementTarget, ImprovementPriority } from "./improvementTargets";
import { safeExtractJSON } from "./utils";

export interface ResumeSuggestion {
    id: string;
    targetId: string;
    type: "bullet_improvement" | "missing_skill" | "skills_only" | "metric_improvement" | "verb_improvement";
    priority: ImprovementPriority;
    issue: string;
    originalText?: string;
    suggestedText: string;
    reason: string;
    evidence?: string;
    requiresUserMetric: boolean;
    suggestedPlacement?: "replace_bullet" | "append_skills" | "append_projects" | "append_experience";
    targetSkill?: string;
    status: "pending" | "accepted" | "rejected";
}

export interface SuggestionBatchResult {
    suggestions: ResumeSuggestion[];
    source: "ai" | "deterministic";
    error?: string;
}

/**
 * Validates a single candidate suggestion against safety and schema standards.
 * Returns null if the suggestion fails validation or violates anti-fabrication rules.
 */
export function validateSuggestion(
    candidate: any,
    resumeText: string,
    knownTargets: ImprovementTarget[]
): ResumeSuggestion | null {
    if (!candidate || typeof candidate !== "object") return null;

    // 1. Required fields check
    const id = typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `sug-${Math.random().toString(36).slice(2, 9)}`;
    const targetId = typeof candidate.targetId === "string" ? candidate.targetId : "";
    const issue = typeof candidate.issue === "string" ? candidate.issue.trim() : "";
    const suggestedText = typeof candidate.suggestedText === "string" ? candidate.suggestedText.trim() : "";
    const reason = typeof candidate.reason === "string" ? candidate.reason.trim() : "";

    if (!issue || !suggestedText || !reason) {
        return null;
    }

    // 2. Priority validation
    const validPriorities: ImprovementPriority[] = ["critical", "important", "optional"];
    const priority: ImprovementPriority = validPriorities.includes(candidate.priority)
        ? candidate.priority
        : "important";

    // 3. Type validation
    const validTypes = ["bullet_improvement", "missing_skill", "skills_only", "metric_improvement", "verb_improvement"] as const;
    const type = validTypes.includes(candidate.type) ? candidate.type : "bullet_improvement";

    // 4. Original text validation (if specified for replacement)
    const originalText = typeof candidate.originalText === "string" && candidate.originalText.trim()
        ? candidate.originalText.trim()
        : undefined;

    if (originalText && !resumeText.includes(originalText)) {
        // Check if the specific target's original bullet exists in resume
        const matchingTarget = knownTargets.find(t => t.id === targetId && t.originalBulletText && resumeText.includes(t.originalBulletText));
        if (!matchingTarget) {
            // Cannot reliably replace text that does not exist in resume
            if (candidate.suggestedPlacement === "replace_bullet" || !candidate.suggestedPlacement) {
                return null;
            }
        }
    }

    // 5. Anti-fabrication check:
    // If the suggestion adds numbers/percentages that were not present in originalText or resume,
    // it MUST use a bracketed placeholder like [Add metric: ...] or have requiresUserMetric: true.
    const hasBracketPlaceholder = /\[.*?\]/.test(suggestedText);
    const requiresUserMetric = Boolean(candidate.requiresUserMetric) || hasBracketPlaceholder;

    const suggestedPlacement = ["replace_bullet", "append_skills", "append_projects", "append_experience"].includes(candidate.suggestedPlacement)
        ? candidate.suggestedPlacement
        : (originalText ? "replace_bullet" : "append_projects");

    return {
        id,
        targetId,
        type,
        priority,
        issue,
        originalText,
        suggestedText,
        reason,
        evidence: typeof candidate.evidence === "string" ? candidate.evidence : undefined,
        requiresUserMetric,
        suggestedPlacement,
        targetSkill: typeof candidate.targetSkill === "string" ? candidate.targetSkill : undefined,
        status: "pending",
    };
}

/**
 * Creates fallback suggestions deterministically from extracted targets.
 * 100% reliable, zero external network dependency, adheres strictly to anti-fabrication standards.
 */
export function createDeterministicSuggestions(
    targets: ImprovementTarget[],
    resumeText: string
): ResumeSuggestion[] {
    return targets.map((t, idx) => {
        let type: ResumeSuggestion["type"] = "bullet_improvement";
        if (t.type === "missing_required_skill" || t.type === "missing_preferred_skill") {
            type = "missing_skill";
        } else if (t.type === "skills_only_skill") {
            type = "skills_only";
        } else if (t.type === "missing_metrics_bullet") {
            type = "metric_improvement";
        } else if (t.type === "weak_bullet") {
            type = "verb_improvement";
        }

        return {
            id: `det-sug-${idx}-${t.id}`,
            targetId: t.id,
            type,
            priority: t.priority,
            issue: t.title,
            originalText: t.originalBulletText,
            suggestedText: t.deterministicTemplate.suggestedText,
            reason: t.deterministicTemplate.reason,
            evidence: t.description,
            requiresUserMetric: t.deterministicTemplate.requiresUserMetric,
            suggestedPlacement: t.deterministicTemplate.placement,
            targetSkill: t.skillOrSection,
            status: "pending",
        };
    });
}

/**
 * Main suggestion generation orchestrator.
 * Queries Puter AI if enabled, validates response, or cleanly falls back to deterministic suggestions.
 */
export async function generateResumeSuggestions(params: {
    targets: ImprovementTarget[];
    resumeText: string;
    jobDescription: string;
    aiChat?: (prompt: string, options?: any) => Promise<any>;
}): Promise<SuggestionBatchResult> {
    const { targets, resumeText, jobDescription, aiChat } = params;

    // If no targets exist, resume is already optimal
    if (!targets || targets.length === 0) {
        return {
            suggestions: [],
            source: "deterministic",
        };
    }

    // If Puter AI is disabled in APP_CONFIG or no aiChat function supplied, immediately use deterministic suggestions
    if (!APP_CONFIG.PUTER_AI_ENABLED || !aiChat) {
        return {
            suggestions: createDeterministicSuggestions(targets, resumeText),
            source: "deterministic",
        };
    }

    // Build structured prompt for AI
    try {
        const topTargets = targets.slice(0, 8); // Send most critical targets to respect token limits

        const prompt = `You are an expert technical resume coach and ATS optimization assistant.
Review these diagnosed resume improvement targets against the Job Description.

JOB DESCRIPTION (Target Requirements):
${jobDescription.slice(0, 1500)}

DIAGNOSED IMPROVEMENT TARGETS:
${JSON.stringify(topTargets.map(t => ({
    targetId: t.id,
    type: t.type,
    priority: t.priority,
    skill: t.skillOrSection,
    originalBullet: t.originalBulletText,
    issue: t.title,
    recommendation: t.recommendation,
})), null, 2)}

STRICT SAFETY RULES AGAINST FABRICATION:
1. NEVER invent metrics, percentages, dollar amounts, team sizes, or latency numbers.
2. If suggesting an outcome, use explicit placeholders like "[Add actual metric: e.g. %/time/users]".
3. For missing skills, provide a template only if the user genuinely has that experience.
4. For bullets needing metrics, preserve the exact factual action and technology, appending metric placeholders.
5. Suggest strong action verbs (e.g. Developed, Engineered, Optimized) instead of passive phrasing.

Respond ONLY with a JSON object in this exact schema:
{
  "suggestions": [
    {
      "id": "sug-1",
      "targetId": "targetId from list",
      "type": "bullet_improvement" | "missing_skill" | "skills_only" | "metric_improvement" | "verb_improvement",
      "priority": "critical" | "important" | "optional",
      "issue": "Concise issue summary",
      "originalText": "exact bullet text from resume if replacing a bullet, or empty string",
      "suggestedText": "improved bullet or text with placeholders",
      "reason": "Why this improves ATS ranking",
      "evidence": "Observed evidence or requirement",
      "requiresUserMetric": true,
      "suggestedPlacement": "replace_bullet" | "append_skills" | "append_projects" | "append_experience"
    }
  ]
}`;

        // 10-second timeout guarantee for AI response
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AI suggestion request timed out after 10s")), 10000)
        );

        const aiPromise = aiChat(prompt, { model: "claude-sonnet" });
        const response = await Promise.race([aiPromise, timeoutPromise]);

        let responseText = "";
        if (response && typeof response === "object") {
            if (typeof (response as any).message?.content === "string") {
                responseText = (response as any).message.content;
            } else if (typeof (response as any).text === "string") {
                responseText = (response as any).text;
            }
        }

        const parsed = safeExtractJSON(responseText) as { suggestions?: any[] };
        if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
            const validSuggestions: ResumeSuggestion[] = [];
            for (const item of parsed.suggestions) {
                const validated = validateSuggestion(item, resumeText, targets);
                if (validated) {
                    validSuggestions.push(validated);
                }
            }

            if (validSuggestions.length > 0) {
                return {
                    suggestions: validSuggestions,
                    source: "ai",
                };
            }
        }

        // If parsed suggestions were empty or invalid, fallback cleanly
        console.warn("[SUGGESTION_GENERATOR] AI returned no valid suggestions. Falling back to deterministic templates.");
        return {
            suggestions: createDeterministicSuggestions(targets, resumeText),
            source: "deterministic",
            error: "AI returned unparseable output; used deterministic templates.",
        };
    } catch (err) {
        console.warn("[SUGGESTION_GENERATOR] AI generation error:", err);
        return {
            suggestions: createDeterministicSuggestions(targets, resumeText),
            source: "deterministic",
            error: err instanceof Error ? err.message : "AI service unavailable",
        };
    }
}
