import { parseJobDescription, matchSkillsAgainstResume, type ParsedJobDescription, type JdSkillMatchResult, type JdSeniorityMetadata, type SkillGapAnalysis } from "./jdParser";
import { runAlignmentDiagnostics, type AlignmentDiagnosticsResult } from "./alignmentDiagnostics";
/**
 * Deterministic ATS Scoring Engine (Calibrated)
 *
 * Evaluates resumes against job descriptions using transparent, mathematical,
 * rule-based criteria across 4 calibrated categories:
 * 1. JD Keyword & Skill Match (40 points max)
 * 2. Experience & Content Quality (25 points max, with Relevance Scaling)
 * 3. Resume Structure (20 points max, verifying section content substance)
 * 4. ATS Parseability (15 points max, contact info, dates, length, clean text)
 *
 * Total Score = 100 points max.
 *
 * Guaranteed properties:
 * - 100% deterministic (no AI, no random numbers, no external calls).
 * - Same inputs always yield the exact same outputs.
 * - Integer scores between 0 and 100.
 */

export interface AtsBreakdown {
    keywordMatch: number;   // Max 40
    structure: number;      // Max 20
    parseability: number;   // Max 15
    content: number;        // Max 25
}

export interface KeywordStats {
    total: number;
    matched: number;
    missing: number;
    matchPercentage: number;
    requiredTotal?: number;
    requiredMatched?: number;
    requiredCoveragePct?: number;
    preferredTotal?: number;
    preferredMatched?: number;
    preferredCoveragePct?: number;
}

export interface AtsSignals {
    email: boolean;
    phone: boolean;
    linkedin: boolean;
    github: boolean;
    quantifiedAchievements: number;
    actionVerbs: number;
}

export interface AtsResult {
    overallScore: number;
    atsScore: number;
    breakdown: AtsBreakdown;
    keywordStats: KeywordStats;
    matchedKeywords: string[];
    missingKeywords: string[];
    detectedSections: string[];
    missingSections: string[];
    signals: AtsSignals;
    tips: string[];
    parsedJd?: ParsedJobDescription;
    matchResult?: JdSkillMatchResult;
    seniority?: JdSeniorityMetadata;
    gapAnalysis?: SkillGapAnalysis;
    diagnostics?: AlignmentDiagnosticsResult;
}

/**
 * Standard technical skills, frameworks, tools, and domain keywords dictionary.
 * Ambiguous single-character and common-word aliases (node, next, cv, go, r, c)
 * have been restricted to strict contextual/multi-word patterns to prevent false positives.
 */
export const TECH_KEYWORDS_DICTIONARY: { display: string; aliases: string[] }[] = [
    // Programming Languages (Contextualized to avoid false matches)
    { display: "Python", aliases: ["python", "python3"] },
    { display: "C++", aliases: ["c++", "cpp"] },
    { display: "C", aliases: ["c programming", "c language", "c/c++", "ansi c", "\\bc programming\\b"] },
    { display: "Java", aliases: ["java", "core java"] },
    { display: "JavaScript", aliases: ["javascript", "js", "ecmascript"] },
    { display: "TypeScript", aliases: ["typescript", "ts"] },
    { display: "Go", aliases: ["golang", "\\bgo programming\\b", "\\bgo language\\b", "\\bgo-lang\\b"] },
    { display: "Rust", aliases: ["rust", "rustlang"] },
    { display: "C#", aliases: ["c#", "csharp", ".net", "dotnet"] },
    { display: "PHP", aliases: ["php"] },
    { display: "Ruby", aliases: ["ruby", "rails", "ruby on rails"] },
    { display: "Swift", aliases: ["swift"] },
    { display: "Kotlin", aliases: ["kotlin"] },
    { display: "Scala", aliases: ["scala"] },
    { display: "R", aliases: ["r language", "r programming", "r-lang", "\\br programming\\b"] },
    { display: "SQL", aliases: ["sql", "structured query language"] },
    { display: "Bash/Shell", aliases: ["bash", "shell scripting", "shell", "sh"] },
    { display: "HTML/CSS", aliases: ["html", "html5", "css", "css3"] },

    // AI / Machine Learning / Data Science
    { display: "Machine Learning", aliases: ["machine learning", "\\bml\\b"] },
    { display: "Deep Learning", aliases: ["deep learning", "\\bdl\\b"] },
    { display: "Large Language Models", aliases: ["large language models", "llm", "llms"] },
    { display: "NLP", aliases: ["natural language processing", "nlp"] },
    { display: "Computer Vision", aliases: ["computer vision", "opencv", "\\bvision models\\b"] },
    { display: "PyTorch", aliases: ["pytorch"] },
    { display: "TensorFlow", aliases: ["tensorflow", "tf"] },
    { display: "Scikit-Learn", aliases: ["scikit-learn", "sklearn"] },
    { display: "Pandas", aliases: ["pandas"] },
    { display: "NumPy", aliases: ["numpy"] },
    { display: "Keras", aliases: ["keras"] },
    { display: "RAG", aliases: ["retrieval-augmented generation", "retrieval augmented generation", "\\brag\\b"] },
    { display: "Vector Search", aliases: ["vector search", "vector database", "vector db", "vector embeddings"] },
    { display: "Embeddings", aliases: ["embeddings", "embedding"] },
    { display: "LangChain", aliases: ["langchain"] },
    { display: "LlamaIndex", aliases: ["llamaindex", "llama-index"] },
    { display: "Ollama", aliases: ["ollama"] },
    { display: "HNSW", aliases: ["hnsw"] },
    { display: "FAISS", aliases: ["faiss"] },
    { display: "Pinecone", aliases: ["pinecone"] },
    { display: "Milvus", aliases: ["milvus"] },
    { display: "Data Science", aliases: ["data science", "data scientist"] },
    { display: "MLOps", aliases: ["mlops", "model deployment", "model serving"] },
    { display: "Transformers", aliases: ["transformers", "hugging face", "huggingface", "bert", "gpt"] },
    { display: "Neural Networks", aliases: ["neural networks", "cnn", "rnn", "lstm"] },

    // Cloud & Infrastructure
    { display: "AWS", aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"] },
    { display: "Azure", aliases: ["azure", "microsoft azure"] },
    { display: "GCP", aliases: ["gcp", "google cloud", "google cloud platform"] },
    { display: "Docker", aliases: ["docker", "containerization", "containers"] },
    { display: "Kubernetes", aliases: ["kubernetes", "k8s"] },
    { display: "Terraform", aliases: ["terraform", "iac", "infrastructure as code"] },
    { display: "CI/CD", aliases: ["ci/cd", "ci-cd", "continuous integration", "continuous deployment"] },
    { display: "GitHub Actions", aliases: ["github actions", "gitlab ci", "jenkins"] },
    { display: "Linux", aliases: ["linux", "unix", "ubuntu", "debian", "centos"] },
    { display: "Nginx", aliases: ["nginx", "apache"] },
    { display: "Prometheus", aliases: ["prometheus", "grafana", "monitoring", "datadog"] },
    { display: "Helm", aliases: ["helm"] },
    { display: "Microservices", aliases: ["microservices", "microservice architecture"] },

    // Backend & Databases (Node.js strictly separated from generic "node")
    { display: "Node.js", aliases: ["node.js", "nodejs", "\\bnode\\.js\\b"] },
    { display: "Express", aliases: ["express.js", "\\bexpress\\.js\\b", "expressjs", "express framework", "express server"] },
    { display: "Django", aliases: ["django"] },
    { display: "Flask", aliases: ["flask"] },
    { display: "FastAPI", aliases: ["fastapi"] },
    { display: "Spring Boot", aliases: ["spring boot", "spring framework", "spring"] },
    { display: "PostgreSQL", aliases: ["postgresql", "postgres"] },
    { display: "MySQL", aliases: ["mysql"] },
    { display: "MongoDB", aliases: ["mongodb", "mongo"] },
    { display: "Redis", aliases: ["redis"] },
    { display: "SQLite", aliases: ["sqlite"] },
    { display: "Cassandra", aliases: ["cassandra"] },
    { display: "DynamoDB", aliases: ["dynamodb"] },
    { display: "GraphQL", aliases: ["graphql"] },
    { display: "REST APIs", aliases: ["rest api", "rest apis", "restful", "restful apis"] },
    { display: "gRPC", aliases: ["grpc"] },
    { display: "Kafka", aliases: ["kafka", "apache kafka"] },
    { display: "RabbitMQ", aliases: ["rabbitmq"] },

    // Frontend (Next.js strictly separated from generic "next")
    { display: "React", aliases: ["react", "react.js", "reactjs"] },
    { display: "Next.js", aliases: ["next.js", "nextjs", "\\bnext\\.js\\b"] },
    { display: "Vue.js", aliases: ["vue", "vue.js", "vuejs"] },
    { display: "Angular", aliases: ["angular", "angularjs"] },
    { display: "Svelte", aliases: ["svelte", "sveltekit"] },
    { display: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
    { display: "Redux", aliases: ["redux", "redux toolkit"] },
    { display: "Vite", aliases: ["vite", "webpack"] },

    // Cybersecurity
    { display: "SIEM", aliases: ["siem", "splunk", "qradar"] },
    { display: "SOC", aliases: ["soc", "security operations center"] },
    { display: "Penetration Testing", aliases: ["penetration testing", "pen testing", "pentest", "ethical hacking"] },
    { display: "Vulnerability Assessment", aliases: ["vulnerability assessment", "vulnerability management", "cve"] },
    { display: "Wireshark", aliases: ["wireshark", "nmap", "tcpdump"] },
    { display: "Metasploit", aliases: ["metasploit", "burp suite", "burpsuite"] },
    { display: "Cryptography", aliases: ["cryptography", "encryption", "pki", "tls", "ssl"] },
    { display: "Firewalls", aliases: ["firewalls", "firewall", "ids", "ips"] },
    { display: "Incident Response", aliases: ["incident response", "digital forensics", "dfir"] },
    { display: "Threat Modeling", aliases: ["threat modeling", "threat intelligence"] },
    { display: "CISSP/Security+", aliases: ["cissp", "ceh", "comptia security+", "security+"] },
    { display: "OWASP", aliases: ["owasp", "owasp top 10", "appsec", "application security"] },
    { display: "Zero Trust", aliases: ["zero trust", "network security", "iam", "identity access management"] },

    // Core CS Concepts & Practices
    { display: "Data Structures & Algorithms", aliases: ["data structures", "algorithms", "dsa"] },
    { display: "OOP", aliases: ["oop", "object-oriented programming", "object oriented programming"] },
    { display: "System Design", aliases: ["system design", "distributed systems", "high availability"] },
    { display: "Operating Systems", aliases: ["operating systems", "os concepts"] },
    { display: "DBMS", aliases: ["dbms", "database management", "database design"] },
    { display: "Agile / Scrum", aliases: ["agile", "scrum", "kanban", "sprint planning"] },
    { display: "Unit Testing / TDD", aliases: ["unit testing", "tdd", "test driven development", "jest", "pytest"] },
    { display: "Git / Version Control", aliases: ["git", "github", "gitlab", "version control"] },
];

/**
 * Standard resume section definitions with minimum word counts for content verification.
 */
const RESUME_SECTIONS = [
    {
        name: "Experience",
        // Explicit student/work hybrid headers, avoiding bare "TRAINING"
        pattern: /(?:^|\n)[ \t]*(?:work\s+experience|professional\s+experience|employment\s+history|experience\s*(?:&|and|\/)\s*practical\s+training|experience\s*(?:&|and|\/)\s*training|internships?\s*(?:&|and|\/)\s*training|practical\s+training|industrial\s+training|vocational\s+training|internships?|experience|work\s+history)[ \t]*(?:\n|:)/im,
        isCore: true,
        points: 4,
        minWords: 25,
    },
    {
        name: "Skills",
        pattern: /(?:^|\n)[ \t]*(?:technical\s+skills|core\s+skills|skills\s+&(?:amp;)?\s+technologies|technologies|skills|competencies)[ \t]*(?:\n|:)/im,
        isCore: true,
        points: 4,
        minWords: 8,
    },
    {
        name: "Education",
        pattern: /(?:^|\n)[ \t]*(?:education|academic\s+background|academic\s+qualifications|academics|degrees)[ \t]*(?:\n|:)/im,
        isCore: true,
        points: 3,
        minWords: 8,
    },
    {
        name: "Projects",
        pattern: /(?:^|\n)[ \t]*(?:projects|key\s+projects|personal\s+projects|academic\s+projects|notable\s+projects)[ \t]*(?:\n|:)/im,
        isCore: true,
        points: 3,
        minWords: 15,
    },
    {
        name: "Achievements",
        pattern: /(?:^|\n)[ \t]*(?:achievements|awards|honors|accomplishments|publications)[ \t]*(?:\n|:)/im,
        isCore: false,
        points: 2.5,
        minWords: 6,
    },
    {
        name: "Certifications",
        pattern: /(?:^|\n)[ \t]*(?:certifications|licenses|professional\s+certifications|certificates|accreditations)[ \t]*(?:\n|:)/im,
        isCore: false,
        points: 2.5,
        minWords: 6,
    },
    {
        name: "Summary / Objective",
        pattern: /(?:^|\n)[ \t]*(?:professional\s+summary|executive\s+summary|summary|profile|about\s+me|career\s+objective|objective)[ \t]*(?:\n|:)/im,
        isCore: false,
        points: 2.0,
        minWords: 12,
    },
    {
        name: "Relevant Coursework",
        pattern: /(?:^|\n)[ \t]*(?:relevant\s+coursework|coursework|courses)[ \t]*(?:\n|:)/im,
        isCore: false,
        points: 1.5,
        minWords: 6,
    },
];

/**
 * Action verbs denoting technical implementation and measurable achievements.
 */
export const ACTION_VERBS = [
    "developed", "engineered", "designed", "implemented", "architected",
    "built", "optimized", "deployed", "created", "led", "spearheaded",
    "managed", "automated", "reduced", "increased", "scaled", "integrated",
    "solved", "delivered", "trained", "fine-tuned", "evaluated", "benchmarked",
    "maintained", "established", "transformed", "migrated", "refactored",
    "analyzed", "collaborated", "launched", "orchestrated", "configured",
    "monitored", "resolved", "accelerated", "streamlined", "published",
    "authored", "researched", "generated", "customized", "extracted",
    "formulated", "enhanced", "improved", "secured", "audited", "tested",
    "validated", "debugged", "modeled", "visualized", "drove", "pioneered"
];

/**
 * Checks if a pattern matches within text using word boundaries.
 */
function containsKeyword(text: string, pattern: string): boolean {
    try {
        if (pattern.includes("\\b")) {
            const rx = new RegExp(pattern, "i");
            return rx.test(text);
        }
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rx = new RegExp(`(^|[^a-zA-Z0-9_#+-])${escaped}([^a-zA-Z0-9_#+-]|$)`, "i");
        return rx.test(text);
    } catch {
        return text.toLowerCase().includes(pattern.toLowerCase());
    }
}

/**
 * Category 1: JD Keyword & Skill Match (Max 40 points)
 *
 * Implements Phase 7.2 Strict Core Gated 80/20 Model using deterministic
 * JD parsing from jdParser.ts:
 * - Required skills provide 80% of effective keyword weight.
 * - Preferred skills provide 20% of effective keyword weight.
 * - Gating: If required coverage is < 50%, preferred contribution is discounted:
 *     prefMultiplier = max(0, covReq / 0.50)
 *     gatedCovPref = covPref * prefMultiplier
 *     (If covReq === 0, gatedCovPref === 0, ensuring preferred skills cannot save
 *      a candidate who has 0 required skills).
 * - If no preferred skills are specified in the JD, required skills carry 100% budget.
 * - If no required skills exist, preferred skills are capped at max 40% credit.
 * - Short-JD depth factor prevents 1-2 skill JDs from automatically scoring 40/40.
 * - Duplicate skills in JD and title are deduplicated by canonical skill ID.
 */
function evaluateKeywords(resumeText: string, jobDescription: string, jobTitle: string) {
    const parsedJd = parseJobDescription(jobDescription, jobTitle);
    const matchResult = matchSkillsAgainstResume(parsedJd, resumeText);

    const totalR = parsedJd.requiredSkills.length;
    const totalP = parsedJd.preferredSkills.length;
    const covR = matchResult.coverageRequiredPct / 100.0;
    const covP = matchResult.coveragePreferredPct / 100.0;

    // Strict Core Gated 80/20 Model
    const prefMultiplier = covR < 0.50 ? Math.max(0, covR / 0.50) : 1.0;
    const gatedCovP = covP * prefMultiplier;

    let effCov: number;
    if (totalR === 0 && totalP === 0) {
        effCov = 1.0;
    } else if (totalP === 0) {
        effCov = covR;
    } else if (totalR === 0) {
        effCov = 0.40 * covP;
    } else {
        effCov = 0.80 * covR + 0.20 * gatedCovP;
    }

    // Short-JD depth dampener based on effective total skills
    const effTotal = totalR + 0.5 * totalP;
    const depthFactor = effTotal > 0 ? Math.min(1.0, 0.35 + 0.65 * (effTotal / 8.0)) : 1.0;

    // Weighted Score: 40 points max
    const keywordScore = Math.min(40, Math.max(0, Math.round(effCov * depthFactor * 40)));

    // Effective match percentage passed to content relevance scaling
    const matchPercentage = (totalR === 0 && totalP === 0) ? 100 : Math.round(effCov * 100);

    // Prioritized list: Required matched first, then Preferred matched
    const matchedKeywords: string[] = [
        ...matchResult.matchedRequired.map((s) => s.display),
        ...matchResult.matchedPreferred.map((s) => s.display),
    ];

    // Missing list: Critical missing required first, then missing preferred
    const missingKeywords: string[] = [
        ...matchResult.missingRequired.map((s) => s.display),
        ...matchResult.missingPreferred.map((s) => s.display),
    ];

    const total = parsedJd.allSkills.length;
    const matched = matchedKeywords.length;
    const missing = missingKeywords.length;

    return {
        score: keywordScore,
        stats: {
            total,
            matched,
            missing,
            matchPercentage,
            requiredTotal: totalR,
            requiredMatched: matchResult.matchedRequired.length,
            requiredCoveragePct: matchResult.coverageRequiredPct,
            preferredTotal: totalP,
            preferredMatched: matchResult.matchedPreferred.length,
            preferredCoveragePct: matchResult.coveragePreferredPct,
        },
        matchedKeywords,
        missingKeywords,
        parsedJd,
        matchResult,
    };
}

/**
 * Category 2: Resume Structure Analysis (Max 20 points)
 *
 * Checks both heading presence AND substantive content under each section.
 */
function evaluateStructure(resumeText: string) {
    const detectedSections: string[] = [];
    const missingSections: string[] = [];
    let corePoints = 0;
    let secondaryPoints = 0;

    for (const section of RESUME_SECTIONS) {
        const match = section.pattern.exec(resumeText);
        if (match) {
            detectedSections.push(section.name);
            // Verify substantive content following the header (inspect next 400 characters)
            const startPos = match.index + match[0].length;
            const followingChunk = resumeText.slice(startPos, startPos + 400).trim();
            const wordsInChunk = followingChunk.split(/\s+/).filter((w) => /\w{2,}/.test(w)).length;

            let earnedPoints = 0;
            if (wordsInChunk >= section.minWords) {
                earnedPoints = section.points; // Full credit
            } else if (wordsInChunk > 0) {
                earnedPoints = section.points * 0.5; // Partial credit for thin section
            }

            if (section.isCore) {
                corePoints += earnedPoints;
            } else {
                secondaryPoints += earnedPoints;
            }
        } else {
            missingSections.push(section.name);
        }
    }

    // Core max: 14 pts (Experience: 4, Skills: 4, Education: 3, Projects: 3)
    // Secondary max: 6 pts (Summary: 2, Certs: 1.5, Achievements: 1.5, Coursework: 1)
    const totalRaw = corePoints + Math.min(6, secondaryPoints);
    const structureScore = Math.min(20, Math.max(0, Math.round(totalRaw)));

    return {
        score: structureScore,
        detectedSections,
        missingSections,
    };
}

/**
 * Category 3: ATS Parseability Signals (Max 15 points)
 *
 * 1. Contact Information: 5 pts
 * 2. Date / Timeline Parseability: 4 pts
 * 3. Document Length / Word Density: 3 pts
 * 4. Standard Headers + Clean Text: 3 pts
 */
function evaluateParseability(resumeText: string) {
    let score = 0;

    // 1. Contact Information: 5 pts max
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,14}/;
    const linkedinRegex = /(?:linkedin\.com\/(?:in|company)\/|[\s|]linkedin[\s:|])/i;
    const githubRegex = /(?:github\.com\/|[\s|]github[\s:|])/i;

    const hasEmail = emailRegex.test(resumeText);
    const hasPhone = phoneRegex.test(resumeText);
    const hasLinkedin = linkedinRegex.test(resumeText);
    const hasGithub = githubRegex.test(resumeText);

    if (hasEmail) score += 2;
    if (hasPhone) score += 1;
    if (hasLinkedin) score += 1;
    if (hasGithub) score += 1;

    // 2. Date / Timeline Parseability: 4 pts max
    const dateRangePattern = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ '\’]*\d{2,4}\s*(?:–|-|to)\s*(?:present|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[ '\’]*\d{2,4}|\d{4})\b|\b(19\d\d|20\d\d)\s*(?:–|-|to)\s*(?:present|19\d\d|20\d\d)\b/gi;
    const dateMatches = resumeText.match(dateRangePattern) || [];
    const uniqueDateCount = new Set(dateMatches.map((d) => d.toLowerCase().trim())).size;

    if (uniqueDateCount >= 3) {
        score += 4;
    } else if (uniqueDateCount === 2) {
        score += 2;
    } else if (uniqueDateCount === 1) {
        score += 1;
    }

    // 3. Document Length / Word Density: 3 pts max
    const words = resumeText.trim().split(/\s+/).filter(Boolean).length;
    if (words >= 350 && words <= 1100) {
        score += 3; // Ideal technical resume length
    } else if (words >= 250 && words < 350) {
        score += 2; // Acceptable brevity
    } else if (words >= 120 && words < 250) {
        score += 1;
    }

    // 4. Standard Headers + Clean Text: 3 pts max
    const standardHeadings = ["experience", "education", "skills", "projects", "summary"];
    let detectedHeadingCount = 0;
    for (const h of standardHeadings) {
        if (new RegExp(`(?:^|\\n)[ \\t]*${h}`, "i").test(resumeText)) {
            detectedHeadingCount++;
        }
    }
    if (detectedHeadingCount >= 4) {
        score += 2;
    } else if (detectedHeadingCount >= 2) {
        score += 1;
    }

    const hasExcessiveRepetition = /(.)\1{7,}/.test(resumeText);
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/.test(resumeText);
    if (!hasExcessiveRepetition && !hasControlChars) {
        score += 1;
    }

    const parseabilityScore = Math.min(15, Math.max(0, Math.round(score)));

    return {
        score: parseabilityScore,
        signals: {
            email: hasEmail,
            phone: hasPhone,
            linkedin: hasLinkedin,
            github: hasGithub,
        },
        wordCount: words,
        dateCount: uniqueDateCount,
    };
}

/**
 * Category 4: Experience & Content Quality (Max 25 points)
 *
 * 1. Evidence-backed / XYZ Impact Statements (Action Verb + Number in same bullet): 10 pts
 * 2. Action verbs at the beginning of accomplishment bullets: 5 pts
 * 3. Technical depth / domain specificity: 6 pts
 * 4. Structured accomplishment bullets: 4 pts
 *
 * Raw Content (Max 25) is scaled by the Relevance Gate:
 * Content Score = Raw Content * (0.4 + 0.6 * keywordMatchPercentage / 100)
 */
function evaluateContent(resumeText: string, keywordMatchPercentage: number) {
    const lines = resumeText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    let impactStatementsCount = 0;
    let verbsAtStartCount = 0;
    let validBulletsCount = 0;

    // Pattern for quantifiable metrics: percentages, dollar values, multipliers, latency, user counts
    const metricPattern = /(?:\d+(?:\.\d+)?%|\$\s*\d+|\b\d+(?:\.\d+)?x\b|\b\d+\s*ms\b|\b\d{2,}\+?\s*(?:users|clients|customers|members|endpoints|tests|queries|requests|models|datasets|features|stars|qps|rps|engineers|chefs|guests))/i;

    for (const line of lines) {
        const isBullet = /^[•*\-–\d+.]\s+/.test(line) || (line.length > 35 && ACTION_VERBS.some((v) => line.toLowerCase().startsWith(v)));
        if (isBullet && line.length >= 40) {
            validBulletsCount++;
        }

        // Check if line begins with an action verb (after stripping bullet markers)
        const strippedLine = line.replace(/^[•*\-–\d+.]\s+/, "").toLowerCase();
        const startsWithVerb = ACTION_VERBS.some((verb) => strippedLine.startsWith(verb));
        if (startsWithVerb) {
            verbsAtStartCount++;
        }

        // An action verb and a quantifiable metric must be meaningfully associated with the SAME line
        const hasActionVerb = ACTION_VERBS.some((verb) => containsKeyword(strippedLine, verb));
        const hasMetric = metricPattern.test(line);
        if (hasActionVerb && hasMetric) {
            impactStatementsCount++;
        }
    }

    // 1. Evidence-backed / XYZ Impact Statements (Max 10 pts)
    let impactPoints = 0;
    if (impactStatementsCount >= 5) impactPoints = 10;
    else if (impactStatementsCount >= 4) impactPoints = 8;
    else if (impactStatementsCount >= 3) impactPoints = 6;
    else if (impactStatementsCount >= 2) impactPoints = 4;
    else if (impactStatementsCount >= 1) impactPoints = 2;

    // 2. Action Verbs at the beginning of accomplishment bullets (Max 5 pts)
    let verbStartPoints = 0;
    if (verbsAtStartCount >= 5) verbStartPoints = 5;
    else if (verbsAtStartCount >= 3) verbStartPoints = 3;
    else if (verbsAtStartCount >= 2) verbStartPoints = 2;
    else if (verbsAtStartCount >= 1) verbStartPoints = 1;

    // 3. Technical Depth & Domain Specificity (Max 6 pts)
    let techEntitiesCount = 0;
    for (const entry of TECH_KEYWORDS_DICTIONARY) {
        if (entry.aliases.some((alias) => containsKeyword(resumeText, alias))) {
            techEntitiesCount++;
        }
    }

    let techPoints = 0;
    if (techEntitiesCount >= 15) techPoints = 6;
    else if (techEntitiesCount >= 10) techPoints = 4;
    else if (techEntitiesCount >= 5) techPoints = 2;

    // 4. Structured Accomplishment Bullets (Max 4 pts)
    let bulletPoints = 0;
    if (validBulletsCount >= 6) bulletPoints = 4;
    else if (validBulletsCount >= 4) bulletPoints = 3;
    else if (validBulletsCount >= 2) bulletPoints = 2;
    else if (validBulletsCount >= 1) bulletPoints = 1;

    const rawContentScore = Math.min(25, impactPoints + verbStartPoints + techPoints + bulletPoints);

    // Apply Relevance Scaling: Raw Content * (0.4 + 0.6 * keywordMatchPercentage / 100)
    const relevanceFactor = 0.4 + 0.6 * (keywordMatchPercentage / 100.0);
    const scaledContentScore = Math.min(25, Math.max(0, Math.round(rawContentScore * relevanceFactor)));

    return {
        score: scaledContentScore,
        rawScore: rawContentScore,
        impactStatementsCount,
        verbsAtStartCount,
        techEntitiesCount,
        validBulletsCount,
    };
}

/**
 * Generates actionable, deterministic tips derived directly from missing criteria.
 */
function generateTips(
    breakdown: AtsBreakdown,
    missingKeywords: string[],
    matchedKeywords: string[],
    signals: AtsSignals,
    missingSections: string[],
    gapAnalysis?: SkillGapAnalysis
): string[] {
    const tips: string[] = [];

    // Keyword tips
    if (missingKeywords.length > 0) {
        const topMissing = missingKeywords.slice(0, 5).join(", ");
        tips.push(`Incorporate key target skills from the job description: ${topMissing}.`);
    } else if (matchedKeywords.length >= 8) {
        tips.push(`Excellent technical alignment: matched ${matchedKeywords.length} core job competencies.`);
    }

    // Phase 7.3: Evidence Gap tips (skills listed in Skills section without project/work evidence)
    if (gapAnalysis && gapAnalysis.evidenceGaps && gapAnalysis.evidenceGaps.length > 0) {
        const topEvidenceGaps = gapAnalysis.evidenceGaps
            .filter(eg => eg.skill.tier === "required")
            .slice(0, 3)
            .map(eg => eg.skill.display);
        if (topEvidenceGaps.length > 0) {
            tips.push(`Demonstrate practical implementation bullets for skills currently only listed in your Skills section: ${topEvidenceGaps.join(", ")}.`);
        }
    }

    // Contact info tips
    if (!signals.email) {
        tips.push("Add a professional email address for recruiter outreach.");
    }
    if (!signals.phone) {
        tips.push("Include a valid contact telephone number.");
    }
    if (!signals.linkedin) {
        tips.push("Include a LinkedIn profile link to verify your professional background.");
    }
    if (!signals.github) {
        tips.push("Include a GitHub or portfolio URL to demonstrate your technical projects.");
    }

    // Section tips
    if (missingSections.includes("Experience")) {
        tips.push("Add an Experience / Work History section with chronological roles and achievements.");
    }
    if (missingSections.includes("Projects")) {
        tips.push("Include a dedicated Projects section showcasing your practical software implementations.");
    }
    if (missingSections.includes("Skills")) {
        tips.push("Organize your technical proficiencies in a distinct Skills section for faster ATS indexing.");
    }

    // Content tips
    if (signals.quantifiedAchievements < 3) {
        tips.push("Pair action verbs with quantifiable metrics (e.g., % latency reduced, $ saved, user scale).");
    }
    if (signals.actionVerbs < 4) {
        tips.push("Begin each accomplishment bullet with an active verb (e.g., Engineered, Architected, Optimized).");
    }

    if (tips.length === 0) {
        tips.push("Outstanding ATS formatting, parseability, and keyword alignment across all benchmarks.");
    }

    return tips;
}

/**
 * Main Deterministic ATS Scoring Function
 *
 * @param resumeText Extracted full text from the resume
 * @param jobDescription Target job description text
 * @param jobTitle Target job title
 * @returns Calibrated deterministic ATS evaluation results
 */
export function calculateAtsScore(
    resumeText: string,
    jobDescription: string,
    jobTitle: string
): AtsResult {
    if (!resumeText || !resumeText.trim()) {
        return {
            overallScore: 0,
            atsScore: 0,
            breakdown: { keywordMatch: 0, structure: 0, parseability: 0, content: 0 },
            keywordStats: { total: 0, matched: 0, missing: 0, matchPercentage: 0 },
            matchedKeywords: [],
            missingKeywords: [],
            detectedSections: [],
            missingSections: RESUME_SECTIONS.map((s) => s.name),
            signals: {
                email: false,
                phone: false,
                linkedin: false,
                github: false,
                quantifiedAchievements: 0,
                actionVerbs: 0,
            },
            tips: ["Please upload a valid resume with readable text content."],
        };
    }

    // 1. JD Keyword Match (Max 40)
    const keywordResult = evaluateKeywords(resumeText, jobDescription, jobTitle);

    // 2. Resume Structure (Max 20)
    const structureResult = evaluateStructure(resumeText);

    // 3. ATS Parseability (Max 15)
    const parseabilityResult = evaluateParseability(resumeText);

    // 4. Experience & Content Quality (Max 25, with Relevance Scaling)
    const contentResult = evaluateContent(resumeText, keywordResult.stats.matchPercentage);

    const breakdown: AtsBreakdown = {
        keywordMatch: keywordResult.score,
        structure: structureResult.score,
        parseability: parseabilityResult.score,
        content: contentResult.score,
    };

    // Calculate overall score (sum of breakdown: 40 + 20 + 15 + 25 = 100 max)
    const overallScore = Math.min(
        100,
        Math.max(0, Math.round(breakdown.keywordMatch + breakdown.structure + breakdown.parseability + breakdown.content))
    );

    const signals: AtsSignals = {
        email: parseabilityResult.signals.email,
        phone: parseabilityResult.signals.phone,
        linkedin: parseabilityResult.signals.linkedin,
        github: parseabilityResult.signals.github,
        quantifiedAchievements: contentResult.impactStatementsCount,
        actionVerbs: contentResult.verbsAtStartCount,
    };

    const diagnostics = (keywordResult.parsedJd && keywordResult.matchResult)
        ? runAlignmentDiagnostics(resumeText, keywordResult.parsedJd, keywordResult.matchResult)
        : undefined;

    const tips = generateTips(
        breakdown,
        keywordResult.missingKeywords,
        keywordResult.matchedKeywords,
        signals,
        structureResult.missingSections,
        keywordResult.matchResult?.gapAnalysis
    );

    return {
        overallScore,
        atsScore: overallScore,
        breakdown,
        keywordStats: keywordResult.stats,
        matchedKeywords: keywordResult.matchedKeywords,
        missingKeywords: keywordResult.missingKeywords,
        detectedSections: structureResult.detectedSections,
        missingSections: structureResult.missingSections,
        signals,
        tips,
        parsedJd: keywordResult.parsedJd,
        matchResult: keywordResult.matchResult,
        seniority: keywordResult.parsedJd?.seniority,
        gapAnalysis: keywordResult.matchResult?.gapAnalysis,
        diagnostics,
    };
}
