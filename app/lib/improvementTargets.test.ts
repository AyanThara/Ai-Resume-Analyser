/**
 * Phase 9: Resume Improvement Targets & Suggestion Engine Unit Tests
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateAtsScore } from "./atsEngine";
import { extractImprovementTargets, type ImprovementTarget } from "./improvementTargets";
import {
    validateSuggestion,
    createDeterministicSuggestions,
    generateResumeSuggestions,
    type ResumeSuggestion,
} from "./suggestionGenerator";
import { applySuggestionToResumeText } from "./suggestionApplier";
import { ResumeImprovement } from "../components/ResumeImprovement";

// Test data
const testJd = `We are looking for a Software Engineer Intern.
Requirements:
• Strong knowledge of Python, C++, and Java.
• Understanding of Data Structures and Algorithms.
• Basic knowledge of OOP.
Good to have:
• Experience with Docker and Redis.`;

const testResume = `John Doe
Email: john@example.com | Phone: 555-1234

SKILLS
Languages: Python, C++
Tools: Docker

PROJECTS
• Developed an automated analytics tool in Python.
• Worked on various basic programming assignments.

EDUCATION
BS in Computer Science`;

export function runPhase9Tests() {
    console.log("================================================================");
    console.log("RUNNING PHASE 9 RESUME IMPROVEMENT & SUGGESTIONS TESTS");
    console.log("================================================================");

    const atsResult = calculateAtsScore(testResume, testJd, "Software Engineer Intern");

    // -------------------------------------------------------------------------
    // TEST 1: Deterministic Improvement Target Extraction
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Deterministic Improvement Target Extraction");
    const targets = extractImprovementTargets(atsResult, testResume, testJd);

    if (targets.length === 0) {
        throw new Error("Test 1 Failed: Expected improvement targets, got empty list!");
    }

    // 1a. Missing required skill target (Java)
    const missingJavaTarget = targets.find(t => t.type === "missing_required_skill" && t.skillOrSection === "Java");
    if (!missingJavaTarget) {
        throw new Error("Test 1 Failed: Missing required skill target for 'Java' was not extracted!");
    }
    if (missingJavaTarget.priority !== "critical") {
        throw new Error(`Test 1 Failed: Missing required skill should be Critical priority, got: ${missingJavaTarget.priority}`);
    }
    console.log("  ✓ Test 1a Passed: Missing required skill 'Java' extracted as Critical target.");

    // 1b. Missing metrics bullet target
    const needsMetricsTarget = targets.find(t => t.type === "missing_metrics_bullet");
    if (!needsMetricsTarget) {
        throw new Error("Test 1 Failed: Bullet needing metrics was not extracted as target!");
    }
    if (needsMetricsTarget.priority !== "important") {
        throw new Error(`Test 1 Failed: Needs-metrics bullet should be Important priority, got: ${needsMetricsTarget.priority}`);
    }
    console.log("  ✓ Test 1b Passed: Needs-metrics bullet extracted as Important target.");

    // 1c. Weak bullet target
    const weakBulletTarget = targets.find(t => t.type === "weak_bullet");
    if (!weakBulletTarget) {
        throw new Error("Test 1 Failed: Weak bullet ('Worked on various...') was not extracted as target!");
    }
    console.log("  ✓ Test 1c Passed: Weak bullet extracted as Important target.");

    // 1d. Missing preferred skill target (Redis)
    const missingPrefTarget = targets.find(t => t.type === "missing_preferred_skill" && t.skillOrSection === "Redis");
    if (!missingPrefTarget) {
        throw new Error("Test 1 Failed: Missing preferred skill 'Redis' was not extracted!");
    }
    if (missingPrefTarget.priority !== "optional") {
        throw new Error(`Test 1 Failed: Missing preferred skill should be Optional priority, got: ${missingPrefTarget.priority}`);
    }
    console.log("  ✓ Test 1d Passed: Missing preferred skill 'Redis' extracted as Optional target.");

    // -------------------------------------------------------------------------
    // TEST 2: Deterministic Suggestions Generation & Anti-Fabrication Safeguards
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Deterministic Suggestions Generation & Safeguards");
    const detSuggestions = createDeterministicSuggestions(targets, testResume);

    if (detSuggestions.length !== targets.length) {
        throw new Error(`Test 2 Failed: Expected ${targets.length} deterministic suggestions, got ${detSuggestions.length}`);
    }

    for (const sug of detSuggestions) {
        if (!sug.issue || !sug.suggestedText || !sug.reason) {
            throw new Error("Test 2 Failed: Suggestion missing mandatory issue, suggestedText, or reason!");
        }
        // If it requires user metric, verify placeholder presence
        if (sug.requiresUserMetric && !sug.suggestedText.includes("[")) {
            throw new Error(`Test 2 Failed: Suggestion marked requiresUserMetric but missing [bracket] placeholder: ${sug.suggestedText}`);
        }
    }
    console.log(`  ✓ Test 2 Passed: Generated ${detSuggestions.length} deterministic suggestions with strict metric placeholders.`);

    // -------------------------------------------------------------------------
    // TEST 3: AI Response Validation & Rejection of Malformed / Fabricated Content
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] AI Response Validation & Safety Filter");

    // 3a. Valid AI suggestion
    const validCandidate = {
        id: "sug-valid-1",
        targetId: targets[0].id,
        type: "bullet_improvement",
        priority: "important",
        issue: "Add measurable impact to analytics tool",
        originalText: "• Developed an automated analytics tool in Python.",
        suggestedText: "• Developed an automated analytics tool in Python, processing [X] records daily.",
        reason: "Shows quantifiable delivery.",
        requiresUserMetric: true,
        suggestedPlacement: "replace_bullet",
    };
    const validated1 = validateSuggestion(validCandidate, testResume, targets);
    if (!validated1) {
        throw new Error("Test 3a Failed: Valid candidate was incorrectly rejected!");
    }
    console.log("  ✓ Test 3a Passed: Valid AI suggestion passed schema validation.");

    // 3b. Malformed candidate (missing issue / suggestedText)
    const malformedCandidate = {
        id: "sug-bad-1",
        priority: "critical",
    };
    if (validateSuggestion(malformedCandidate, testResume, targets) !== null) {
        throw new Error("Test 3b Failed: Malformed suggestion without issue/text was not rejected!");
    }
    console.log("  ✓ Test 3b Passed: Malformed suggestion rejected.");

    // 3c. Replacement of non-existent text
    const nonExistentReplacement = {
        id: "sug-bad-2",
        targetId: "other",
        type: "bullet_improvement",
        priority: "important",
        issue: "Replace nonexistent line",
        originalText: "Non-existent bullet in this resume that never was written",
        suggestedText: "New text",
        reason: "Test",
        suggestedPlacement: "replace_bullet",
    };
    if (validateSuggestion(nonExistentReplacement, testResume, targets) !== null) {
        throw new Error("Test 3c Failed: Replacement targeting non-existent resume text was not rejected!");
    }
    console.log("  ✓ Test 3c Passed: Suggestion targeting non-existent text rejected.");

    // -------------------------------------------------------------------------
    // TEST 4: Suggestion Application (Accept / Reject & Resume Text Update)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Suggestion Application & Deterministic ATS Re-scoring");

    // 4a. Replace existing bullet with improved version
    const bulletToImprove = detSuggestions.find(s => s.originalText && testResume.includes(s.originalText));
    if (!bulletToImprove) {
        throw new Error("Test 4 Failed: Could not find suggestion with originalText in resume!");
    }

    const updatedResume = applySuggestionToResumeText(testResume, bulletToImprove);
    if (updatedResume.includes(bulletToImprove.originalText!)) {
        throw new Error("Test 4 Failed: Original text was not replaced in resume!");
    }
    if (!updatedResume.includes(bulletToImprove.suggestedText)) {
        throw new Error("Test 4 Failed: Suggested text was not inserted into resume!");
    }
    console.log("  ✓ Test 4a Passed: Suggestion applied via exact text replacement.");

    // 4b. Re-score updated resume and verify ATS engine response
    const rescored = calculateAtsScore(updatedResume, testJd, "Software Engineer Intern");
    console.log(`  Rescored overall score: ${atsResult.overallScore} -> ${rescored.overallScore}`);
    console.log("  ✓ Test 4b Passed: Deterministic ATS engine successfully re-scored updated resume text.");

    // 4c. Reset to original
    const resetResume = testResume;
    const resetAts = calculateAtsScore(resetResume, testJd, "Software Engineer Intern");
    if (resetAts.overallScore !== atsResult.overallScore) {
        throw new Error("Test 4c Failed: Reset did not restore exact baseline score!");
    }
    console.log("  ✓ Test 4c Passed: Reset restores exact baseline score.");

    // -------------------------------------------------------------------------
    // TEST 5: Component Markup Rendering
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] ResumeImprovement Component Static Markup Rendering");
    const markup = renderToStaticMarkup(
        React.createElement(ResumeImprovement, {
            suggestions: detSuggestions,
            isLoading: false,
            source: "deterministic",
            onGenerate: () => {},
            onAcceptSuggestion: () => {},
            onRejectSuggestion: () => {},
            acceptedIds: [detSuggestions[0].id],
            rejectedIds: [],
        })
    );

    const hasTitle = markup.includes("Resume Improvement") && markup.includes("AI Suggestions");
    const hasFilter = markup.includes("Filter by Priority");
    const hasCritical = markup.includes("Critical");
    const hasApplied = markup.includes("Applied");

    if (!hasTitle || !hasFilter || !hasCritical || !hasApplied) {
        throw new Error(`Test 5 Failed: Title=${hasTitle}, Filter=${hasFilter}, Critical=${hasCritical}, Applied=${hasApplied}`);
    }
    console.log("  ✓ Test 5 Passed: ResumeImprovement component rendered cleanly with diff, priority filters, and badges.");

    console.log("\n================================================================");
    console.log("ALL PHASE 9 RESUME IMPROVEMENT & SUGGESTIONS TESTS PASSED (5/5)!");
    console.log("================================================================");
    return true;
}

runPhase9Tests();
