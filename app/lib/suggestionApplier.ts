/**
 * Phase 9: Suggestion Applier
 *
 * Implements deterministic application of accepted suggestions to the candidate's editable resume text.
 * Handles:
 * 1. Exact bullet replacement (for metric/verb improvements).
 * 2. Intelligent skill insertion into SKILLS / Languages section.
 * 3. Bullet addition to PROJECTS or EXPERIENCE section.
 *
 * Preserves clean line breaks and formatting.
 */

import type { ResumeSuggestion } from "./suggestionGenerator";

export function applySuggestionToResumeText(
    resumeText: string,
    suggestion: ResumeSuggestion
): string {
    const { originalText, suggestedText, suggestedPlacement, targetSkill } = suggestion;

    // 1. Direct Replacement: If originalText is present in resumeText, perform targeted replacement
    if (originalText && resumeText.includes(originalText)) {
        return resumeText.replace(originalText, suggestedText);
    }

    // 2. Fuzzy Replacement: If original text has slight whitespace differences
    if (originalText) {
        const normalizedOriginal = originalText.trim().replace(/\s+/g, " ");
        const lines = resumeText.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const normalizedLine = lines[i].trim().replace(/\s+/g, " ");
            if (normalizedLine.includes(normalizedOriginal) || normalizedOriginal.includes(normalizedLine)) {
                if (normalizedLine.length > 15) {
                    lines[i] = suggestedText;
                    return lines.join("\n");
                }
            }
        }
    }

    // 3. Section Insertion
    if (suggestedPlacement === "append_skills" || suggestion.type === "missing_skill") {
        // If it's a missing skill and we have a targetSkill, try to add to Skills section
        if (targetSkill) {
            const skillsHeaderRegex = /(SKILLS|TECHNICAL SKILLS|Skills & Tools|Technical Competencies)/i;
            const match = resumeText.match(skillsHeaderRegex);
            if (match && match.index !== undefined) {
                // Find next line or Languages line
                const languagesLineRegex = /(Languages\s*:|Languages & Tools\s*:|Tools\s*:|Frameworks\s*:)/i;
                const langMatch = resumeText.slice(match.index).match(languagesLineRegex);
                if (langMatch && langMatch.index !== undefined) {
                    const insertPos = match.index + langMatch.index + langMatch[0].length;
                    return resumeText.slice(0, insertPos) + ` ${targetSkill},` + resumeText.slice(insertPos);
                }
            }
        }
    }

    // 4. Append bullet under PROJECTS or EXPERIENCE section
    const projectsHeaderRegex = /(PROJECTS|Projects|Key Projects|WORK EXPERIENCE|EXPERIENCE)/;
    const projectMatch = resumeText.match(projectsHeaderRegex);
    if (projectMatch && projectMatch.index !== undefined) {
        const afterHeaderIndex = projectMatch.index + projectMatch[0].length;
        // Insert after the header and its newline
        const cleanBullet = suggestedText.startsWith("•") || suggestedText.startsWith("-")
            ? suggestedText
            : `• ${suggestedText}`;

        return (
            resumeText.slice(0, afterHeaderIndex) +
            "\n" +
            cleanBullet +
            resumeText.slice(afterHeaderIndex)
        );
    }

    // 5. Fallback: Append cleanly at the end of resume text
    const cleanBullet = suggestedText.startsWith("•") || suggestedText.startsWith("-")
        ? suggestedText
        : `• ${suggestedText}`;

    return resumeText.trimEnd() + "\n\n" + cleanBullet + "\n";
}
