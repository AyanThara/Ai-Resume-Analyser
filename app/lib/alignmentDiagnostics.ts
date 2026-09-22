/**
 * Phase 7.4: Resume Quality & JD Alignment Intelligence
 *
 * Deterministic diagnostic layer that analyzes:
 * 1. Skill placement across resume sections (detecting poorly-placed skills).
 * 2. Required-skill alignment (status, evidence strength, practical proof).
 * 3. Achievement & evidence quality of project/work bullets (action verbs, tech, metrics).
 * 4. High-level JD alignment signals (explainability metadata).
 * 5. Resume issue detection (missing skills, missing metrics, buzzwords).
 * 6. Actionable recommendations (Critical, Important, Optional).
 *
 * 100% deterministic, local, and zero AI dependencies.
 */

import {
    type ExtractedSkill,
    type ParsedJobDescription,
    type JdSkillMatchResult,
    type ResumeSectionName,
    type ParsedResumeSection,
    segmentResumeSections,
    SKILLS_TAXONOMY,
    matchPattern,
    PROFICIENCY_SIGNALS,
} from "./jdParser";

import { ACTION_VERBS } from "./atsEngine";

// -----------------------------------------------------------------------------
// TYPES & INTERFACES
// -----------------------------------------------------------------------------

export type PlacementQuality = "optimal" | "mention_only" | "peripheral_only" | "not_found";

export interface SkillPlacementItem {
    skillId: string;
    skillDisplay: string;
    tier: "required" | "preferred";
    sections: ResumeSectionName[];
    quality: PlacementQuality;
    isPoorlyPlaced: boolean;
    tip?: string;
}

export interface SkillPlacementAnalysis {
    items: SkillPlacementItem[];
    optimalCount: number;
    skillsOnlyCount: number;
    peripheralCount: number;
    skillsOnlySkills: string[];
}

export type RequiredAlignmentVerdict =
    | "fully_aligned"
    | "partially_aligned"
    | "listed_without_evidence"
    | "missing_critical";

export interface RequiredSkillAlignmentItem {
    skillId: string;
    display: string;
    category: string;
    matched: boolean;
    evidenceStrength: "strong" | "moderate" | "mention_only" | "none";
    sections: ResumeSectionName[];
    hasPracticalEvidence: boolean;
    contextSnippet?: string;
    verdict: RequiredAlignmentVerdict;
}

export interface RequiredSkillAlignmentReport {
    items: RequiredSkillAlignmentItem[];
    totalRequired: number;
    matchedRequired: number;
    practicalEvidenceCount: number;
    missingCriticalCount: number;
    alignmentPct: number;
}

export type BulletQualityTier = "strong" | "needs_metrics" | "weak";

export interface BulletAnalysisItem {
    text: string;
    section: "Experience" | "Projects" | "Other";
    actionVerb: string | null;
    technicalEntities: string[];
    measurableMetrics: string[];
    qualityTier: BulletQualityTier;
    improvementSuggestion?: string;
}

export interface AchievementQualityAnalysis {
    bullets: BulletAnalysisItem[];
    totalBullets: number;
    strongBullets: number;
    needsMetricsBullets: number;
    weakBullets: number;
    impactMetricRate: number; // percentage of bullets with quantifiable metrics
}

export type AlignmentLevel =
    | "strong_alignment"
    | "partial_alignment"
    | "weak_alignment"
    | "major_skill_gaps";

export interface JdAlignmentSignal {
    alignmentLevel: AlignmentLevel;
    requiredCoveragePct: number;
    practicalEvidenceRatePct: number;
    summaryText: string;
    keyStrengths: string[];
    primaryConcerns: string[];
}

export type IssueSeverity = "critical" | "warning" | "info";

export interface ResumeIssueItem {
    id: string;
    type:
        | "missing_required_skill"
        | "skills_only_skill"
        | "bullet_missing_metrics"
        | "bullet_missing_action_verb"
        | "generic_buzzwords";
    severity: IssueSeverity;
    message: string;
    target?: string;
}

export interface StructuredRecommendations {
    critical: string[];
    important: string[];
    optional: string[];
}

export interface AlignmentDiagnosticsResult {
    placementAnalysis: SkillPlacementAnalysis;
    requiredSkillReport: RequiredSkillAlignmentReport;
    achievementAnalysis: AchievementQualityAnalysis;
    alignmentSignal: JdAlignmentSignal;
    issues: ResumeIssueItem[];
    recommendations: StructuredRecommendations;
}

// -----------------------------------------------------------------------------
// PATTERNS & CONSTANTS
// -----------------------------------------------------------------------------

/**
 * Metric pattern: percentages, dollar values, multipliers, latency, scale, user counts
 */
export const METRIC_PATTERN = /(?:\d+(?:\.\d+)?%|\$\s*\d+(?:,\d+)*(?:\.\d+)?[kKmMbB]?|\b\d+(?:\.\d+)?x\b|\b(?:sub-)?\d+\s*(?:ms|s|sec|seconds|minutes|hours)\b|\b\d+(?:,\d+)*(?:\.\d+)?[kKmMbB]?\+?\s*(?:[a-zA-Z0-9_-]+\s+){0,3}(?:users|clients|customers|members|endpoints|tests|queries|requests|models|datasets|features|stars|qps|rps|engineers|chefs|guests|problems|records|downloads|views)\b|\b(?:sub-20ms|99\.9%|98\.5%)\b)/i;

/**
 * Generic buzzwords that convey vague enthusiasm without engineering substance.
 */
export const GENERIC_BUZZWORDS = [
    "hardworking", "team player", "results-driven", "results driven",
    "fast learner", "quick learner", "detail-oriented", "detail oriented",
    "self-starter", "self starter", "passionate", "go-getter", "go getter",
    "out-of-the-box thinker", "thought leader", "synergy", "motivated individual"
];

// -----------------------------------------------------------------------------
// DIAGNOSTIC FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * 1. Keyword Placement Analysis
 * Evaluates whether matched skills appear in high-impact sections (Experience/Projects)
 * versus passive lists (Skills only).
 */
export function analyzeSkillPlacement(
    parsedJd: ParsedJobDescription,
    matchResult: JdSkillMatchResult
): SkillPlacementAnalysis {
    const items: SkillPlacementItem[] = [];
    let optimalCount = 0;
    let skillsOnlyCount = 0;
    let peripheralCount = 0;
    const skillsOnlySkills: string[] = [];

    for (const skill of matchResult.allMatched) {
        const ev = matchResult.evidenceMap[skill.id];
        const sections = ev ? ev.detectedSections : [];

        const hasActionSection = sections.includes("Experience") || sections.includes("Projects");
        const hasSkillsSection = sections.includes("Skills");

        let quality: PlacementQuality;
        let isPoorlyPlaced = false;
        let tip: string | undefined = undefined;

        if (hasActionSection) {
            quality = "optimal";
            optimalCount++;
        } else if (hasSkillsSection) {
            quality = "mention_only";
            isPoorlyPlaced = true;
            skillsOnlyCount++;
            skillsOnlySkills.push(skill.display);
            tip = `Move ${skill.display} from passive Skills list into active project or work experience accomplishment bullets.`;
        } else if (sections.length > 0) {
            quality = "peripheral_only";
            isPoorlyPlaced = true;
            peripheralCount++;
            tip = `Ground ${skill.display} in an Experience or Projects accomplishment bullet rather than only in ${sections.join(", ")}.`;
        } else {
            quality = "not_found";
        }

        items.push({
            skillId: skill.id,
            skillDisplay: skill.display,
            tier: skill.tier,
            sections,
            quality,
            isPoorlyPlaced,
            tip,
        });
    }

    return {
        items,
        optimalCount,
        skillsOnlyCount,
        peripheralCount,
        skillsOnlySkills,
    };
}

/**
 * 2. Required-Skill Alignment Report
 * Evaluates candidate alignment against every core requirement specified in the JD.
 */
export function analyzeRequiredSkills(
    parsedJd: ParsedJobDescription,
    matchResult: JdSkillMatchResult
): RequiredSkillAlignmentReport {
    const items: RequiredSkillAlignmentItem[] = [];
    let practicalEvidenceCount = 0;
    let missingCriticalCount = 0;

    for (const req of parsedJd.requiredSkills) {
        const matched = matchResult.matchedRequired.some((s) => s.id === req.id);
        const ev = matchResult.evidenceMap[req.id];
        const evidenceStrength = ev ? ev.evidenceLevel : "none";
        const sections = ev ? ev.detectedSections : [];
        const hasPracticalEvidence = ev ? (ev.evidenceLevel === "strong" || ev.evidenceLevel === "moderate") : false;

        let verdict: RequiredAlignmentVerdict;
        if (!matched) {
            verdict = "missing_critical";
            missingCriticalCount++;
        } else if (hasPracticalEvidence && ev?.evidenceLevel === "strong") {
            verdict = "fully_aligned";
            practicalEvidenceCount++;
        } else if (hasPracticalEvidence) {
            verdict = "partially_aligned";
            practicalEvidenceCount++;
        } else {
            verdict = "listed_without_evidence";
        }

        items.push({
            skillId: req.id,
            display: req.display,
            category: req.category,
            matched,
            evidenceStrength,
            sections,
            hasPracticalEvidence,
            contextSnippet: ev?.sampleSnippet,
            verdict,
        });
    }

    const totalRequired = parsedJd.requiredSkills.length;
    const matchedRequired = matchResult.matchedRequired.length;
    const alignmentPct = totalRequired > 0 ? Math.round((practicalEvidenceCount / totalRequired) * 100) : 100;

    return {
        items,
        totalRequired,
        matchedRequired,
        practicalEvidenceCount,
        missingCriticalCount,
        alignmentPct,
    };
}

/**
 * 3. Achievement & Evidence Quality Analysis
 * Evaluates accomplishment bullets in Experience and Projects for Action + Tech + Metrics (XYZ format).
 */
export function analyzeAchievementQuality(
    resumeText: string,
    sections: ParsedResumeSection[]
): AchievementQualityAnalysis {
    const bullets: BulletAnalysisItem[] = [];

    // Focus on action-oriented sections: Experience and Projects
    const actionSections = sections.filter((s) => s.name === "Experience" || s.name === "Projects");

    for (const sec of actionSections) {
        const lines = sec.content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
            const isBullet = /^[•*\-–\d+.]\s+/.test(line) || (line.length >= 35 && ACTION_VERBS.some((v) => line.toLowerCase().startsWith(v)));
            if (!isBullet || line.length < 25) continue;

            const strippedLine = line.replace(/^[•*\-–\d+.]\s+/, "").trim();
            const lowerLine = strippedLine.toLowerCase();

            // Detect action verb
            const foundVerb = ACTION_VERBS.find((v) => {
                const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const rx = new RegExp(`(^|[^a-zA-Z])${escaped}([^a-zA-Z]|$)`, "i");
                return rx.test(strippedLine);
            }) || null;

            // Detect technical skills mentioned in this bullet
            const techFound: string[] = [];
            for (const skill of SKILLS_TAXONOMY) {
                if (skill.aliases.some((alias) => matchPattern(strippedLine, alias))) {
                    if (!techFound.includes(skill.display)) {
                        techFound.push(skill.display);
                    }
                }
            }

            // Detect quantifiable metrics
            const metricMatches: string[] = [];
            const metricMatch = METRIC_PATTERN.exec(strippedLine);
            if (metricMatch) {
                metricMatches.push(metricMatch[0]);
            }

            // Quality tier classification
            let qualityTier: BulletQualityTier;
            let improvementSuggestion: string | undefined = undefined;

            if (foundVerb && techFound.length > 0 && metricMatches.length > 0) {
                qualityTier = "strong";
            } else if (foundVerb && techFound.length > 0) {
                qualityTier = "needs_metrics";
                improvementSuggestion = `Add measurable outcomes (% latency reduced, $ saved, throughput, user scale, or query time).`;
            } else {
                qualityTier = "weak";
                improvementSuggestion = `Begin with an active power verb (e.g. Engineered, Architected) and specify the technical tools used.`;
            }

            bullets.push({
                text: strippedLine,
                section: sec.name as "Experience" | "Projects",
                actionVerb: foundVerb,
                technicalEntities: techFound,
                measurableMetrics: metricMatches,
                qualityTier,
                improvementSuggestion,
            });
        }
    }

    const totalBullets = bullets.length;
    const strongBullets = bullets.filter((b) => b.qualityTier === "strong").length;
    const needsMetricsBullets = bullets.filter((b) => b.qualityTier === "needs_metrics").length;
    const weakBullets = bullets.filter((b) => b.qualityTier === "weak").length;
    const impactMetricRate = totalBullets > 0 ? Math.round((strongBullets / totalBullets) * 100) : 0;

    return {
        bullets,
        totalBullets,
        strongBullets,
        needsMetricsBullets,
        weakBullets,
        impactMetricRate,
    };
}

/**
 * 4. JD Alignment Signals
 * Categorizes overall alignment into high-level explainability metadata.
 */
export function detectAlignmentSignals(
    parsedJd: ParsedJobDescription,
    matchResult: JdSkillMatchResult,
    reqReport: RequiredSkillAlignmentReport
): JdAlignmentSignal {
    const reqCov = matchResult.coverageRequiredPct;
    const pracRate = reqReport.totalRequired > 0
        ? Math.round((reqReport.practicalEvidenceCount / reqReport.totalRequired) * 100)
        : 100;

    let alignmentLevel: AlignmentLevel;
    let summaryText: string;

    if (reqCov === 0 || reqCov < 35) {
        alignmentLevel = "major_skill_gaps";
        summaryText = `Significant qualifications gap: missing ${reqReport.missingCriticalCount} of ${reqReport.totalRequired} core required competencies.`;
    } else if (reqCov >= 70 && pracRate >= 50) {
        alignmentLevel = "strong_alignment";
        summaryText = `Strong technical alignment: matched ${reqReport.matchedRequired} of ${reqReport.totalRequired} core requirements with substantiated implementation evidence.`;
    } else if (reqCov >= 45) {
        alignmentLevel = "partial_alignment";
        summaryText = `Moderate alignment: covers ${reqCov}% of required skills with solid technical overlap, but key core competencies remain missing.`;
    } else {
        alignmentLevel = "weak_alignment";
        summaryText = `Limited qualification alignment: matches ${reqCov}% of required skills. Additional domain-specific evidence required.`;
    }

    const keyStrengths: string[] = [];
    if (matchResult.matchedRequired.length >= 5) {
        keyStrengths.push(`Matches ${matchResult.matchedRequired.length} essential job competencies.`);
    }
    if (reqReport.practicalEvidenceCount >= 4) {
        keyStrengths.push(`Substantiated practical project/work evidence for ${reqReport.practicalEvidenceCount} core skills.`);
    }
    if (matchResult.matchedPreferred.length >= 2) {
        keyStrengths.push(`Demonstrates ${matchResult.matchedPreferred.length} preferred/bonus competencies.`);
    }
    if (keyStrengths.length === 0 && matchResult.matchedRequired.length > 0) {
        keyStrengths.push(`Demonstrates foundational alignment in ${matchResult.matchedRequired.map(s => s.display).join(", ")}.`);
    }

    const primaryConcerns: string[] = [];
    if (reqReport.missingCriticalCount > 0) {
        const topMissing = matchResult.missingRequired.slice(0, 3).map((s) => s.display).join(", ");
        primaryConcerns.push(`Missing ${reqReport.missingCriticalCount} mandatory requirements: ${topMissing}.`);
    }
    const skillsOnlyList = matchResult.gapAnalysis.evidenceGaps
        .filter((eg) => eg.skill.tier === "required")
        .map((eg) => eg.skill.display);
    if (skillsOnlyList.length > 0) {
        primaryConcerns.push(`Required skills listed only in Skills without project evidence: ${skillsOnlyList.slice(0, 3).join(", ")}.`);
    }

    return {
        alignmentLevel,
        requiredCoveragePct: reqCov,
        practicalEvidenceRatePct: pracRate,
        summaryText,
        keyStrengths,
        primaryConcerns,
    };
}

/**
 * 5. Resume Issue Detection & 6. Actionable Recommendations
 * Synthesizes placement, evidence, achievement quality, and buzzwords into prioritized recommendations.
 */
export function detectIssuesAndRecommendations(
    matchResult: JdSkillMatchResult,
    placement: SkillPlacementAnalysis,
    achievements: AchievementQualityAnalysis,
    resumeText: string
): { issues: ResumeIssueItem[]; recommendations: StructuredRecommendations } {
    const issues: ResumeIssueItem[] = [];
    const critical: string[] = [];
    const important: string[] = [];
    const optional: string[] = [];

    // 1. Missing Required Skills (Critical)
    for (const req of matchResult.missingRequired) {
        issues.push({
            id: `missing-req-${req.id}`,
            type: "missing_required_skill",
            severity: "critical",
            message: `Required competency missing from resume: ${req.display}.`,
            target: req.display,
        });
        critical.push(`Incorporate required skill '${req.display}' with practical implementation bullets.`);
    }

    // 2. Required skills listed ONLY in Skills (Critical/Important)
    for (const eg of matchResult.gapAnalysis.evidenceGaps) {
        if (eg.skill.tier === "required") {
            issues.push({
                id: `skills-only-req-${eg.skill.id}`,
                type: "skills_only_skill",
                severity: "critical",
                message: `'${eg.skill.display}' is a core requirement but only listed in your Skills section without project/work evidence.`,
                target: eg.skill.display,
            });
            critical.push(`Provide practical project bullets demonstrating implementation of '${eg.skill.display}'.`);
        } else {
            issues.push({
                id: `skills-only-pref-${eg.skill.id}`,
                type: "skills_only_skill",
                severity: "warning",
                message: `'${eg.skill.display}' is preferred but only mentioned in your Skills list.`,
                target: eg.skill.display,
            });
            important.push(`Demonstrate hands-on experience with preferred skill '${eg.skill.display}' in project bullets.`);
        }
    }

    // 3. Bullets missing quantifiable metrics (Important)
    if (achievements.needsMetricsBullets > 0) {
        issues.push({
            id: "bullets-missing-metrics",
            type: "bullet_missing_metrics",
            severity: "warning",
            message: `${achievements.needsMetricsBullets} accomplishment bullets describe technical work but lack measurable impact metrics (%, latency, $, users).`,
        });
        important.push(`Quantify ${achievements.needsMetricsBullets} descriptive bullets with measurable outcomes (e.g., % latency reduced, query throughput, users served).`);
    }

    // 4. Bullets missing action verbs (Important)
    if (achievements.weakBullets > 0) {
        issues.push({
            id: "bullets-weak",
            type: "bullet_missing_action_verb",
            severity: "warning",
            message: `${achievements.weakBullets} bullets lack active power verbs or technical specificity.`,
        });
        important.push(`Begin accomplishment bullets with active power verbs (e.g. Engineered, Architected, Optimized).`);
    }

    // 5. Generic buzzwords without technical grounding (Optional)
    const lowerResume = resumeText.toLowerCase();
    const foundBuzzwords: string[] = [];
    for (const bw of GENERIC_BUZZWORDS) {
        const escaped = bw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(`\\b${escaped}\\b`, "i");
        if (rx.test(lowerResume)) {
            foundBuzzwords.push(bw);
        }
    }

    if (foundBuzzwords.length > 0) {
        issues.push({
            id: "generic-buzzwords",
            type: "generic_buzzwords",
            severity: "info",
            message: `Detected generic buzzword(s) (${foundBuzzwords.join(", ")}). Replace vague self-descriptors with verifiable technical achievements.`,
        });
        optional.push(`Replace generic self-descriptors (${foundBuzzwords.slice(0, 3).join(", ")}) with concrete technical implementations.`);
    }

    // 6. Missing Preferred Skills (Optional)
    for (const pref of matchResult.missingPreferred) {
        optional.push(`Consider acquiring or highlighting preferred competency '${pref.display}' for a competitive edge.`);
    }

    return {
        issues,
        recommendations: {
            critical: Array.from(new Set(critical)),
            important: Array.from(new Set(important)),
            optional: Array.from(new Set(optional)),
        },
    };
}

/**
 * Main Diagnostic Orchestrator
 */
export function runAlignmentDiagnostics(
    resumeText: string,
    parsedJd: ParsedJobDescription,
    matchResult: JdSkillMatchResult
): AlignmentDiagnosticsResult {
    const sections = segmentResumeSections(resumeText);
    const placementAnalysis = analyzeSkillPlacement(parsedJd, matchResult);
    const requiredSkillReport = analyzeRequiredSkills(parsedJd, matchResult);
    const achievementAnalysis = analyzeAchievementQuality(resumeText, sections);
    const alignmentSignal = detectAlignmentSignals(parsedJd, matchResult, requiredSkillReport);
    const { issues, recommendations } = detectIssuesAndRecommendations(
        matchResult,
        placementAnalysis,
        achievementAnalysis,
        resumeText
    );

    return {
        placementAnalysis,
        requiredSkillReport,
        achievementAnalysis,
        alignmentSignal,
        issues,
        recommendations,
    };
}
