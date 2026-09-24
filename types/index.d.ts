interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    imagePath?: string;
    imageUrl?: string;
    resumePath?: string;
    resumeUrl?: string;
    resumeText?: string;
    jobDescription?: string;
    feedback: Feedback;
    atsResult?: import("../app/lib/atsEngine").AtsResult;
}

interface Feedback {
    overallScore: number;
    ATS: {
        score: number;
        breakdown?: import("../app/lib/atsEngine").AtsBreakdown;
        tips: {
            type: "good" | "improve";
            tip: string;
        }[];
    };
    atsResult?: import("../app/lib/atsEngine").AtsResult;
    toneAndStyle: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    content: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    structure: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
    skills: {
        score: number;
        tips: {
            type: "good" | "improve";
            tip: string;
            explanation: string;
        }[];
    };
}
