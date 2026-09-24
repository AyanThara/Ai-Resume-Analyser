/**
 * Phase 9: Resume Improvement & AI Suggestions UI Component
 *
 * Renders prioritized, actionable resume improvement suggestions.
 * Empowers the candidate with one-click Accept / Reject controls.
 * Shows original vs suggested diff, rationale, and metric requirements.
 */

import React, { useState } from "react";
import type { ResumeSuggestion } from "~/lib/suggestionGenerator";
import type { ImprovementPriority } from "~/lib/improvementTargets";

interface ResumeImprovementProps {
    suggestions: ResumeSuggestion[];
    isLoading: boolean;
    source: "ai" | "deterministic";
    onGenerate: () => void;
    onAcceptSuggestion: (suggestion: ResumeSuggestion) => void;
    onRejectSuggestion: (suggestionId: string) => void;
    acceptedIds: string[];
    rejectedIds: string[];
}

export const ResumeImprovement: React.FC<ResumeImprovementProps> = ({
    suggestions,
    isLoading,
    source,
    onGenerate,
    onAcceptSuggestion,
    onRejectSuggestion,
    acceptedIds,
    rejectedIds,
}) => {
    const [selectedFilter, setSelectedFilter] = useState<"all" | ImprovementPriority>("all");

    // Filter visible suggestions (excluding rejected ones unless all are rejected)
    const activeSuggestions = suggestions.filter(s => !rejectedIds.includes(s.id));
    const filteredSuggestions = selectedFilter === "all"
        ? activeSuggestions
        : activeSuggestions.filter(s => s.priority === selectedFilter);

    const criticalCount = activeSuggestions.filter(s => s.priority === "critical").length;
    const importantCount = activeSuggestions.filter(s => s.priority === "important").length;
    const optionalCount = activeSuggestions.filter(s => s.priority === "optional").length;

    const renderPriorityBadge = (priority: ImprovementPriority) => {
        switch (priority) {
            case "critical":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                        Critical
                    </span>
                );
            case "important":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-amber-100 text-amber-900 border border-amber-200">
                        Important
                    </span>
                );
            case "optional":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                        Optional
                    </span>
                );
        }
    };

    const renderTypeTag = (type: ResumeSuggestion["type"]) => {
        const labels: Record<ResumeSuggestion["type"], { text: string; bg: string }> = {
            missing_skill: { text: "Missing Competency", bg: "bg-purple-50 text-purple-700 border-purple-200" },
            skills_only: { text: "Practical Evidence", bg: "bg-blue-50 text-blue-700 border-blue-200" },
            metric_improvement: { text: "Measurable Impact", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
            verb_improvement: { text: "Action Verb", bg: "bg-amber-50 text-amber-800 border-amber-200" },
            bullet_improvement: { text: "Bullet Optimization", bg: "bg-slate-50 text-slate-700 border-slate-200" },
        };
        const config = labels[type] || labels.bullet_improvement;
        return (
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${config.bg}`}>
                {config.text}
            </span>
        );
    };

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-full transition-all">
            {/* Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-xl shadow-inner">
                        ✨
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                                Resume Improvement & AI Suggestions
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                                {source === "ai" ? "AI Powered" : "Deterministic Engine"}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-2xl">
                            Actionable recommendations to bridge diagnosed gaps. Accepting a suggestion immediately updates the resume and re-scores your ATS metrics.
                        </p>
                    </div>
                </div>

                <button
                    onClick={onGenerate}
                    disabled={isLoading}
                    type="button"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generating Suggestions...</span>
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            <span>{suggestions.length > 0 ? "Refresh Suggestions" : "Generate Improvements"}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Filter Tabs & Counter Bar */}
            {suggestions.length > 0 && (
                <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-500">Filter by Priority:</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setSelectedFilter("all")}
                                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                    selectedFilter === "all"
                                        ? "bg-slate-900 text-white"
                                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                                }`}
                            >
                                All ({activeSuggestions.length})
                            </button>
                            {criticalCount > 0 && (
                                <button
                                    onClick={() => setSelectedFilter("critical")}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                        selectedFilter === "critical"
                                            ? "bg-rose-600 text-white"
                                            : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                                    }`}
                                >
                                    Critical ({criticalCount})
                                </button>
                            )}
                            {importantCount > 0 && (
                                <button
                                    onClick={() => setSelectedFilter("important")}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                        selectedFilter === "important"
                                            ? "bg-amber-600 text-white"
                                            : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
                                    }`}
                                >
                                    Important ({importantCount})
                                </button>
                            )}
                            {optionalCount > 0 && (
                                <button
                                    onClick={() => setSelectedFilter("optional")}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                                        selectedFilter === "optional"
                                            ? "bg-indigo-600 text-white"
                                            : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                                    }`}
                                >
                                    Optional ({optionalCount})
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="text-gray-500 font-medium">
                        {acceptedIds.length > 0 && (
                            <span className="text-emerald-700 font-bold mr-3">
                                ✓ {acceptedIds.length} Accepted
                            </span>
                        )}
                        <span>{filteredSuggestions.length} available</span>
                    </div>
                </div>
            )}

            {/* Suggestions List */}
            <div className="p-5 sm:p-6 space-y-4">
                {filteredSuggestions.length === 0 ? (
                    <div className="text-center py-10 px-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 font-bold text-2xl flex items-center justify-center mx-auto mb-3">
                            💡
                        </div>
                        <h4 className="text-base font-bold text-gray-800">
                            {suggestions.length === 0
                                ? "No suggestions generated yet"
                                : "No suggestions match the selected filter"}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                            {suggestions.length === 0
                                ? "Click 'Generate Improvements' above to extract actionable bullet improvements and skill templates."
                                : "Select 'All' to view all diagnosed recommendations."}
                        </p>
                    </div>
                ) : (
                    filteredSuggestions.map((sug) => {
                        const isAccepted = acceptedIds.includes(sug.id);

                        return (
                            <div
                                key={sug.id}
                                className={`rounded-xl border transition-all p-4 sm:p-5 flex flex-col gap-3.5 ${
                                    isAccepted
                                        ? "bg-emerald-50/40 border-emerald-300"
                                        : sug.priority === "critical"
                                        ? "bg-white border-rose-200 hover:border-rose-300"
                                        : sug.priority === "important"
                                        ? "bg-white border-amber-200 hover:border-amber-300"
                                        : "bg-white border-indigo-100 hover:border-indigo-200"
                                }`}
                            >
                                {/* Header Info */}
                                <div className="flex flex-wrap items-start justify-between gap-2.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {renderPriorityBadge(sug.priority)}
                                        {renderTypeTag(sug.type)}
                                        {sug.targetSkill && (
                                            <span className="font-extrabold text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                                Skill: {sug.targetSkill}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {isAccepted ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-xs">
                                                <span>✓</span> Applied
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => onRejectSuggestion(sug.id)}
                                                    type="button"
                                                    title="Dismiss suggestion"
                                                    className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    Dismiss
                                                </button>
                                                <button
                                                    onClick={() => onAcceptSuggestion(sug)}
                                                    type="button"
                                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                                                >
                                                    <span>✓</span> Accept & Apply
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Issue Title & Description */}
                                <div>
                                    <h4 className="text-sm font-extrabold text-gray-900">{sug.issue}</h4>
                                    {sug.evidence && (
                                        <p className="text-xs text-gray-600 mt-0.5">{sug.evidence}</p>
                                    )}
                                </div>

                                {/* Before & After Diff Box */}
                                <div className="space-y-2 text-xs">
                                    {sug.originalText && (
                                        <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-100">
                                            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
                                                Original Resume Text:
                                            </span>
                                            <p className="text-rose-950 font-mono text-[11px] leading-relaxed line-through opacity-80">
                                                {sug.originalText}
                                            </p>
                                        </div>
                                    )}

                                    <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                                                Suggested Improvement:
                                            </span>
                                            {sug.requiresUserMetric && (
                                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                                    ⚠️ Replace [brackets] with your real metric
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-emerald-950 font-mono text-[11px] leading-relaxed font-semibold">
                                            {sug.suggestedText}
                                        </p>
                                    </div>
                                </div>

                                {/* Reason & ATS Impact */}
                                <div className="text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-start gap-2">
                                    <span className="font-bold text-indigo-900 shrink-0">ATS Impact:</span>
                                    <span>{sug.reason}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
};

export default ResumeImprovement;
