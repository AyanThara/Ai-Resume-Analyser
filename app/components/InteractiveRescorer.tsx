import React, { useState, useEffect, useMemo, useRef } from "react";
import type { AtsResult, AtsBreakdown } from "~/lib/atsEngine";

export interface ScoreComparison {
  originalScore: number;
  currentScore: number;
  deltaScore: number;
  originalBreakdown: AtsBreakdown;
  currentBreakdown: AtsBreakdown;
  deltaKeyword: number;
  deltaStructure: number;
  deltaParseability: number;
  deltaContent: number;
  originalAlignment?: string;
  currentAlignment?: string;
  originalCoverage?: number;
  currentCoverage?: number;
  isModified: boolean;
}

interface InteractiveRescorerProps {
  originalResumeText: string;
  originalJobDescription: string;
  originalJobTitle?: string;
  originalAtsResult: AtsResult | null;
  currentResumeText: string;
  currentJobDescription: string;
  currentAtsResult: AtsResult | null;
  onResumeTextChange: (newText: string) => void;
  onJobDescriptionChange: (newJd: string) => void;
  onResetToOriginal: () => void;
  onSaveToLocalStorage?: () => void;
  onRescoreNow?: () => void;
  isRescoring?: boolean;
}

export const InteractiveRescorer: React.FC<InteractiveRescorerProps> = ({
  originalResumeText,
  originalJobDescription,
  originalJobTitle = "",
  originalAtsResult,
  currentResumeText,
  currentJobDescription,
  currentAtsResult,
  onResumeTextChange,
  onJobDescriptionChange,
  onResetToOriginal,
  onSaveToLocalStorage,
  onRescoreNow,
  isRescoring = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"resume" | "jd" | "split">("resume");
  const [copiedType, setCopiedType] = useState<"resume" | "jd" | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Check if text is modified from original baseline
  const isResumeModified = currentResumeText.trim() !== originalResumeText.trim();
  const isJdModified = currentJobDescription.trim() !== originalJobDescription.trim();
  const isModified = isResumeModified || isJdModified;

  // Compute Score Comparison metrics
  const comparison: ScoreComparison = useMemo(() => {
    const origScore = originalAtsResult?.overallScore ?? 0;
    const currScore = currentAtsResult?.overallScore ?? origScore;
    const origBd = originalAtsResult?.breakdown ?? {
      keywordMatch: 0,
      structure: 0,
      parseability: 0,
      content: 0,
    };
    const currBd = currentAtsResult?.breakdown ?? origBd;

    const origDiag = originalAtsResult?.diagnostics;
    const currDiag = currentAtsResult?.diagnostics;

    return {
      originalScore: origScore,
      currentScore: currScore,
      deltaScore: currScore - origScore,
      originalBreakdown: origBd,
      currentBreakdown: currBd,
      deltaKeyword: currBd.keywordMatch - origBd.keywordMatch,
      deltaStructure: currBd.structure - origBd.structure,
      deltaParseability: currBd.parseability - origBd.parseability,
      deltaContent: currBd.content - origBd.content,
      originalAlignment: origDiag?.alignmentSignal?.alignmentLevel,
      currentAlignment: currDiag?.alignmentSignal?.alignmentLevel,
      originalCoverage: origDiag?.alignmentSignal?.requiredCoveragePct,
      currentCoverage: currDiag?.alignmentSignal?.requiredCoveragePct,
      isModified,
    };
  }, [originalAtsResult, currentAtsResult, isModified]);

  // Statistics for Resume Text
  const resumeStats = useMemo(() => {
    const chars = currentResumeText.length;
    const words = currentResumeText.trim() ? currentResumeText.trim().split(/\s+/).length : 0;
    const lines = currentResumeText ? currentResumeText.split("\n").length : 0;
    const bullets = (currentResumeText.match(/^\s*[\u2022\u25E6\u2023\u2219\*\-]\s+/gm) || []).length;
    return { chars, words, lines, bullets };
  }, [currentResumeText]);

  // Statistics for Job Description
  const jdStats = useMemo(() => {
    const chars = currentJobDescription.length;
    const words = currentJobDescription.trim() ? currentJobDescription.trim().split(/\s+/).length : 0;
    const requiredSkillsCount = currentAtsResult?.diagnostics?.requiredSkillReport?.items?.length ?? 0;
    return { chars, words, requiredSkillsCount };
  }, [currentJobDescription, currentAtsResult]);

  const handleCopy = (type: "resume" | "jd") => {
    const textToCopy = type === "resume" ? currentResumeText : currentJobDescription;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleSave = () => {
    if (onSaveToLocalStorage) {
      onSaveToLocalStorage();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const renderDeltaBadge = (delta: number) => {
    if (delta > 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
          +{delta}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
          {delta}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600">
        0
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden w-full transition-all">
      {/* ---------------- Top Header Bar ---------------- */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                Interactive Re-scoring Studio
              </h3>
              {isModified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Re-scored
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-700/50 text-gray-300 border border-gray-600/50">
                  Original Baseline
                </span>
              )}
              {isRescoring && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 animate-pulse font-medium">
                  Evaluating...
                </span>
              )}
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Edit resume text or job description below. The deterministic ATS engine updates scores in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRescoreNow && (
            <button
              onClick={onRescoreNow}
              type="button"
              title="Force recalculation immediately"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>⚡</span> Re-score Now
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
          >
            {isExpanded ? "Hide Studio ▲" : "Open Studio ▼"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* ---------------- Score Comparison Banner (Requirement 4) ---------------- */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Deterministic Score Comparison
                </span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Comparing current modified state against the original baseline.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {isModified && (
                  <button
                    onClick={onResetToOriginal}
                    type="button"
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-rose-700 border border-rose-200 hover:border-rose-300 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <span>↺</span> Reset to Original
                  </button>
                )}

                {onSaveToLocalStorage && (
                  <button
                    onClick={handleSave}
                    type="button"
                    disabled={!isModified && !savedSuccess}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 ${
                      savedSuccess
                        ? "bg-emerald-600 text-white"
                        : isModified
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <span>{savedSuccess ? "✓" : "💾"}</span>
                    {savedSuccess ? "Saved Locally!" : "Save Changes"}
                  </button>
                )}
              </div>
            </div>

            {/* Comparison Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Overall Score */}
              <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white border border-indigo-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Overall ATS
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-gray-900">
                      {comparison.currentScore}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">/100</span>
                  </div>
                  {renderDeltaBadge(comparison.deltaScore)}
                </div>
                <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between border-t border-gray-100 pt-1">
                  <span>Baseline:</span>
                  <span className="font-semibold text-gray-700">{comparison.originalScore}/100</span>
                </div>
              </div>

              {/* Keyword Match /40 */}
              <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Keywords
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-gray-900">
                      {comparison.currentBreakdown.keywordMatch}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">/40</span>
                  </div>
                  {renderDeltaBadge(comparison.deltaKeyword)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between border-t border-gray-100 pt-1">
                  <span>Base:</span>
                  <span className="font-semibold text-gray-700">{comparison.originalBreakdown.keywordMatch}</span>
                </div>
              </div>

              {/* Content Quality /25 */}
              <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Content
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-gray-900">
                      {comparison.currentBreakdown.content}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">/25</span>
                  </div>
                  {renderDeltaBadge(comparison.deltaContent)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between border-t border-gray-100 pt-1">
                  <span>Base:</span>
                  <span className="font-semibold text-gray-700">{comparison.originalBreakdown.content}</span>
                </div>
              </div>

              {/* Structure /20 */}
              <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Structure
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-gray-900">
                      {comparison.currentBreakdown.structure}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">/20</span>
                  </div>
                  {renderDeltaBadge(comparison.deltaStructure)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between border-t border-gray-100 pt-1">
                  <span>Base:</span>
                  <span className="font-semibold text-gray-700">{comparison.originalBreakdown.structure}</span>
                </div>
              </div>

              {/* Parseability /15 */}
              <div className="p-3 rounded-xl bg-white border border-gray-100 shadow-2xs flex flex-col justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Parseability
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-extrabold text-gray-900">
                      {comparison.currentBreakdown.parseability}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">/15</span>
                  </div>
                  {renderDeltaBadge(comparison.deltaParseability)}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between border-t border-gray-100 pt-1">
                  <span>Base:</span>
                  <span className="font-semibold text-gray-700">{comparison.originalBreakdown.parseability}</span>
                </div>
              </div>
            </div>

            {/* Alignment and Coverage Delta Info */}
            {comparison.originalCoverage !== undefined && comparison.currentCoverage !== undefined && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Required Skill Coverage:</span>
                  <span className="font-bold text-indigo-900">{comparison.currentCoverage}%</span>
                  {comparison.currentCoverage !== comparison.originalCoverage && (
                    <span className="text-[11px] text-gray-500">
                      (was {comparison.originalCoverage}%,{" "}
                      {comparison.currentCoverage > comparison.originalCoverage
                        ? `+${comparison.currentCoverage - comparison.originalCoverage}%`
                        : `${comparison.currentCoverage - comparison.originalCoverage}%`}
                      )
                    </span>
                  )}
                </div>

                {comparison.currentAlignment && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-700">Alignment:</span>
                    <span className="font-bold text-gray-900 capitalize">
                      {comparison.currentAlignment.replace(/_/g, " ")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------- Editor View Mode Switcher ---------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("resume")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "resume"
                    ? "bg-white text-indigo-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>📄</span> Resume Content
                {isResumeModified && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("jd")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "jd"
                    ? "bg-white text-indigo-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🎯</span> Job Description
                {isJdModified && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("split")}
                className={`hidden md:flex px-3 py-1.5 rounded-lg text-xs font-bold transition-all items-center gap-1.5 ${
                  activeTab === "split"
                    ? "bg-white text-indigo-900 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>⚡</span> Side-by-Side View
              </button>
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-3">
              {activeTab === "resume" || activeTab === "split" ? (
                <span>
                  Resume: <strong className="text-gray-800">{resumeStats.words}</strong> words,{" "}
                  <strong className="text-gray-800">{resumeStats.bullets}</strong> bullets
                </span>
              ) : null}
              {activeTab === "jd" || activeTab === "split" ? (
                <span>
                  JD: <strong className="text-gray-800">{jdStats.words}</strong> words,{" "}
                  <strong className="text-gray-800">{jdStats.requiredSkillsCount}</strong> required skills
                </span>
              ) : null}
            </div>
          </div>

          {/* ---------------- Editor Workspace ---------------- */}
          {/* Tab 1: Resume Text Editor */}
          {(activeTab === "resume" || activeTab === "split") && (
            <div className={`space-y-2 ${activeTab === "split" ? "w-full" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="resume-editor-textarea" className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Resume Text Editor
                  </label>
                  {isResumeModified && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Modified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy("resume")}
                    type="button"
                    className="text-[11px] font-medium text-gray-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    <span>{copiedType === "resume" ? "✓ Copied" : "📋 Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="resume-editor-textarea"
                  value={currentResumeText}
                  onChange={(e) => onResumeTextChange(e.target.value)}
                  placeholder="Paste or edit your resume text here. Include recognizable section headers (e.g. SKILLS, EXPERIENCE, PROJECTS, EDUCATION) and bullet points..."
                  rows={activeTab === "split" ? 14 : 16}
                  className="w-full p-3.5 text-xs font-mono text-gray-900 bg-slate-50/50 hover:bg-white focus:bg-white rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-y leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-1">
                <span>
                  💡 <strong>Pro-tip:</strong> Add missing skills inside <em>Projects</em> or <em>Experience</em> with action verbs (e.g. &apos;Engineered a Java backend...&apos;) and metrics (e.g. &apos;improving latency by 35%&apos;) to maximize evidence and content scores.
                </span>
                <span>{resumeStats.chars} chars</span>
              </div>
            </div>
          )}

          {/* Tab 2: Job Description Editor */}
          {(activeTab === "jd" || activeTab === "split") && (
            <div className={`space-y-2 ${activeTab === "split" ? "w-full pt-4 md:pt-0" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="jd-editor-textarea" className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Target Job Description
                  </label>
                  {isJdModified && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Modified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy("jd")}
                    type="button"
                    className="text-[11px] font-medium text-gray-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    <span>{copiedType === "jd" ? "✓ Copied" : "📋 Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="jd-editor-textarea"
                  value={currentJobDescription}
                  onChange={(e) => onJobDescriptionChange(e.target.value)}
                  placeholder="Paste or modify the job description here. Include sections like 'Requirements:', 'Responsibilities:', or 'Preferred Qualifications:' to analyze keyword alignment..."
                  rows={activeTab === "split" ? 14 : 16}
                  className="w-full p-3.5 text-xs font-mono text-gray-900 bg-slate-50/50 hover:bg-white focus:bg-white rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-y leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-1">
                <span>
                  💡 <strong>Pro-tip:</strong> Requirements listed under explicit &apos;Required Qualifications&apos; headers determine mandatory vs. preferred skills.
                </span>
                <span>{jdStats.chars} chars</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveRescorer;
