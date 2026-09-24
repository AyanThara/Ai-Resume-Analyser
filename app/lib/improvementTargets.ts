/**
 * Phase 9: Resume Improvement Target Extraction Layer
 *
 * Deterministically extracts improvement targets directly from AtsResult and its diagnostics.
 * Categorizes targets into Critical, Important, and Optional tiers.
 * Provides deterministic improvement templates with strict anti-fabrication guards.
 *
 * 100% deterministic, local, and zero AI dependencies required for target discovery.
 */

import type { AtsResult } from "./atsEngine";
import type {
    RequiredSkillAlignmentItem,
    BulletAnalysisItem,
    SkillPlacementItem,
} from "./alignmentDiagnostics";
import { type ResumeSectionName } from "./jdParser";

export type ImprovementPriority = "critical" | "important" | "optional";

export type ImprovementTargetType =
    | "missing_required_skill"
    | "skills_only_skill"
    | "missing_metrics_bullet"
    | "weak_bullet"
    | "missing_preferred_skill"
    | "missing_section";

export interface DeterministicTemplate {
    suggestedText: string;
    requiresUserMetric: boolean;
    placement: "replace_bullet" | "append_skills" | "append_projects" | "append_experience";
    reason: string;
}

export interface ImprovementTarget {
    id: string;
    type: ImprovementTargetType;
    priority: ImprovementPriority;
    title: string;
    description: string;
    skillOrSection?: string;
    originalBulletText?: string;
    existingContextSnippet?: string;
    bulletSection?: string;
    category?: string;
    recommendation: string;
    deterministicTemplate: DeterministicTemplate;
}

/**
 * Extract prioritized improvement targets from an AtsResult.
 * Does NOT invent new diagnostics; strictly translates Phase 7.3/7.4 intelligence into actionable targets.
 */
export function extractImprovementTargets(
    atsResult: AtsResult,
    resumeText: string,
    jobDescription: string
): ImprovementTarget[] {
    const targets: ImprovementTarget[] = [];
    const diagnostics = atsResult.diagnostics;

    // -------------------------------------------------------------------------
    // 1. CRITICAL TARGETS
    // -------------------------------------------------------------------------

    // 1a. Missing Required Skills (verdict: missing_critical)
    const requiredItems = diagnostics?.requiredSkillReport?.items || [];
    for (const req of requiredItems) {
        if (req.verdict === "missing_critical") {
            targets.push({
                id: `target-missing-req-${req.skillId}`,
                type: "missing_required_skill",
                priority: "critical",
                title: `Missing Required Competency: ${req.display}`,
                description: `The job description strictly requires experience with ${req.display}, but no mention or implementation evidence was found on your resume.`,
                skillOrSection: req.display,
                category: req.category,
                recommendation: `If you have experience with ${req.display}, add it to your Technical Skills and describe a project or work experience bullet where you utilized it.`,
                deterministicTemplate: {
                    suggestedText: `• Utilized ${req.display} to develop [project/feature description], delivering [add measurable outcome: e.g. X% efficiency gain or Y records handled].`,
                    requiresUserMetric: true,
                    placement: "append_projects",
                    reason: `Adding substantiated practical evidence for ${req.display} directly satisfies a mandatory job requirement and boosts Keyword Match score.`,
                },
            });
        }
    }

    // 1b. Required Skills Listed Without Evidence (verdict: listed_without_evidence)
    for (const req of requiredItems) {
        if (req.verdict === "listed_without_evidence") {
            targets.push({
                id: `target-no-evidence-${req.skillId}`,
                type: "skills_only_skill",
                priority: "critical",
                title: `Demonstrate Practical Usage for ${req.display}`,
                description: `${req.display} is listed in your skills section but has no corresponding bullet in Projects or Experience demonstrating how you applied it.`,
                skillOrSection: req.display,
                category: req.category,
                existingContextSnippet: req.contextSnippet,
                recommendation: `Add an action-oriented bullet in Projects or Work Experience demonstrating hands-on implementation of ${req.display}.`,
                deterministicTemplate: {
                    suggestedText: `• Implemented [feature or pipeline] using ${req.display}, improving [add practical outcome: e.g. performance by X% or reliability].`,
                    requiresUserMetric: true,
                    placement: "append_projects",
                    reason: `Moving ${req.display} from a passive skill mention to practical implementation evidence maximizes algorithmic placement weighting.`,
                },
            });
        }
    }

    // 1c. Critical Missing Resume Sections
    const missingSections = atsResult.missingSections || [];
    if (missingSections.includes("Experience") && missingSections.includes("Projects")) {
        targets.push({
            id: `target-missing-sections-evidence`,
            type: "missing_section",
            priority: "critical",
            title: `Missing Core Evidence Sections`,
            description: `Your resume is missing both Experience and Projects sections. ATS algorithms heavily penalize resumes without verified implementation proof.`,
            skillOrSection: "Projects",
            recommendation: `Add a dedicated 'PROJECTS' or 'EXPERIENCE' section detailing your software development and technical contributions.`,
            deterministicTemplate: {
                suggestedText: `\nPROJECTS\nKey Project Name | Tech Stack\n• Engineered [feature/application] using [technologies], achieving [add actual metric or outcome].\n`,
                requiresUserMetric: true,
                placement: "append_projects",
                reason: `Provides the essential structural container required by ATS parsers to extract candidate competencies.`,
            },
        });
    }

    // -------------------------------------------------------------------------
    // 2. IMPORTANT TARGETS
    // -------------------------------------------------------------------------

    // 2a. Bullets needing quantifiable metrics (qualityTier: needs_metrics)
    const bulletItems = diagnostics?.achievementAnalysis?.bullets || [];
    for (let i = 0; i < bulletItems.length; i++) {
        const bullet = bulletItems[i];
        if (bullet.qualityTier === "needs_metrics") {
            const verb = bullet.actionVerb || "Developed";
            const techStr = bullet.technicalEntities.length > 0 ? ` using ${bullet.technicalEntities.join(", ")}` : "";

            targets.push({
                id: `target-needs-metrics-bullet-${i}`,
                type: "missing_metrics_bullet",
                priority: "important",
                title: `Add Measurable Outcome to Bullet`,
                description: `This bullet clearly states an action and technology, but lacks a quantifiable result or measurable business impact.`,
                originalBulletText: bullet.text,
                bulletSection: bullet.section,
                recommendation: `Enhance the bullet by adding a specific metric (percentage, volume, time saved, or throughput improvement).`,
                deterministicTemplate: {
                    suggestedText: `${bullet.text.replace(/[\.\s]+$/, "")}, resulting in [add actual metric: e.g. X% improvement or Y ms latency reduction].`,
                    requiresUserMetric: true,
                    placement: "replace_bullet",
                    reason: `ATS scoring and technical recruiters prioritize bullets with quantifiable proof of impact over descriptive tasks.`,
                },
            });
        }
    }

    // 2b. Weak Bullets (qualityTier: weak)
    for (let i = 0; i < bulletItems.length; i++) {
        const bullet = bulletItems[i];
        if (bullet.qualityTier === "weak") {
            targets.push({
                id: `target-weak-bullet-${i}`,
                type: "weak_bullet",
                priority: "important",
                title: `Strengthen Passive Bullet with Action Verb & Scope`,
                description: `This bullet lacks strong action verbs and specific technical details, making it appear passive or vague to ATS parsers.`,
                originalBulletText: bullet.text,
                bulletSection: bullet.section,
                recommendation: `Start with a strong active verb (e.g. Architected, Engineered, Implemented) and specify the technologies and concrete deliverables.`,
                deterministicTemplate: {
                    suggestedText: `• Implemented [specific system component] using [relevant technologies], [add actual outcome: e.g. reducing manual steps by X%].`,
                    requiresUserMetric: true,
                    placement: "replace_bullet",
                    reason: `Active verbs and explicit technical entities increase parseability and content quality scores.`,
                },
            });
        }
    }

    // 2c. Skills appearing only in Skills section (Placement items: mention_only)
    const placementItems = diagnostics?.placementAnalysis?.items || [];
    for (const pl of placementItems) {
        if (pl.quality === "mention_only" && pl.tier === "preferred") {
            // Avoid duplicate target if already added under critical
            if (!targets.some(t => t.skillOrSection === pl.skillDisplay)) {
                targets.push({
                    id: `target-skills-only-pref-${pl.skillId}`,
                    type: "skills_only_skill",
                    priority: "important",
                    title: `Provide Contextual Proof for ${pl.skillDisplay}`,
                    description: `${pl.skillDisplay} is only mentioned in the Skills section. Demonstrating it in a project bullet boosts content scoring.`,
                    skillOrSection: pl.skillDisplay,
                    recommendation: `Incorporate ${pl.skillDisplay} into a project or experience bullet to prove hands-on application.`,
                    deterministicTemplate: {
                        suggestedText: `• Applied ${pl.skillDisplay} to [describe practical application], achieving [add actual metric or outcome].`,
                        requiresUserMetric: true,
                        placement: "append_projects",
                        reason: `Validates preferred skill proficiency with project evidence.`,
                    },
                });
            }
        }
    }

    // -------------------------------------------------------------------------
    // 3. OPTIONAL TARGETS
    // -------------------------------------------------------------------------

    // 3a. Missing Preferred Skills
    const missingPreferred = atsResult.matchResult?.missingPreferred || [];
    for (const pref of missingPreferred) {
        // Limit to max 3 optional preferred skill suggestions to avoid cognitive overload
        if (targets.filter(t => t.type === "missing_preferred_skill").length >= 3) break;

        targets.push({
            id: `target-missing-pref-${pref.id}`,
            type: "missing_preferred_skill",
            priority: "optional",
            title: `Preferred Qualification: ${pref.display}`,
            description: `The job description mentions ${pref.display} as a bonus or preferred competency.`,
            skillOrSection: pref.display,
            category: pref.category,
            recommendation: `If you have worked with ${pref.display}, including it gives your application a competitive advantage over other candidates.`,
            deterministicTemplate: {
                suggestedText: `• Leveraged ${pref.display} to [build/configure feature], [add actual outcome].`,
                requiresUserMetric: true,
                placement: "append_projects",
                reason: `Satisfies a preferred competency, contributing to bonus keyword match points.`,
            },
        });
    }

    return targets;
}
