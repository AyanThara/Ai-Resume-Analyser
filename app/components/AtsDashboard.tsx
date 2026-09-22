import React, { useState } from "react";
import type { AtsResult, AtsBreakdown } from "~/lib/atsEngine";
import type {
  RequiredSkillAlignmentItem,
  RequiredAlignmentVerdict,
  PlacementQuality,
} from "~/lib/alignmentDiagnostics";
import type { ExtractedSkill } from "~/lib/jdParser";

interface AtsDashboardProps {
  score: number;
  suggestions?: { type: "good" | "improve"; tip: string }[];
  atsResult?: AtsResult | null;
}

export const AtsDashboard: React.FC<AtsDashboardProps> = ({
  score,
  suggestions = [],
  atsResult,
}) => {
  const [activeRequiredFilter, setActiveRequiredFilter] = useState<
    "all" | RequiredAlignmentVerdict
  >("all");
  const [showBulletAudit, setShowBulletAudit] = useState(false);

  // ---------------------------------------------------------------------------
  // 1. ATS Score Overview Calculations (using existing atsResult.breakdown)
  // ---------------------------------------------------------------------------
  const breakdown: AtsBreakdown = atsResult?.breakdown || {
    keywordMatch: Math.round((score * 0.4)),
    structure: Math.round((score * 0.2)),
    parseability: Math.round((score * 0.15)),
    content: Math.round((score * 0.25)),
  };

  const displayScore = atsResult?.atsScore ?? score;

  const gradientClass =
    displayScore > 69
      ? "from-emerald-50 via-green-50 to-white border-emerald-200"
      : displayScore > 49
      ? "from-amber-50 via-yellow-50 to-white border-amber-200"
      : "from-rose-50 via-red-50 to-white border-rose-200";

  const iconSrc =
    displayScore > 69
      ? "/icons/ats-good.svg"
      : displayScore > 49
      ? "/icons/ats-warning.svg"
      : "/icons/ats-bad.svg";

  const scoreSubtitle =
    displayScore > 69
      ? "High ATS Match"
      : displayScore > 49
      ? "Moderate Alignment"
      : "Needs ATS Optimization";

  const diagnostics = atsResult?.diagnostics;
  const alignmentSignal = diagnostics?.alignmentSignal;
  const reqReport = diagnostics?.requiredSkillReport;
  const placement = diagnostics?.placementAnalysis;
  const achievement = diagnostics?.achievementAnalysis;
  const recommendations = diagnostics?.recommendations;
  const issues = diagnostics?.issues || [];

  // Filtered required skills
  const requiredSkills = reqReport?.items || [];
  const filteredRequiredSkills =
    activeRequiredFilter === "all"
      ? requiredSkills
      : requiredSkills.filter((s) => s.verdict === activeRequiredFilter);

  // Preferred skills
  const matchedPref: ExtractedSkill[] = atsResult?.matchResult?.matchedPreferred || [];
  const missingPref: ExtractedSkill[] = atsResult?.matchResult?.missingPreferred || [];

  // Buzzwords
  const buzzwordIssues = issues.filter((i) => i.type === "generic_buzzwords");

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* =====================================================================
          SECTION 1: ATS SCORE OVERVIEW
          ===================================================================== */}
      <section
        id="ats-score-overview"
        className={`bg-gradient-to-b ${gradientClass} rounded-2xl shadow-sm border p-6 transition-all duration-300`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gray-200/60">
          <div className="flex items-center gap-4">
            <img
              src={iconSrc}
              alt="ATS Score Status Icon"
              className="w-14 h-14 shrink-0 drop-shadow-sm"
            />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  ATS Score — {displayScore}/100
                </h2>
                <span
                  className={`text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                    displayScore > 69
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : displayScore > 49
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  {scoreSubtitle}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Deterministic algorithmic evaluation calibrated across ATS parsing, keyword relevance, document structure, and quantified impact.
              </p>
            </div>
          </div>
        </div>

        {/* 4-Pillar Score Breakdown */}
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">
            Algorithmic Scoring Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Keyword Match /40 */}
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">
                  Keyword Match
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {breakdown.keywordMatch}/40
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round((breakdown.keywordMatch / 40) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-500 mt-2">
                40% Weight • Required vs. Preferred Gated
              </span>
            </div>

            {/* 2. Content Quality /25 */}
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">
                  Content Quality
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  {breakdown.content}/25
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round((breakdown.content / 25) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-500 mt-2">
                25% Weight • Action Verbs & Metrics
              </span>
            </div>

            {/* 3. Structure /20 */}
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">
                  Structure
                </span>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  {breakdown.structure}/20
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round((breakdown.structure / 20) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-500 mt-2">
                20% Weight • Standard Section Headers
              </span>
            </div>

            {/* 4. Parseability /15 */}
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">
                  Parseability
                </span>
                <span className="text-xs font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                  {breakdown.parseability}/15
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-violet-600 h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round((breakdown.parseability / 15) * 100))}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-gray-500 mt-2">
                15% Weight • Text Extraction & Contacts
              </span>
            </div>
          </div>
        </div>

        {/* Existing Tips presentation */}
        {suggestions.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-200/60">
            <h4 className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-3">
              Key Diagnostic Signals
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/70 border border-gray-100"
                >
                  <img
                    src={suggestion.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                    alt={suggestion.type === "good" ? "Pass" : "Notice"}
                    className="w-4 h-4 mt-0.5 shrink-0"
                  />
                  <p
                    className={`text-xs font-medium leading-relaxed ${
                      suggestion.type === "good" ? "text-emerald-900" : "text-amber-900"
                    }`}
                  >
                    {suggestion.tip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 2: JD ALIGNMENT & SENIORITY
          ===================================================================== */}
      <section
        id="jd-alignment-section"
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Job Description Alignment</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparative analysis against job requirements and candidate seniority level.
            </p>
          </div>
          {alignmentSignal ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                  alignmentSignal.alignmentLevel === "strong_alignment"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : alignmentSignal.alignmentLevel === "partial_alignment"
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : alignmentSignal.alignmentLevel === "weak_alignment"
                    ? "bg-orange-50 text-orange-800 border-orange-300"
                    : "bg-rose-50 text-rose-800 border-rose-300"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    alignmentSignal.alignmentLevel === "strong_alignment"
                      ? "bg-emerald-500"
                      : alignmentSignal.alignmentLevel === "partial_alignment"
                      ? "bg-amber-500"
                      : alignmentSignal.alignmentLevel === "weak_alignment"
                      ? "bg-orange-500"
                      : "bg-rose-500"
                  }`}
                />
                {alignmentSignal.alignmentLevel === "strong_alignment" && "Strong Alignment"}
                {alignmentSignal.alignmentLevel === "partial_alignment" && "Partial Alignment"}
                {alignmentSignal.alignmentLevel === "weak_alignment" && "Weak Alignment"}
                {alignmentSignal.alignmentLevel === "major_skill_gaps" && "Major Skill Gaps"}
              </span>
            </div>
          ) : null}
        </div>

        {alignmentSignal ? (
          <div className="mt-5 space-y-4">
            {/* Seniority & Coverage KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block mb-1">
                  Detected Seniority
                </span>
                <span className="text-sm font-bold text-gray-900 capitalize">
                  {atsResult?.seniority?.detectedLevel
                    ? `${atsResult.seniority.detectedLevel.replace("_", " ")} Level`
                    : "Standard / Mid-Level"}
                </span>
                <span className="block text-[11px] text-gray-400 mt-0.5">
                  Calibrated by years & leadership titles
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block mb-1">
                  Required Skill Coverage
                </span>
                <span className="text-sm font-bold text-blue-700">
                  {alignmentSignal.requiredCoveragePct}%
                </span>
                <span className="block text-[11px] text-gray-400 mt-0.5">
                  Mandatory qualifications satisfied
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block mb-1">
                  Practical Evidence Rate
                </span>
                <span className="text-sm font-bold text-teal-700">
                  {alignmentSignal.practicalEvidenceRatePct}%
                </span>
                <span className="block text-[11px] text-gray-400 mt-0.5">
                  Backed by experience & project bullets
                </span>
              </div>
            </div>

            {/* Diagnostic Summary Statement */}
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <p className="text-sm text-blue-950 font-medium leading-relaxed">
                {alignmentSignal.summaryText}
              </p>
            </div>

            {/* Strengths & Concerns Pills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {alignmentSignal.keyStrengths.length > 0 && (
                <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                    <img src="/icons/check.svg" alt="Strength" className="w-3.5 h-3.5" />
                    Key Candidate Strengths
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-950">
                    {alignmentSignal.keyStrengths.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {alignmentSignal.primaryConcerns.length > 0 && (
                <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
                    <img src="/icons/warning.svg" alt="Concern" className="w-3.5 h-3.5" />
                    Primary Alignment Concerns
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {alignmentSignal.primaryConcerns.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl mt-4">
            <p className="text-sm">Job description alignment details are not available for this analysis.</p>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 3: REQUIRED SKILLS (GROUPED BY VERDICT)
          ===================================================================== */}
      <section
        id="required-skills-section"
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Required Skills Verification</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Explicit JD technical requirements mapped to resume evidence and location.
            </p>
          </div>
          {reqReport && (
            <div className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              Matched {reqReport.matchedRequired} of {reqReport.totalRequired} ({reqReport.alignmentPct}%)
            </div>
          )}
        </div>

        {/* Group Filter Tabs */}
        {requiredSkills.length > 0 ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2 flex-wrap border-b border-gray-100 pb-3">
              {[
                { key: "all", label: "All Required", count: requiredSkills.length },
                {
                  key: "fully_aligned",
                  label: "Fully Aligned",
                  count: requiredSkills.filter((s) => s.verdict === "fully_aligned").length,
                  badgeColor: "bg-emerald-100 text-emerald-800",
                },
                {
                  key: "partially_aligned",
                  label: "Partially Aligned",
                  count: requiredSkills.filter((s) => s.verdict === "partially_aligned").length,
                  badgeColor: "bg-blue-100 text-blue-800",
                },
                {
                  key: "listed_without_evidence",
                  label: "Listed Without Evidence",
                  count: requiredSkills.filter((s) => s.verdict === "listed_without_evidence").length,
                  badgeColor: "bg-amber-100 text-amber-800",
                },
                {
                  key: "missing_critical",
                  label: "Missing Critical",
                  count: requiredSkills.filter((s) => s.verdict === "missing_critical").length,
                  badgeColor: "bg-rose-100 text-rose-800",
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveRequiredFilter(tab.key as any)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeRequiredFilter === tab.key
                      ? "bg-gray-900 text-white shadow-xs"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeRequiredFilter === tab.key
                        ? "bg-white/20 text-white"
                        : tab.badgeColor || "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredRequiredSkills.map((skill) => {
                const verdictStyle =
                  skill.verdict === "fully_aligned"
                    ? {
                        border: "border-emerald-200",
                        bg: "bg-emerald-50/40",
                        badge: "bg-emerald-100 text-emerald-800",
                        label: "Fully Aligned",
                      }
                    : skill.verdict === "partially_aligned"
                    ? {
                        border: "border-blue-200",
                        bg: "bg-blue-50/40",
                        badge: "bg-blue-100 text-blue-800",
                        label: "Partially Aligned",
                      }
                    : skill.verdict === "listed_without_evidence"
                    ? {
                        border: "border-amber-200",
                        bg: "bg-amber-50/40",
                        badge: "bg-amber-100 text-amber-800",
                        label: "Skills-Only / No Evidence",
                      }
                    : {
                        border: "border-rose-200",
                        bg: "bg-rose-50/40",
                        badge: "bg-rose-100 text-rose-800",
                        label: "Missing Critical",
                      };

                return (
                  <div
                    key={skill.skillId}
                    className={`p-3.5 rounded-xl border ${verdictStyle.border} ${verdictStyle.bg} flex flex-col justify-between gap-2.5 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900">{skill.display}</h4>
                          <span className="text-[10px] uppercase font-semibold text-gray-500 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                            {skill.category}
                          </span>
                        </div>
                        {skill.contextSnippet && (
                          <p className="text-xs text-gray-600 mt-1 italic line-clamp-2">
                            "{skill.contextSnippet}"
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${verdictStyle.badge}`}>
                        {verdictStyle.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/50">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-gray-500">Sections:</span>
                        {skill.sections && skill.sections.length > 0 ? (
                          skill.sections.map((sec) => (
                            <span
                              key={sec}
                              className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-700 font-semibold"
                            >
                              {sec}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Not found</span>
                        )}
                      </div>

                      <span
                        className={`text-[11px] font-semibold ${
                          skill.evidenceStrength === "strong"
                            ? "text-emerald-700"
                            : skill.evidenceStrength === "moderate"
                            ? "text-blue-700"
                            : skill.evidenceStrength === "mention_only"
                            ? "text-amber-700"
                            : "text-rose-700"
                        }`}
                      >
                        {skill.evidenceStrength === "strong" && "Strong Evidence"}
                        {skill.evidenceStrength === "moderate" && "Moderate Evidence"}
                        {skill.evidenceStrength === "mention_only" && "Mention Only"}
                        {skill.evidenceStrength === "none" && "No Evidence"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl mt-4">
            <p className="text-sm">No explicit required skills detected in this job description.</p>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 4: PREFERRED SKILLS (VISUALLY SECONDARY)
          ===================================================================== */}
      <section
        id="preferred-skills-section"
        className="bg-gray-50/70 rounded-2xl shadow-xs border border-gray-200 p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
          <div>
            <h4 className="text-base font-bold text-gray-800">
              Preferred & Bonus Skills
            </h4>
            <p className="text-xs text-gray-500">
              Nice-to-have competencies that enhance competitiveness (20% keyword weighting).
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {matchedPref.length} matched / {matchedPref.length + missingPref.length} total
          </span>
        </div>

        {matchedPref.length > 0 || missingPref.length > 0 ? (
          <div className="mt-4 space-y-3">
            {matchedPref.length > 0 && (
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-2">
                  Matched Preferred ({matchedPref.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {matchedPref.map((pref) => (
                    <span
                      key={pref.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                    >
                      <img src="/icons/check.svg" alt="Matched" className="w-3 h-3" />
                      {pref.display}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingPref.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Unmatched Preferred ({missingPref.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {missingPref.map((pref) => (
                    <span
                      key={pref.id}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200"
                    >
                      <span className="text-gray-400">•</span>
                      {pref.display}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-400 text-xs italic mt-2">
            No preferred or bonus skills specified in this job description.
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 5 & 8: EVIDENCE QUALITY & SKILL PLACEMENT
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 5: Evidence Quality */}
        <section
          id="evidence-quality-section"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Evidence Quality Diagnostics</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Depth of practical proof backing technical claims.
              </p>
            </div>

            {placement ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
                    <span className="text-xl font-extrabold text-emerald-700 block">
                      {placement.optimalCount}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wider block mt-0.5">
                      Strong Proof
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      In Experience/Projects
                    </span>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
                    <span className="text-xl font-extrabold text-blue-700 block">
                      {placement.peripheralCount}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider block mt-0.5">
                      Moderate Proof
                    </span>
                    <span className="text-[10px] text-blue-600 block mt-0.5">
                      Summary/Education
                    </span>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
                    <span className="text-xl font-extrabold text-amber-700 block">
                      {placement.skillsOnlyCount}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block mt-0.5">
                      Mention Only
                    </span>
                    <span className="text-[10px] text-amber-600 block mt-0.5">
                      Skills list without bullets
                    </span>
                  </div>
                </div>

                {/* Skills Lacking Practical Evidence Warning Callout */}
                {placement.skillsOnlySkills.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
                      <img src="/icons/warning.svg" alt="Warning" className="w-4 h-4" />
                      Skills Listed Without Practical Bullets ({placement.skillsOnlySkills.length})
                    </div>
                    <p className="text-xs text-amber-800 mb-2">
                      ATS parsers and senior hiring managers discount skills that are only listed in a skills block without corresponding project or work experience bullets:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {placement.skillsOnlySkills.map((sk) => (
                        <span
                          key={sk}
                          className="text-[11px] font-semibold bg-white text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
                    <img src="/icons/check.svg" alt="Verified" className="w-4 h-4" />
                    <span>All matched technical skills are supported by contextual work or project bullets.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl mt-4">
                <p className="text-sm">Evidence diagnostics unavailable.</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 8: Skill Placement */}
        <section
          id="skill-placement-section"
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between"
        >
          <div>
            <div className="pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Skill Placement Intelligence</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Evaluation of where skills appear in the resume hierarchy.
              </p>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Legend with clear definitions */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-gray-900">Optimal Placement:</span>
                    <p className="text-gray-600 mt-0.5">
                      Validated within Experience or Projects with action verbs and quantifiable metrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-gray-900">Skills-Only:</span>
                    <p className="text-gray-600 mt-0.5">
                      Confined strictly to a bulletless technical skills section. Weakest algorithmic impact.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1" />
                  <div>
                    <span className="font-bold text-gray-900">Peripheral:</span>
                    <p className="text-gray-600 mt-0.5">
                      Mentioned in Summary or Education headers without measurable delivery metrics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Placement items list sample */}
              {placement && placement.items.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-gray-500 block mb-2">
                    Evaluated Skill Placements ({placement.items.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {placement.items.map((item) => {
                      const badgeBg =
                        item.quality === "optimal"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : item.quality === "mention_only"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-blue-50 text-blue-800 border-blue-200";

                      return (
                        <span
                          key={item.skillId}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 ${badgeBg}`}
                        >
                          {item.skillDisplay}
                          <span className="text-[9px] uppercase font-bold text-gray-500">
                            ({item.quality.replace("_", " ")})
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================================
          SECTION 6: RESUME QUALITY & BULLET METRICS AUDIT
          ===================================================================== */}
      <section
        id="resume-quality-section"
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Resume Quality & Measurable Metrics</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Evaluation of accomplishment statements, quantifiable KPIs, and passive buzzwords.
            </p>
          </div>
          {achievement && (
            <button
              onClick={() => setShowBulletAudit(!showBulletAudit)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer self-start sm:self-auto"
            >
              {showBulletAudit ? "Hide Bullet Audit" : `Audit All Bullets (${achievement.totalBullets})`}
            </button>
          )}
        </div>

        {achievement ? (
          <div className="mt-5 space-y-5">
            {/* Metric Rate & Bullet Counts */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Quantified Impact Rate */}
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 sm:col-span-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-500 block mb-1">
                    Quantified-Impact Rate
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-gray-900">
                      {achievement.impactMetricRate}%
                    </span>
                    <span className="text-xs text-gray-500 font-medium">of bullets</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${
                      achievement.impactMetricRate >= 50
                        ? "bg-emerald-500"
                        : achievement.impactMetricRate >= 30
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, achievement.impactMetricRate)}%` }}
                  />
                </div>
              </div>

              {/* Strong Bullets */}
              <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200 flex flex-col justify-between">
                <span className="text-xs font-semibold text-emerald-800 block">
                  Strong Bullets
                </span>
                <span className="text-2xl font-extrabold text-emerald-700">
                  {achievement.strongBullets}
                </span>
                <span className="text-[11px] text-emerald-700">
                  Action verb + Tech + Metric
                </span>
              </div>

              {/* Needs Metrics Bullets */}
              <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200 flex flex-col justify-between">
                <span className="text-xs font-semibold text-amber-800 block">
                  Needs Metrics
                </span>
                <span className="text-2xl font-extrabold text-amber-700">
                  {achievement.needsMetricsBullets}
                </span>
                <span className="text-[11px] text-amber-700">
                  Has action verb, lacks numbers
                </span>
              </div>

              {/* Weak Bullets */}
              <div className="bg-rose-50/60 rounded-xl p-3.5 border border-rose-200 flex flex-col justify-between">
                <span className="text-xs font-semibold text-rose-800 block">
                  Weak Bullets
                </span>
                <span className="text-2xl font-extrabold text-rose-700">
                  {achievement.weakBullets}
                </span>
                <span className="text-[11px] text-rose-700">
                  Passive voice / no metrics
                </span>
              </div>
            </div>

            {/* Generic Buzzwords Warning Callout */}
            {buzzwordIssues.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1">
                  <img src="/icons/warning.svg" alt="Warning" className="w-4 h-4" />
                  Generic Buzzwords Detected
                </div>
                <p className="text-xs text-amber-800 mb-2">
                  Generic buzzwords dilute technical impact. Replace them with specific engineering achievements:
                </p>
                <div className="space-y-1">
                  {buzzwordIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="text-xs font-medium text-amber-950 bg-white/70 px-3 py-1.5 rounded border border-amber-200/60"
                    >
                      {issue.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Bullet Audit Detail */}
            {showBulletAudit && (
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <h4 className="text-xs uppercase font-bold tracking-wider text-gray-500">
                  Full Bullet Audit Detail ({achievement.bullets.length})
                </h4>
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {achievement.bullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                        bullet.qualityTier === "strong"
                          ? "bg-emerald-50/30 border-emerald-200"
                          : bullet.qualityTier === "needs_metrics"
                          ? "bg-amber-50/30 border-amber-200"
                          : "bg-rose-50/30 border-rose-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-500 text-[10px]">
                          [{bullet.section}]
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            bullet.qualityTier === "strong"
                              ? "bg-emerald-100 text-emerald-800"
                              : bullet.qualityTier === "needs_metrics"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {bullet.qualityTier === "strong" && "Strong (Quantified)"}
                          {bullet.qualityTier === "needs_metrics" && "Needs Numbers/Metrics"}
                          {bullet.qualityTier === "weak" && "Weak / Passive"}
                        </span>
                      </div>
                      <p className="text-gray-800 font-medium">{bullet.text}</p>
                      {bullet.improvementSuggestion && (
                        <p className="text-[11px] text-gray-500 italic mt-0.5">
                          💡 Suggestion: {bullet.improvementSuggestion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl mt-4">
            <p className="text-sm">Achievement diagnostics unavailable.</p>
          </div>
        )}
      </section>

      {/* =====================================================================
          SECTION 7: PRIORITIZED RECOMMENDATIONS
          ===================================================================== */}
      <section
        id="recommendations-section"
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
      >
        <div className="pb-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Deterministic Recommendations</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Prioritized action items to maximize ATS ranking and recruitment conversion.
          </p>
        </div>

        {recommendations ? (
          <div className="mt-5 space-y-4">
            {/* 1. Critical Recommendations */}
            {recommendations.critical.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-rose-600 text-white px-2.5 py-0.5 rounded-full">
                    Critical
                  </span>
                  <span className="text-xs font-semibold text-rose-900">
                    High ATS filtering risk — resolve first
                  </span>
                </div>
                <div className="space-y-2">
                  {recommendations.critical.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-rose-950 font-medium bg-white/80 p-2.5 rounded-lg border border-rose-200"
                    >
                      <img src="/icons/warning.svg" alt="Critical" className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Important Recommendations */}
            {recommendations.important.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-amber-600 text-white px-2.5 py-0.5 rounded-full">
                    Important
                  </span>
                  <span className="text-xs font-semibold text-amber-900">
                    High impact on ATS scoring & recruiter evaluation
                  </span>
                </div>
                <div className="space-y-2">
                  {recommendations.important.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-amber-950 font-medium bg-white/80 p-2.5 rounded-lg border border-amber-200"
                    >
                      <img src="/icons/info.svg" alt="Important" className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Optional Recommendations */}
            {recommendations.optional.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
                    Optional
                  </span>
                  <span className="text-xs font-semibold text-blue-900">
                    Competitive enhancements and preferred keywords
                  </span>
                </div>
                <div className="space-y-2">
                  {recommendations.optional.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-xs text-blue-950 font-medium bg-white/80 p-2.5 rounded-lg border border-blue-200"
                    >
                      <span className="text-blue-500 font-bold shrink-0">•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-xl mt-4">
            <p className="text-sm">No specific diagnostic recommendations generated.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AtsDashboard;
