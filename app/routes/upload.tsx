import { APP_CONFIG } from "~/config";
import {type FormEvent, useState} from 'react'
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID, safeExtractJSON, validateFeedback, createDeterministicFeedback, extractErrorMessage} from "~/lib/utils";
import {prepareInstructions} from "../../constants";
import {extractTextFromPdf} from "~/lib/pdfTextExtractor";
import {calculateAtsScore} from "~/lib/atsEngine";

const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
        if (errorMessage) setErrorMessage('');
    }

    const handleAnalyze = async ({
        companyName,
        jobTitle,
        jobDescription,
        file
    }: {
        companyName: string;
        jobTitle: string;
        jobDescription: string;
        file: File;
    }) => {
        setIsProcessing(true);
        setErrorMessage('');
        let currentStage = 'Initialization';
        const totalPipelineStart = performance.now();

        interface StageTelemetry {
            stage: string;
            required: boolean;
            startRelMs: number;
            endRelMs: number;
            durationMs: number;
            notes: string;
        }

        const telemetryLog: StageTelemetry[] = [];

        const recordStage = (
            stage: string,
            required: boolean,
            startMs: number,
            endMs: number,
            notes: string = ''
        ) => {
            const relStart = Math.round(startMs - totalPipelineStart);
            const relEnd = Math.round(endMs - totalPipelineStart);
            const duration = Math.round(endMs - startMs);
            telemetryLog.push({
                stage,
                required,
                startRelMs: relStart,
                endRelMs: relEnd,
                durationMs: duration,
                notes,
            });
            console.log(`[STAGE TELEMETRY] ${stage} | Duration: ${duration}ms | Start: +${relStart}ms | End: +${relEnd}ms | Required: ${required} | Notes: ${notes}`);
        };

        try {
            // Stage 1: Input Validation
            currentStage = 'Stage 1: Input Validation';
            const s1Start = performance.now();
            if (!file) {
                throw new Error('Please select a valid PDF resume file.');
            }
            if (!jobTitle || !jobTitle.trim()) {
                throw new Error('Job title is required for ATS matching.');
            }
            if (!jobDescription || !jobDescription.trim()) {
                throw new Error('Job description is required for ATS matching.');
            }
            const s1End = performance.now();
            recordStage('1. Input Validation', true, s1Start, s1End, 'Inputs verified');

            // Stage 2 (PATH A - REQUIRED): Deterministic PDF Text Extraction
            currentStage = 'Stage 2: PDF Text Extraction';
            setStatusText('Extracting resume text locally...');
            const s2Start = performance.now();
            const resumeText = await extractTextFromPdf(file);
            const s2End = performance.now();

            if (!resumeText || !resumeText.trim()) {
                throw new Error('No readable text could be extracted from this PDF. Please ensure the PDF is not password protected or a scanned image.');
            }
            const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
            recordStage('2. PDF Text Extraction', true, s2Start, s2End, `${resumeText.length} chars, ${wordCount} words`);

            // Stage 3 (PATH A - REQUIRED): Deterministic ATS Calculation
            currentStage = 'Stage 3: Deterministic ATS Calculation';
            setStatusText('Calculating deterministic ATS score...');
            const s3Start = performance.now();
            const atsResult = calculateAtsScore(resumeText, jobDescription, jobTitle);
            const s3End = performance.now();

            if (!atsResult || typeof atsResult.atsScore !== 'number') {
                throw new Error('Deterministic ATS scoring engine failed to return a valid result.');
            }
            recordStage('3. Deterministic ATS Calculation', true, s3Start, s3End, `Score: ${atsResult.atsScore}/100`);

            // Stage 4 (PATH A - REQUIRED for UI): PDF Preview Generation
            currentStage = 'Stage 4: PDF Preview Generation';
            setStatusText('Generating resume preview...');
            const s4Start = performance.now();
            const imageResult = await convertPdfToImage(file);
            const s4End = performance.now();
            recordStage('4. PDF Preview Generation', true, s4Start, s4End, imageResult.imageUrl ? 'Preview generated' : 'Failed preview');

            // Stage 5 (PATH B - OPTIONAL): Puter AI Invocation / Setup
            currentStage = 'Stage 5: Puter AI Invocation';
            let qualitativeFeedback: Feedback | null = null;
            let aiNotes = 'Bypassed (PUTER_AI_ENABLED = false)';
            const s5Start = performance.now();

            if (APP_CONFIG.PUTER_AI_ENABLED) {
                setStatusText('Analyzing qualitative feedback...');
                try {
                    const aiPrompt = `Here is the candidate's resume text:
---
${resumeText}
---

${prepareInstructions({ jobTitle, jobDescription })}`;

                    const feedbackPromise = ai.chat(aiPrompt, { model: "claude-sonnet" } as any);
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("AI qualitative request timed out after 30s")), 30000)
                    );

                    const feedback = await Promise.race([feedbackPromise, timeoutPromise]);

                    let feedbackText = '';
                    if (feedback && typeof feedback === 'object') {
                        if (typeof (feedback as any).message?.content === 'string') {
                            feedbackText = (feedback as any).message.content;
                        } else if (Array.isArray((feedback as any).message?.content)) {
                            const contentArr = (feedback as any).message.content;
                            feedbackText = contentArr
                                .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
                                .filter(Boolean)
                                .join('\n');
                        } else if (typeof (feedback as any).text === 'string') {
                            feedbackText = (feedback as any).text;
                        }
                    }

                    if (feedbackText && feedbackText.trim()) {
                        const parsedData = safeExtractJSON(feedbackText);
                        qualitativeFeedback = validateFeedback(parsedData);
                        aiNotes = 'AI response parsed successfully';
                    } else {
                        aiNotes = 'AI returned empty content';
                    }
                } catch (aiErr) {
                    aiNotes = `AI unavailable/failed: ${extractErrorMessage(aiErr)}`;
                }
            } else {
                console.log("[PIPELINE] Puter AI disabled via APP_CONFIG.PUTER_AI_ENABLED=false. Skipping AI call completely.");
            }
            const s5End = performance.now();
            recordStage('5. Puter AI Invocation', false, s5Start, s5End, aiNotes);

            // Stage 6 (PATH B Fallback - Conditional): Deterministic Fallback Generation
            currentStage = 'Stage 6: Deterministic Fallback Generation';
            const s6Start = performance.now();
            let baseFeedback: Feedback;
            if (qualitativeFeedback) {
                baseFeedback = qualitativeFeedback;
            } else {
                baseFeedback = createDeterministicFeedback(atsResult, jobTitle, jobDescription);
            }
            const s6End = performance.now();
            recordStage('6. Deterministic Fallback Generation', !qualitativeFeedback, s6Start, s6End, qualitativeFeedback ? 'Bypassed (AI succeeded)' : 'Used deterministic fallback');

            // Stage 7: Result Merge
            currentStage = 'Stage 7: Result Merge';
            const s7Start = performance.now();
            const deterministicAtsTips: { type: "good" | "improve"; tip: string }[] = atsResult.tips.map((tip) => ({
                type: tip.startsWith("Excellent") || tip.startsWith("Outstanding") ? ("good" as const) : ("improve" as const),
                tip,
            }));

            const finalFeedback: Feedback = {
                ...baseFeedback,
                overallScore: atsResult.overallScore,
                ATS: {
                    score: atsResult.atsScore,
                    breakdown: atsResult.breakdown,
                    tips: deterministicAtsTips.length > 0 ? deterministicAtsTips : baseFeedback.ATS.tips,
                },
                atsResult,
            };
            const s7End = performance.now();
            recordStage('7. Result Merge', true, s7Start, s7End, `Final score: ${finalFeedback.overallScore}`);

            // Stage 8a: Storage Persistence - Local (sessionStorage/localStorage)
            currentStage = 'Stage 8a: Local Storage Persistence';
            const uuid = generateUUID();
            const data = {
                id: uuid,
                companyName: companyName.trim(),
                jobTitle: jobTitle.trim(),
                jobDescription: jobDescription.trim(),
                resumeText,
                atsResult,
                feedback: finalFeedback,
                imageUrl: imageResult.imageUrl || '',
            };
            const serializedData = JSON.stringify(data);

            const s8aStart = performance.now();
            try {
                localStorage.setItem(`resume:${uuid}`, serializedData);
                sessionStorage.setItem(`resume:${uuid}`, serializedData);
            } catch (storageErr) {
                console.warn('[PIPELINE] Local storage write warning:', storageErr);
            }
            const s8aEnd = performance.now();
            recordStage('8a. Local Storage (localStorage/sessionStorage)', true, s8aStart, s8aEnd, `Size: ~${Math.round(serializedData.length / 1024)} KB`);

            // Stage 8b: Storage Persistence - Puter KV (Optional feature flag)
            currentStage = 'Stage 8b: Puter KV Storage';
            const s8bStart = performance.now();
            let kvNotes = 'Bypassed (PUTER_KV_ENABLED = false)';
            if (APP_CONFIG.PUTER_KV_ENABLED) {
                try {
                    await kv.set(`resume:${uuid}`, serializedData);
                    kvNotes = 'KV set succeeded';
                } catch (kvErr) {
                    kvNotes = `KV set failed: ${extractErrorMessage(kvErr)}`;
                }
            } else {
                console.log("[PIPELINE] Puter KV disabled via APP_CONFIG.PUTER_KV_ENABLED=false. Skipping Puter KV call completely.");
            }
            const s8bEnd = performance.now();
            recordStage('8b. Puter KV Storage', false, s8bStart, s8bEnd, kvNotes);

            const totalPipelineTimeMs = Math.round(performance.now() - totalPipelineStart);

            // Record full telemetry summary to window and console
            console.log("================================================================================");
            console.log("PHASE 6 PROFILING TELEMETRY REPORT");
            console.log("================================================================================");
            console.table(telemetryLog);
            console.log(`TOTAL PIPELINE DURATION: ${totalPipelineTimeMs}ms`);
            console.log("================================================================================");

            if (typeof window !== 'undefined') {
                (window as any).__PIPELINE_PROFILE__ = {
                    totalDurationMs: totalPipelineTimeMs,
                    stages: telemetryLog,
                };
            }

            // Stage 9: Navigation to Dashboard
            currentStage = 'Stage 9: Navigation';
            setStatusText('Analysis complete, redirecting...');
            const s9Start = performance.now();
            navigate(`/resume/${uuid}`);
            const s9End = performance.now();
            recordStage('9. Navigation to Dashboard', true, s9Start, s9End, `Navigated to /resume/${uuid}`);
        } catch (err) {
            console.error(`[PIPELINE FAILURE] Failed during stage "${currentStage}":`, err);
            const actualError = extractErrorMessage(err);
            setErrorMessage(`Analysis failed: [${currentStage}] ${actualError}`);
        } finally {
            setIsProcessing(false);
            setStatusText('');
        }
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest('form');
        if(!form) return;
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if(!file) {
            setErrorMessage('Please upload a PDF resume before analyzing.');
            return;
        }

        if(!jobTitle || !jobTitle.trim()) {
            setErrorMessage('Please provide a job title before analyzing.');
            return;
        }

        if(!jobDescription || !jobDescription.trim()) {
            setErrorMessage('Please provide a job description for ATS keyword and content matching.');
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    }

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />

            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" alt="Scanning resume" />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}

                    {errorMessage && !isProcessing && (
                        <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 max-w-xl mx-auto w-full text-left">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm">Analysis Failed</span>
                                <button
                                    type="button"
                                    onClick={() => setErrorMessage('')}
                                    className="text-xs text-red-600 hover:text-red-800 underline cursor-pointer"
                                >
                                    Dismiss
                                </button>
                            </div>
                            <p className="text-sm font-medium">{errorMessage}</p>
                            <p className="text-xs text-red-500 mt-2">
                                Check the browser console (F12) for detailed pipeline logs. You can verify your inputs and try again.
                            </p>
                        </div>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" name="company-name" placeholder="Company Name" id="company-name" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" name="job-title" placeholder="Job Title" id="job-title" />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} name="job-description" placeholder="Job Description" id="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit">
                                Analyze Resume
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
