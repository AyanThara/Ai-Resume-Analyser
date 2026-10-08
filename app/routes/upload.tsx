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

/**
 * Safely clean up stale resume:* entries to prevent browser storage quota issues.
 * Only removes keys starting with 'resume:'. Never deletes unrelated keys.
 */
function cleanupStaleResumeStorage(maxToKeep: number = 5) {
    if (typeof window === 'undefined') return;

    // 1. Clean up localStorage
    try {
        const resumeEntries: { key: string; timestamp: number; size: number }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('resume:')) {
                const raw = localStorage.getItem(key) || '';
                let timestamp = 0;
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed.createdAt) {
                        timestamp = new Date(parsed.createdAt).getTime();
                    }
                } catch {
                    timestamp = 0;
                }
                resumeEntries.push({ key, timestamp, size: raw.length });
            }
        }

        // Purge any oversized legacy entries (> 100 KB) that might contain old base64 images
        for (const entry of resumeEntries) {
            if (entry.size > 100 * 1024) {
                console.log(`[STORAGE] Purging oversized legacy entry: ${entry.key} (${Math.round(entry.size / 1024)} KB)`);
                localStorage.removeItem(entry.key);
            }
        }

        // Keep at most maxToKeep most recent entries in localStorage
        const validRemaining: { key: string; timestamp: number }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('resume:')) {
                let timestamp = 0;
                try {
                    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
                    timestamp = parsed.createdAt ? new Date(parsed.createdAt).getTime() : 0;
                } catch {}
                validRemaining.push({ key, timestamp });
            }
        }

        if (validRemaining.length >= maxToKeep) {
            validRemaining.sort((a, b) => a.timestamp - b.timestamp);
            const toPurge = validRemaining.length - maxToKeep + 1;
            for (let i = 0; i < toPurge; i++) {
                console.log(`[STORAGE] Purging oldest resume entry to preserve quota: ${validRemaining[i].key}`);
                localStorage.removeItem(validRemaining[i].key);
            }
        }
    } catch (err) {
        console.warn('[STORAGE] Safe localStorage cleanup warning:', err);
    }

    // 2. Also clean up sessionStorage stale entries
    try {
        const sessionResumeKeys: { key: string; timestamp: number }[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('resume:')) {
                let timestamp = 0;
                try {
                    const parsed = JSON.parse(sessionStorage.getItem(key) || '{}');
                    timestamp = parsed.createdAt ? new Date(parsed.createdAt).getTime() : 0;
                } catch {}
                sessionResumeKeys.push({ key, timestamp });
            }
        }

        if (sessionResumeKeys.length >= maxToKeep) {
            sessionResumeKeys.sort((a, b) => a.timestamp - b.timestamp);
            const toPurge = sessionResumeKeys.length - maxToKeep + 1;
            for (let i = 0; i < toPurge; i++) {
                sessionStorage.removeItem(sessionResumeKeys[i].key);
            }
        }
    } catch (err) {
        console.warn('[STORAGE] Safe sessionStorage cleanup warning:', err);
    }
}

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
            const s8aStart = performance.now();

            // Safe cleanup of stale resume:* entries to maintain quota
            cleanupStaleResumeStorage(5);

            const uuid = generateUUID();
            // Build lightweight payload: persist ONLY what is required to reconstruct the analysis.
            // Exclude large base64 image data URLs from the persisted analysis object.
            const data = {
                id: uuid,
                companyName: companyName.trim(),
                jobTitle: jobTitle.trim(),
                jobDescription: jobDescription.trim(),
                resumeText,
                atsResult,
                feedback: finalFeedback,
                createdAt: new Date().toISOString(),
            };
            const serializedPayload = JSON.stringify(data);
            const payloadSizeKb = Math.round(serializedPayload.length / 1024);
            console.log(`[STORAGE] Analysis payload size: ${payloadSizeKb} KB`);

            let sessionStorageSuccess = false;
            let localStorageSuccess = false;

            // Preferred: Write to sessionStorage for the current analysis session
            try {
                sessionStorage.setItem(`resume:${uuid}`, serializedPayload);
                sessionStorageSuccess = true;
                console.log(`[STORAGE] Successfully saved to sessionStorage for resume:${uuid}`);
            } catch (storageErr) {
                console.warn('[STORAGE] sessionStorage write warning:', storageErr);
            }

            // Fallback: Write to localStorage for persistence across browser sessions
            try {
                localStorage.setItem(`resume:${uuid}`, serializedPayload);
                localStorageSuccess = true;
                console.log(`[STORAGE] Successfully saved to localStorage for resume:${uuid}`);
            } catch (storageErr) {
                console.warn('[STORAGE] localStorage write warning (quota exceeded or disabled):', storageErr);
            }

            // Storage verification: must happen AFTER the final lightweight payload is written
            let savedRaw: string | null = null;
            if (typeof window !== 'undefined') {
                // Preferred: check sessionStorage first, then localStorage
                savedRaw = sessionStorage.getItem(`resume:${uuid}`) || localStorage.getItem(`resume:${uuid}`);
            }

            let verifiedData: any = null;
            if (savedRaw) {
                try {
                    verifiedData = JSON.parse(savedRaw);
                } catch (parseErr) {
                    console.warn('[STORAGE] Failed to parse verified storage data:', parseErr);
                }
            }

            const isPersisted = Boolean(
                verifiedData &&
                typeof verifiedData.resumeText === 'string' &&
                verifiedData.resumeText.trim().length > 0 &&
                typeof verifiedData.jobDescription === 'string' &&
                verifiedData.jobDescription.trim().length > 0 &&
                verifiedData.atsResult &&
                typeof verifiedData.atsResult === 'object'
            );

            if (!isPersisted) {
                console.error('[STORAGE] Storage verification failed: neither sessionStorage nor localStorage contains valid analysis data.');
                throw new Error("Analysis completed, but the result could not be saved in browser storage. Please try again.");
            }

            const s8aEnd = performance.now();
            recordStage(
                '8a. Local Storage (sessionStorage/localStorage)',
                true,
                s8aStart,
                s8aEnd,
                `Verified persistence (${payloadSizeKb} KB) | sessionStorage: ${sessionStorageSuccess ? 'OK' : 'FAIL'} | localStorage: ${localStorageSuccess ? 'OK' : 'FAIL'}`
            );

            // Stage 8b: Storage Persistence - Puter KV (Optional feature flag)
            currentStage = 'Stage 8b: Puter KV Storage';
            const s8bStart = performance.now();
            let kvNotes = 'Bypassed (PUTER_KV_ENABLED = false)';
            if (APP_CONFIG.PUTER_KV_ENABLED) {
                try {
                    await kv.set(`resume:${uuid}`, serializedPayload);
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
            if (actualError === "Analysis completed, but the result could not be saved in browser storage. Please try again.") {
                setErrorMessage(actualError);
            } else {
                setErrorMessage(`Analysis failed: [${currentStage}] ${actualError}`);
            }
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
