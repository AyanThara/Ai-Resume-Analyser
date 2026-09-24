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

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
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

    const isInitialLoaded = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        // If unauthenticated, only redirect if we have no local resume data
        if (!isLoading && !auth.isAuthenticated) {
            const hasLocal = typeof window !== 'undefined' && (
                sessionStorage.getItem(`resume:${id}`) ||
                localStorage.getItem(`resume:${id}`)
            );
            if (!hasLocal) {
                navigate(`/auth?next=/resume/${id}`);
            }
        }
    }, [isLoading, auth.isAuthenticated, id]);

    useEffect(() => {
        let createdBlobUrl = '';

        const loadResume = async () => {
            let data: any = null;

            // 1. PRIMARY: Always check local storage (sessionStorage and localStorage) FIRST
            if (APP_CONFIG.LOCAL_STORAGE_ENABLED && typeof window !== 'undefined') {
                try {
                    const localRaw = sessionStorage.getItem(`resume:${id}`) || localStorage.getItem(`resume:${id}`);
                    if (localRaw) {
                        data = JSON.parse(localRaw);
                        console.log(`[RESUME] Successfully loaded analysis from local storage for resume:${id}`);
                    }
                } catch (localErr) {
                    console.warn("[RESUME] Local storage read error:", localErr);
                }
            }

            // 2. SECONDARY / OPTIONAL: Only query Puter KV if local storage had no data AND feature flag is enabled
            if (!data && APP_CONFIG.PUTER_KV_ENABLED) {
                try {
                    console.log(`[RESUME] Querying Puter KV for resume:${id}`);
                    const resume = await kv.get(`resume:${id}`);
                    if (resume) {
                        data = typeof resume === 'string' ? JSON.parse(resume) : resume;
                    }
                } catch (kvErr) {
                    console.warn("[RESUME] Puter kv.get notice:", kvErr);
                }
            }

            if (!data) {
                console.warn(`[RESUME] No analysis data found for resume:${id}`);
                return;
            }

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
            const serialized = JSON.stringify(updated);
            localStorage.setItem(`resume:${id}`, serialized);
            sessionStorage.setItem(`resume:${id}`, serialized);

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
                    {imageUrl && (
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
                    )}
                </section>
                <section className="feedback-section">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                        <p className="text-sm text-gray-500">
                            Comprehensive deterministic ATS score and explainability report.
                        </p>
                    </div>

                    {feedback ? (
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
                    ) : (
                        <img src="/images/resume-scan-2.gif" className="w-full" alt="Loading resume" />
                    )}
                </section>
            </div>
        </main>
    )
}
export default Resume
