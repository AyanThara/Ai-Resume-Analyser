import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState, useRef, useMemo} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import {APP_CONFIG} from "~/config";
import type { AtsResult } from "~/lib/atsEngine";
import { calculateAtsScore } from "~/lib/atsEngine";
import { createDeterministicFeedback } from "~/lib/utils";
import InteractiveRescorer from "~/components/InteractiveRescorer";
import type { AtsComparisonInfo } from "~/components/AtsDashboard";
import { ResumeImprovement } from "~/components/ResumeImprovement";
import { extractImprovementTargets } from "~/lib/improvementTargets";
import { generateResumeSuggestions, type ResumeSuggestion } from "~/lib/suggestionGenerator";
import { applySuggestionToResumeText } from "~/lib/suggestionApplier";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv, ai } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');

    // Original Baseline state
    const [originalResumeText, setOriginalResumeText] = useState('');
    const [originalJobDescription, setOriginalJobDescription] = useState('');
    const [originalJobTitle, setOriginalJobTitle] = useState('');
    const [originalAtsResult, setOriginalAtsResult] = useState<AtsResult | null>(null);
    const [originalFeedback, setOriginalFeedback] = useState<Feedback | null>(null);

    // Current Modified / Re-scored state
    const [currentResumeText, setCurrentResumeText] = useState('');
    const [currentJobDescription, setCurrentJobDescription] = useState('');
    const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isRescoring, setIsRescoring] = useState(false);

    // Phase 9 Resume Improvement & Suggestions state
    const [suggestions, setSuggestions] = useState<ResumeSuggestion[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [suggestionSource, setSuggestionSource] = useState<"ai" | "deterministic">("deterministic");
    const [acceptedSuggestionIds, setAcceptedSuggestionIds] = useState<string[]>([]);
    const [rejectedSuggestionIds, setRejectedSuggestionIds] = useState<string[]>([]);

    // Resume load states
    const [isLoadingResume, setIsLoadingResume] = useState(true);
    const [resumeLoadError, setResumeLoadError] = useState<string | null>(null);

    const isInitialLoaded = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        // If unauthenticated and Puter KV is enabled, redirect to auth
        if (APP_CONFIG.PUTER_KV_ENABLED && !isLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/resume/${id}`);
        }
    }, [isLoading, auth.isAuthenticated, id, navigate]);

    useEffect(() => {
        let createdBlobUrl = '';

        const loadResume = async () => {
            console.log(`[RESUME] Loading resume with ID: ${id}`);
            let data: any = null;

            try {
                // 1. PRIMARY: Always check local storage (sessionStorage first, localStorage second)
                if (APP_CONFIG.LOCAL_STORAGE_ENABLED && typeof window !== 'undefined') {
                    // Check sessionStorage first
                    try {
                        const sessionRaw = sessionStorage.getItem(`resume:${id}`);
                        if (sessionRaw) {
                            data = JSON.parse(sessionRaw);
                            console.log(`[RESUME] Found analysis data in sessionStorage for resume:${id}`);
                        }
                    } catch (sessionErr) {
                        console.warn(`[RESUME] Error reading/parsing sessionStorage for resume:${id}:`, sessionErr);
                    }

                    // Check localStorage second
                    if (!data) {
                        try {
                            const localRaw = localStorage.getItem(`resume:${id}`);
                            if (localRaw) {
                                data = JSON.parse(localRaw);
                                console.log(`[RESUME] Found analysis data in localStorage for resume:${id}`);
                            }
                        } catch (localErr) {
                            console.warn(`[RESUME] Error reading/parsing localStorage for resume:${id}:`, localErr);
                        }
                    }

                    if (data) {
                        console.log(`[RESUME] Successfully loaded analysis from local storage for resume:${id}`);
                    } else {
                        console.log(`[RESUME] No analysis data found in local storage for resume:${id}`);
                    }
                }

                // 2. SECONDARY / OPTIONAL: Only query Puter KV if local storage had no data AND feature flag is enabled
                if (!data && APP_CONFIG.PUTER_KV_ENABLED) {
                    try {
                        console.log(`[RESUME] Querying Puter KV for resume:${id}`);
                        const resume = await kv.get(`resume:${id}`);
                        if (resume) {
                            data = typeof resume === 'string' ? JSON.parse(resume) : resume;
                            console.log(`[RESUME] Found analysis data in Puter KV for resume:${id}`);
                        }
                    } catch (kvErr) {
                        console.warn("[RESUME] Puter kv.get notice:", kvErr);
                    }
                }

                if (!data) {
                    console.warn(`[RESUME] No analysis data found for resume:${id}`);
                    setResumeLoadError("The analysis data was not found in this browser session.");
                    return;
                }

                setResumeLoadError(null);

                // 3. Load Preview Image (Direct local dataUrl primary, Puter FS secondary)
                if (data.imageUrl) {
                    setImageUrl(data.imageUrl);
                } else if (data.imagePath && APP_CONFIG.PUTER_FS_ENABLED) {
                    try {
                        const imageBlob = await fs.read(data.imagePath);
                        if (imageBlob) {
                            createdBlobUrl = URL.createObjectURL(imageBlob);
                            setImageUrl(createdBlobUrl);
                        }
                    } catch (imgErr) {
                        console.warn("[RESUME] fs.read image preview failed:", imgErr);
                    }
                }

                // 4. Load Resume Document URL
                if (data.resumeUrl) {
                    setResumeUrl(data.resumeUrl);
                } else if (data.resumePath && APP_CONFIG.PUTER_FS_ENABLED) {
                    try {
                        const resumeBlob = await fs.read(data.resumePath);
                        if (resumeBlob) {
                            const pdfBlob = new Blob([resumeBlob], { type: 'application/pdf' });
                            const pdfUrl = URL.createObjectURL(pdfBlob);
                            setResumeUrl(pdfUrl);
                        }
                    } catch (resErr) {
                        console.warn("[RESUME] fs.read resume PDF failed:", resErr);
                    }
                }

                const rawResumeText = data.resumeText || '';
                const rawJd = data.jobDescription || '';
                const rawJobTitle = data.jobTitle || '';

                setOriginalResumeText(rawResumeText);
                setCurrentResumeText(rawResumeText);

                setOriginalJobDescription(rawJd);
                setCurrentJobDescription(rawJd);

                setOriginalJobTitle(rawJobTitle);

                let effectiveAtsResult: AtsResult | null = data.atsResult || data.feedback?.atsResult || null;

                // If atsResult is missing or incomplete, compute it from resumeText and jobDescription if available
                if ((!effectiveAtsResult || !effectiveAtsResult.diagnostics) && rawResumeText && rawJd) {
                    try {
                        effectiveAtsResult = calculateAtsScore(rawResumeText, rawJd, rawJobTitle);
                    } catch (calcErr) {
                        console.warn("[RESUME] Error computing ATS diagnostics:", calcErr);
                    }
                }

                if (effectiveAtsResult) {
                    setOriginalAtsResult(effectiveAtsResult);
                    setAtsResult(effectiveAtsResult);

                    // If feedback is missing, or is legacy (missing atsResult or inconsistent scores), create/sync deterministic feedback
                    if (!data.feedback || data.feedback.overallScore !== effectiveAtsResult.overallScore || !data.feedback.ATS?.breakdown) {
                        const syncedFeedback = createDeterministicFeedback(effectiveAtsResult, rawJobTitle, rawJd);
                        setOriginalFeedback(syncedFeedback);
                        setFeedback(syncedFeedback);
                    } else {
                        setOriginalFeedback(data.feedback);
                        setFeedback(data.feedback);
                    }
                } else {
                    setOriginalFeedback(data.feedback);
                    setFeedback(data.feedback);
                }

                isInitialLoaded.current = true;
            } catch (err) {
                console.error(`[RESUME] Error loading resume:${id}:`, err);
                setResumeLoadError("The analysis data was not found in this browser session.");
            } finally {
                setIsLoadingResume(false);
            }
        };

        loadResume();

        return () => {
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [id]);

    // Live Re-scoring execution
    const performRescore = (rText: string, jdText: string) => {
        if (!rText.trim()) return;
        try {
            setIsRescoring(true);
            const newAtsResult = calculateAtsScore(rText, jdText, originalJobTitle);
            const newFeedback = createDeterministicFeedback(newAtsResult, originalJobTitle, jdText);
            setAtsResult(newAtsResult);
            setFeedback(newFeedback);
        } catch (err) {
            console.error("[RESCORE] Deterministic re-scoring error:", err);
        } finally {
            setIsRescoring(false);
        }
    };

    // Debounced live re-scoring on user edits
    useEffect(() => {
        if (!isInitialLoaded.current) return;

        // Check if actually modified from original
        const isModified =
            currentResumeText.trim() !== originalResumeText.trim() ||
            currentJobDescription.trim() !== originalJobDescription.trim();

        if (!isModified) {
            if (originalAtsResult && originalFeedback) {
                setAtsResult(originalAtsResult);
                setFeedback(originalFeedback);
            }
            return;
        }

        const timer = setTimeout(() => {
            performRescore(currentResumeText, currentJobDescription);
        }, 300);

        return () => clearTimeout(timer);
    }, [currentResumeText, currentJobDescription]);

    // Reset to Original Baseline
    const handleResetToOriginal = () => {
        setCurrentResumeText(originalResumeText);
        setCurrentJobDescription(originalJobDescription);
        setAtsResult(originalAtsResult);
        setFeedback(originalFeedback);
        setAcceptedSuggestionIds([]);
        setRejectedSuggestionIds([]);
    };

    // Phase 9: Generate Suggestions (on demand only)
    const handleGenerateSuggestions = async () => {
        const activeAts = atsResult || originalAtsResult;
        if (!activeAts || !currentResumeText) return;

        try {
            setIsGeneratingSuggestions(true);
            const targets = extractImprovementTargets(
                activeAts,
                currentResumeText,
                currentJobDescription || originalJobDescription
            );
            const result = await generateResumeSuggestions({
                targets,
                resumeText: currentResumeText,
                jobDescription: currentJobDescription || originalJobDescription,
                aiChat: ai ? (prompt, opts) => ai.chat(prompt, undefined, undefined, opts) : undefined,
            });
            setSuggestions(result.suggestions);
            setSuggestionSource(result.source);
        } catch (err) {
            console.error("[SUGGESTIONS] Error generating suggestions:", err);
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };

    // Phase 9: Accept Suggestion -> Updates resume text & triggers deterministic re-scoring
    const handleAcceptSuggestion = (suggestion: ResumeSuggestion) => {
        const updatedResume = applySuggestionToResumeText(currentResumeText, suggestion);
        setCurrentResumeText(updatedResume);
        setAcceptedSuggestionIds((prev) => [...prev, suggestion.id]);
        performRescore(updatedResume, currentJobDescription);
    };

    // Phase 9: Reject Suggestion
    const handleRejectSuggestion = (suggestionId: string) => {
        setRejectedSuggestionIds((prev) => [...prev, suggestionId]);
    };

    // Save changes locally to localStorage and sessionStorage
    const handleSaveToLocalStorage = () => {
        if (typeof window === 'undefined' || !id) return;
        try {
            const existingRaw = sessionStorage.getItem(`resume:${id}`) || localStorage.getItem(`resume:${id}`);
            const parsed = existingRaw ? JSON.parse(existingRaw) : {};
            const updated = {
                ...parsed,
                resumeText: currentResumeText,
                jobDescription: currentJobDescription,
                atsResult,
                feedback,
            };
            // Ensure no large base64 data URLs are persisted
            delete updated.imageUrl;
            delete updated.resumeUrl;
            const serialized = JSON.stringify(updated);
            try {
                sessionStorage.setItem(`resume:${id}`, serialized);
            } catch (sErr) {
                console.warn('[STORAGE] sessionStorage update warning:', sErr);
            }
            try {
                localStorage.setItem(`resume:${id}`, serialized);
            } catch (lErr) {
                console.warn('[STORAGE] localStorage update warning:', lErr);
            }

            // Establish new baseline
            setOriginalResumeText(currentResumeText);
            setOriginalJobDescription(currentJobDescription);
            setOriginalAtsResult(atsResult);
            setOriginalFeedback(feedback);
        } catch (err) {
            console.warn("[RESUME] Local save error:", err);
        }
    };

    // Comparison data computation for ATS Dashboard
    const isModified = Boolean(
        (originalResumeText.trim() !== currentResumeText.trim() ||
            currentJobDescription.trim() !== originalJobDescription.trim()) &&
        originalAtsResult &&
        atsResult
    );

    const comparisonInfo: AtsComparisonInfo | null = useMemo(() => {
        if (!originalAtsResult || !atsResult) return null;
        const origBd = originalAtsResult.breakdown;
        const currBd = atsResult.breakdown;
        return {
            originalScore: originalAtsResult.overallScore,
            currentScore: atsResult.overallScore,
            deltaScore: atsResult.overallScore - originalAtsResult.overallScore,
            originalBreakdown: origBd,
            currentBreakdown: currBd,
            deltaKeyword: currBd.keywordMatch - origBd.keywordMatch,
            deltaStructure: currBd.structure - origBd.structure,
            deltaParseability: currBd.parseability - origBd.parseability,
            deltaContent: currBd.content - origBd.content,
            isModified,
        };
    }, [originalAtsResult, atsResult, isModified]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg')] bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl ? (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            {resumeUrl ? (
                                <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={imageUrl}
                                        className="w-full h-full object-contain rounded-2xl"
                                        title="resume"
                                        alt="Resume preview"
                                    />
                                </a>
                            ) : (
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                    alt="Resume preview"
                                />
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-700 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm w-full max-w-md max-h-[85vh] flex flex-col gap-4 overflow-hidden">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                        DOC
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-800">Resume Document</h4>
                                        <p className="text-xs text-gray-400">Extracted Text Preview</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-full">
                                    Analyzed
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto text-xs text-gray-600 leading-relaxed font-mono whitespace-pre-wrap p-4 bg-gray-50 rounded-xl border border-gray-100 max-h-[60vh] select-text">
                                {currentResumeText || originalResumeText || "Resume text processed successfully."}
                            </div>
                            <div className="text-[11px] text-gray-400 text-center">
                                {originalJobTitle ? `Target Role: ${originalJobTitle}` : "Analyzed for job matching"}
                            </div>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                        <p className="text-sm text-gray-500">
                            Comprehensive deterministic ATS score and explainability report.
                        </p>
                    </div>

                    {isLoadingResume ? (
                        <img src="/images/resume-scan-2.gif" className="w-full" alt="Loading resume" />
                    ) : resumeLoadError || !feedback ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center max-w-lg mx-auto my-12 animate-in fade-in duration-500">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4 text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">We couldn't load this analysis.</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                The analysis data was not found in this browser session.
                            </p>
                            <Link
                                to="/"
                                className="primary-button text-center inline-flex items-center justify-center max-w-xs font-semibold py-3 px-6 text-sm"
                            >
                                Back to Homepage
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            {/* Phase 8.2 Interactive Re-scoring Studio */}
                            <InteractiveRescorer
                                originalResumeText={originalResumeText}
                                originalJobDescription={originalJobDescription}
                                originalJobTitle={originalJobTitle}
                                originalAtsResult={originalAtsResult}
                                currentResumeText={currentResumeText}
                                currentJobDescription={currentJobDescription}
                                currentAtsResult={atsResult}
                                onResumeTextChange={setCurrentResumeText}
                                onJobDescriptionChange={setCurrentJobDescription}
                                onResetToOriginal={handleResetToOriginal}
                                onSaveToLocalStorage={handleSaveToLocalStorage}
                                onRescoreNow={() => performRescore(currentResumeText, currentJobDescription)}
                                isRescoring={isRescoring}
                            />

                            {/* Phase 9 Resume Improvement & AI Suggestions */}
                            <ResumeImprovement
                                suggestions={suggestions}
                                isLoading={isGeneratingSuggestions}
                                source={suggestionSource}
                                onGenerate={handleGenerateSuggestions}
                                onAcceptSuggestion={handleAcceptSuggestion}
                                onRejectSuggestion={handleRejectSuggestion}
                                acceptedIds={acceptedSuggestionIds}
                                rejectedIds={rejectedSuggestionIds}
                            />

                            <Summary feedback={feedback} />

                            <ATS
                                score={feedback.ATS.score || 0}
                                suggestions={feedback.ATS.tips || []}
                                atsResult={atsResult || feedback.atsResult}
                                comparison={comparisonInfo}
                                onResetToOriginal={handleResetToOriginal}
                            />

                            <Details feedback={feedback} />
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
