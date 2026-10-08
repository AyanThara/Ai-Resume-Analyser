import {Link} from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import {useEffect, useState} from "react";
import {usePuterStore} from "~/lib/puter";
import {APP_CONFIG} from "~/config";

const ResumeCard = ({ resume: { id, companyName, jobTitle, feedback, imagePath, imageUrl } }: { resume: Resume }) => {
    const { fs } = usePuterStore();
    const [resumeUrl, setResumeUrl] = useState('');

    useEffect(() => {
        let createdBlobUrl = '';

        if (imageUrl) {
            setResumeUrl(imageUrl);
            return;
        }

        if (imagePath && APP_CONFIG.PUTER_FS_ENABLED) {
            const loadResume = async () => {
                try {
                    const blob = await fs.read(imagePath);
                    if (!blob) return;
                    createdBlobUrl = URL.createObjectURL(blob);
                    setResumeUrl(createdBlobUrl);
                } catch (err) {
                    console.warn("[ResumeCard] Failed to load image from Puter FS:", err);
                }
            };

            loadResume();
        }

        return () => {
            if (createdBlobUrl) {
                URL.revokeObjectURL(createdBlobUrl);
            }
        };
    }, [imageUrl, imagePath]);

    return (
        <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
            <div className="resume-card-header">
                <div className="flex flex-col gap-2">
                    {companyName && <h2 className="!text-black font-bold break-words">{companyName}</h2>}
                    {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}
                    {!companyName && !jobTitle && <h2 className="!text-black font-bold">Resume</h2>}
                </div>
                <div className="flex-shrink-0">
                    <ScoreCircle score={feedback.overallScore} />
                </div>
            </div>
            {resumeUrl ? (
                <div className="gradient-border animate-in fade-in duration-1000">
                    <div className="w-full h-full">
                        <img
                            src={resumeUrl}
                            alt="resume"
                            className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
                        />
                    </div>
                </div>
            ) : (
                <div className="gradient-border flex-1 flex flex-col items-center justify-center p-6 bg-gray-50/50 rounded-2xl min-h-[300px]">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Analysis Available</span>
                    <span className="text-xs text-gray-400 mt-1">Click to view full review & ATS report</span>
                </div>
            )}
        </Link>
    )
}
export default ResumeCard
