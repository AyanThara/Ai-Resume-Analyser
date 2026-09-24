import type { AtsResult } from "~/lib/atsEngine";
import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  // Determine the appropriate unit by calculating the log
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Format with 2 decimal places and round
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const generateUUID = () => crypto.randomUUID();

/**
 * Extracts a readable error message from any caught value (Error instance, Puter rejection object, string, etc.)
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "Unknown error occurred.";
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object") {
    const obj = err as Record<string, any>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.error === "string" && obj.error) return obj.error;
    if (typeof obj.error?.message === "string" && obj.error.message) return obj.error.message;
    if (typeof obj.reason === "string" && obj.reason) return obj.reason;
    if (typeof obj.description === "string" && obj.description) return obj.description;
    try {
      return JSON.stringify(err);
    } catch {
      // ignore serialization failures
    }
  }
  return String(err);
}

/**
 * Robustly parses JSON from LLM output.
 * Handles plain JSON, markdown code fences, accidental whitespace, and surrounding text.
 */
export function safeExtractJSON(text: string): unknown {
  if (!text || typeof text !== "string") {
    throw new Error("No response content received from AI.");
  }

  const trimmed = text.trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to fence extraction
  }

  // 2. Extract content from markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {
      // Continue to brace search
    }
  }

  // 3. Extract outermost JSON object { ... }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Failed candidate
    }
  }

  throw new Error("Failed to parse valid JSON from AI response: " + trimmed.slice(0, 100));
}

function parseScore(val: unknown, fieldName: string): number {
  if (val === null || val === undefined || val === "") {
    throw new Error(`AI feedback missing score for ${fieldName}.`);
  }
  const num = Number(val);
  if (Number.isNaN(num)) {
    throw new Error(`AI feedback contains non-numeric score for ${fieldName}: ${val}`);
  }
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeAtsTips(tips: unknown): Feedback["ATS"]["tips"] {
  if (!Array.isArray(tips)) return [];
  return tips
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => {
      if (typeof item === "string") {
        return { type: "improve", tip: item };
      }
      const type = item.type === "good" ? ("good" as const) : ("improve" as const);
      const tip = String(item.tip || item.title || item.suggestion || item.explanation || "");
      return { type, tip };
    });
}

function normalizeCategoryTips(tips: unknown): Feedback["content"]["tips"] {
  if (!Array.isArray(tips)) return [];
  return tips
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => {
      if (typeof item === "string") {
        return { type: "improve", tip: item, explanation: item };
      }
      const type = item.type === "good" ? ("good" as const) : ("improve" as const);
      const tip = String(item.tip || item.title || item.suggestion || "");
      const explanation = String(item.explanation || item.detail || item.description || tip || "");
      return { type, tip, explanation };
    });
}

/**
 * Validates AI feedback structure and ensures all required fields and scores exist.
 */
export function validateFeedback(data: unknown): Feedback {
  if (!data || typeof data !== "object") {
    throw new Error("AI feedback is not a valid JSON object.");
  }

  let obj = data as Record<string, any>;

  // Handle Claude wrapping inside top-level keys like { feedback: { ... } } or { Feedback: { ... } }
  if (obj.feedback && typeof obj.feedback === "object" && !obj.overallScore) {
    obj = obj.feedback;
  } else if (obj.Feedback && typeof obj.Feedback === "object" && !obj.overallScore) {
    obj = obj.Feedback;
  } else if (obj.data && typeof obj.data === "object" && !obj.overallScore) {
    obj = obj.data;
  }

  // Verify overallScore exists and is numeric (handle casing variations)
  const rawOverall = obj.overallScore ?? obj.overall_score ?? obj.OverallScore ?? obj.score;
  const overallScore = parseScore(rawOverall, "overallScore");

  // Verify required sections exist (handle casing and alias variations)
  const atsSection = obj.ATS ?? obj.ats ?? obj.Ats ?? obj.atsScore ?? obj.ats_score;
  if (!atsSection || typeof atsSection !== "object") {
    throw new Error(`AI feedback missing required category: ATS. Available keys: ${Object.keys(obj).join(", ")}`);
  }

  const toneSection = obj.toneAndStyle ?? obj.tone_and_style ?? obj.toneStyle ?? obj.ToneAndStyle ?? obj.tone;
  if (!toneSection || typeof toneSection !== "object") {
    throw new Error(`AI feedback missing required category: toneAndStyle. Available keys: ${Object.keys(obj).join(", ")}`);
  }

  const contentSection = obj.content ?? obj.Content;
  if (!contentSection || typeof contentSection !== "object") {
    throw new Error(`AI feedback missing required category: content. Available keys: ${Object.keys(obj).join(", ")}`);
  }

  const structureSection = obj.structure ?? obj.Structure;
  if (!structureSection || typeof structureSection !== "object") {
    throw new Error(`AI feedback missing required category: structure. Available keys: ${Object.keys(obj).join(", ")}`);
  }

  const skillsSection = obj.skills ?? obj.Skills;
  if (!skillsSection || typeof skillsSection !== "object") {
    throw new Error(`AI feedback missing required category: skills. Available keys: ${Object.keys(obj).join(", ")}`);
  }

  const atsScore = parseScore(atsSection.score ?? atsSection.rating ?? atsSection.points, "ATS.score");
  const toneScore = parseScore(toneSection.score ?? toneSection.rating ?? toneSection.points, "toneAndStyle.score");
  const contentScore = parseScore(contentSection.score ?? contentSection.rating ?? contentSection.points, "content.score");
  const structureScore = parseScore(structureSection.score ?? structureSection.rating ?? structureSection.points, "structure.score");
  const skillsScore = parseScore(skillsSection.score ?? skillsSection.rating ?? skillsSection.points, "skills.score");

  return {
    overallScore,
    ATS: {
      score: atsScore,
      tips: normalizeAtsTips(atsSection.tips),
    },
    toneAndStyle: {
      score: toneScore,
      tips: normalizeCategoryTips(toneSection.tips),
    },
    content: {
      score: contentScore,
      tips: normalizeCategoryTips(contentSection.tips),
    },
    structure: {
      score: structureScore,
      tips: normalizeCategoryTips(structureSection.tips),
    },
    skills: {
      score: skillsScore,
      tips: normalizeCategoryTips(skillsSection.tips),
    },
  };
}


/**
 * Generates a fully populated, valid Feedback structure purely from deterministic AtsResult.
 * This guarantees the user receives structured qualitative insights even if AI services
 * or cloud storage fail, timeout, or experience insufficient balance.
 */
export function createDeterministicFeedback(
  atsResult: AtsResult,
  jobTitle: string,
  _jobDescription: string
): Feedback {
  const atsTips: { type: "good" | "improve"; tip: string }[] = atsResult.tips.map((tip) => ({
    type: tip.startsWith("Excellent") || tip.startsWith("Outstanding") ? ("good" as const) : ("improve" as const),
    tip,
  }));

  // 1. Tone & Style (derived from parseability signals, 0-15 mapped to 0-100)
  const toneScore = Math.min(100, Math.round((atsResult.breakdown.parseability / 15) * 100));
  const toneTips: { type: "good" | "improve"; tip: string; explanation: string }[] = [];

  if (atsResult.signals.email && atsResult.signals.phone) {
    toneTips.push({
      type: "good",
      tip: "Clear Contact Headers",
      explanation: "Email and telephone contact headers are cleanly placed and readily extractable by ATS parsers.",
    });
  } else {
    toneTips.push({
      type: "improve",
      tip: "Standardize Contact Information",
      explanation: "Ensure a professional email address and direct phone number are prominent in your resume header.",
    });
  }

  if (atsResult.signals.actionVerbs >= 5) {
    toneTips.push({
      type: "good",
      tip: "Proactive Action Verbs",
      explanation: `Detected ${atsResult.signals.actionVerbs} strong action verbs demonstrating engineering ownership and initiative.`,
    });
  } else {
    toneTips.push({
      type: "improve",
      tip: "Strengthen Action Verbs",
      explanation: "Begin each accomplishment bullet with active power verbs such as Engineered, Architected, or Optimized.",
    });
  }

  // 2. Content (derived from content evaluation, 0-25 mapped to 0-100)
  const contentScore = Math.min(100, Math.round((atsResult.breakdown.content / 25) * 100));
  const contentTips: { type: "good" | "improve"; tip: string; explanation: string }[] = [];

  if (atsResult.signals.quantifiedAchievements >= 2) {
    contentTips.push({
      type: "good",
      tip: "Quantified Metrics",
      explanation: `Found ${atsResult.signals.quantifiedAchievements} quantified metric indicators measuring performance improvements.`,
    });
  } else {
    contentTips.push({
      type: "improve",
      tip: "Add Measurable Metrics",
      explanation: "Pair accomplishment bullets with measurable outcomes (e.g., % latency reduced, throughput increase, user scale).",
    });
  }

  contentTips.push({
    type: "good",
    tip: "Target Domain Alignment",
    explanation: `Resume content covers technical responsibilities relevant to ${jobTitle || "the target role"}.`,
  });

  // 3. Structure (derived from section detection, 0-20 mapped to 0-100)
  const structureScore = Math.min(100, Math.round((atsResult.breakdown.structure / 20) * 100));
  const structureTips: { type: "good" | "improve"; tip: string; explanation: string }[] = [];

  structureTips.push({
    type: "good",
    tip: "Identified Sections",
    explanation: `Found ${atsResult.detectedSections.length} recognizable sections (${atsResult.detectedSections.join(", ")}).`,
  });

  if (atsResult.missingSections.length > 0) {
    structureTips.push({
      type: "improve",
      tip: `Add ${atsResult.missingSections[0]} Section`,
      explanation: `Adding an explicit ${atsResult.missingSections[0]} section provides standard ATS readability and chronological clarity.`,
    });
  }

  // 4. Skills (derived from keyword match, 0-40 mapped to 0-100)
  const skillsScore = Math.min(100, Math.round((atsResult.breakdown.keywordMatch / 40) * 100));
  const skillsTips: { type: "good" | "improve"; tip: string; explanation: string }[] = [];

  if (atsResult.matchedKeywords.length > 0) {
    skillsTips.push({
      type: "good",
      tip: "Matched Core Skills",
      explanation: `Matched ${atsResult.matchedKeywords.length} core technical requirements: ${atsResult.matchedKeywords.slice(0, 5).join(", ")}.`,
    });
  }

  if (atsResult.missingKeywords.length > 0) {
    skillsTips.push({
      type: "improve",
      tip: "Target Skills to Incorporate",
      explanation: `Incorporate missing JD skills into your projects or skills summary: ${atsResult.missingKeywords.slice(0, 5).join(", ")}.`,
    });
  }

  return {
    overallScore: atsResult.overallScore,
    ATS: {
      score: atsResult.atsScore,
      breakdown: atsResult.breakdown,
      tips: atsTips.length > 0 ? atsTips : [{ type: "good", tip: "Balanced ATS profile." }],
    },
    toneAndStyle: {
      score: toneScore,
      tips: toneTips,
    },
    content: {
      score: contentScore,
      tips: contentTips,
    },
    structure: {
      score: structureScore,
      tips: structureTips,
    },
    skills: {
      score: skillsScore,
      tips: skillsTips,
    },
    atsResult,
  };
}
