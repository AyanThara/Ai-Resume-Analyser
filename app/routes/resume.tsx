import {Link, useNavigate, useParams} from "react-router";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";
import {APP_CONFIG} from "~/config";
import type { AtsResult } from "~/lib/atsEngine";
import { calculateAtsScore } from "~/lib/atsEngine";

export const meta = () => ([
    { title: 'Resumind | Review ' },
    { name: 'description', content: 'Detailed overview of your resume' },
])

const Resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
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

            setFeedback(data.feedback);

            if (data.atsResult) {
                setAtsResult(data.atsResult);
            } else if (data.feedback?.atsResult) {
                setAtsResult(data.feedback.atsResult);
            } else if (data.resumeText && data.jobDescription) {
                try {
                    const computed = calculateAtsScore(data.resumeText, data.jobDescription, data.jobTitle);
                    setAtsResult(computed);
                } catch (calcErr) {
                    console.warn("[RESUME] Error computing ATS diagnostics:", calcErr);
                }
            }
        };

        loadResume();

        return () => {
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [id]);

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
                    <h2 className="text-4xl !text-black font-bold">Resume Review</h2>
                    {feedback ? (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                            <Summary feedback={feedback} />
                            <ATS
                                score={feedback.ATS.score || 0}
                                suggestions={feedback.ATS.tips || []}
                                atsResult={atsResult || feedback.atsResult}
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
