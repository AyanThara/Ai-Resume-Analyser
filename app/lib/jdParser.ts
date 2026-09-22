/**
 * Phase 7.1: Advanced Job Description Intelligence Layer
 *
 * Deterministic, rule-based JD parser that extracts technical competencies,
 * classifies them into standard categories, and segments them by requirement
 * importance (Required vs. Preferred / Nice-to-have).
 *
 * Purely deterministic: Zero LLM / external API calls.
 */

export type SkillCategory =
    | "programming_language"
    | "framework_library"
    | "tool_platform"
    | "cs_concept"
    | "domain_specific"
    | "certification";

export type RequirementTier = "required" | "preferred";

export type SeniorityLevel =
    | "intern"
    | "entry_level"
    | "junior"
    | "mid_level"
    | "senior"
    | "lead"
    | "manager"
    | "unspecified";

export interface JdSeniorityMetadata {
    detectedLevel: SeniorityLevel;
    confidence: "high" | "medium" | "low";
    matchedSignals: string[];
}

export type ResumeSectionName =
    | "Experience"
    | "Skills"
    | "Projects"
    | "Education"
    | "Certifications"
    | "Summary / Objective"
    | "Achievements"
    | "Relevant Coursework"
    | "Other";

export interface ParsedResumeSection {
    name: ResumeSectionName;
    content: string;
    startIndex: number;
    endIndex: number;
}

export type SkillEvidenceLevel = "strong" | "moderate" | "mention_only";

export interface SkillEvidence {
    skill: ExtractedSkill;
    evidenceLevel: SkillEvidenceLevel;
    detectedSections: ResumeSectionName[];
    hasProficiencySignal: boolean;
    matchedPhrases: string[];
    sampleSnippet?: string;
}

export interface SkillGapAnalysis {
    criticalGaps: ExtractedSkill[];     // Missing required skills
    secondaryGaps: ExtractedSkill[];    // Missing preferred skills
    evidenceGaps: SkillEvidence[];      // Matched skills with weak/no contextual evidence
}

export interface SkillDefinition {
    id: string;
    display: string;
    category: SkillCategory;
    aliases: string[];
}

export interface ExtractedSkill {
    id: string;
    display: string;
    category: SkillCategory;
    tier: RequirementTier;
    matchedAlias: string;
    contextSentence: string;
}

export interface ParsedJobDescription {
    rawText: string;
    jobTitle: string;
    requiredSkills: ExtractedSkill[];
    preferredSkills: ExtractedSkill[];
    allSkills: ExtractedSkill[];
    skillsByCategory: Record<SkillCategory, ExtractedSkill[]>;
    sectionsDetected: {
        required: boolean;
        preferred: boolean;
    };
    seniority: JdSeniorityMetadata;
}

/**
 * Standardized Technical Skills Taxonomy with categorized entries and strict aliases.
 */
export const SKILLS_TAXONOMY: SkillDefinition[] = [
    // -------------------------------------------------------------------------
    // 1. Programming Languages
    // -------------------------------------------------------------------------
    {
        id: "python",
        display: "Python",
        category: "programming_language",
        aliases: ["python", "python3", "python2"]
    },
    {
        id: "cpp",
        display: "C++",
        category: "programming_language",
        aliases: ["c++", "cpp"]
    },
    {
        id: "c",
        display: "C",
        category: "programming_language",
        // Strict multi-word aliases to prevent false single-letter matches
        aliases: ["c programming", "c language", "c/c++", "ansi c", "core c"]
    },
    {
        id: "java",
        display: "Java",
        category: "programming_language",
        aliases: ["java", "core java"]
    },
    {
        id: "javascript",
        display: "JavaScript",
        category: "programming_language",
        aliases: ["javascript", "\\bjs\\b", "ecmascript"]
    },
    {
        id: "typescript",
        display: "TypeScript",
        category: "programming_language",
        aliases: ["typescript", "\\bts\\b"]
    },
    {
        id: "golang",
        display: "Go",
        category: "programming_language",
        // Strict aliases: Never match bare "go"
        aliases: ["golang", "\\bgo programming\\b", "\\bgo language\\b", "\\bgo-lang\\b"]
    },
    {
        id: "rust",
        display: "Rust",
        category: "programming_language",
        aliases: ["rust", "rustlang"]
    },
    {
        id: "csharp",
        display: "C#",
        category: "programming_language",
        aliases: ["c#", "csharp", ".net", "dotnet"]
    },
    {
        id: "php",
        display: "PHP",
        category: "programming_language",
        aliases: ["php"]
    },
    {
        id: "ruby",
        display: "Ruby",
        category: "programming_language",
        aliases: ["ruby", "ruby on rails", "rails"]
    },
    {
        id: "swift",
        display: "Swift",
        category: "programming_language",
        aliases: ["swift"]
    },
    {
        id: "kotlin",
        display: "Kotlin",
        category: "programming_language",
        aliases: ["kotlin"]
    },
    {
        id: "scala",
        display: "Scala",
        category: "programming_language",
        aliases: ["scala"]
    },
    {
        id: "r",
        display: "R",
        category: "programming_language",
        // Strict multi-word aliases: Never match bare "r"
        aliases: ["r language", "r programming", "r-lang", "\\br language\\b"]
    },
    {
        id: "sql",
        display: "SQL",
        category: "programming_language",
        aliases: ["sql", "structured query language"]
    },
    {
        id: "bash",
        display: "Bash/Shell",
        category: "programming_language",
        aliases: ["bash", "shell scripting", "shell script", "\\bsh\\b"]
    },
    {
        id: "html_css",
        display: "HTML/CSS",
        category: "programming_language",
        aliases: ["html", "html5", "css", "css3"]
    },

    // -------------------------------------------------------------------------
    // 2. Frameworks & Libraries
    // -------------------------------------------------------------------------
    {
        id: "pytorch",
        display: "PyTorch",
        category: "framework_library",
        aliases: ["pytorch", "torch"]
    },
    {
        id: "tensorflow",
        display: "TensorFlow",
        category: "framework_library",
        aliases: ["tensorflow", "\\btf\\b"]
    },
    {
        id: "scikit_learn",
        display: "Scikit-Learn",
        category: "framework_library",
        aliases: ["scikit-learn", "scikit learn", "sklearn"]
    },
    {
        id: "pandas",
        display: "Pandas",
        category: "framework_library",
        aliases: ["pandas"]
    },
    {
        id: "numpy",
        display: "NumPy",
        category: "framework_library",
        aliases: ["numpy"]
    },
    {
        id: "keras",
        display: "Keras",
        category: "framework_library",
        aliases: ["keras"]
    },
    {
        id: "opencv",
        display: "OpenCV",
        category: "framework_library",
        aliases: ["opencv", "open-cv"]
    },
    {
        id: "langchain",
        display: "LangChain",
        category: "framework_library",
        aliases: ["langchain"]
    },
    {
        id: "llamaindex",
        display: "LlamaIndex",
        category: "framework_library",
        aliases: ["llamaindex", "llama-index"]
    },
    {
        id: "transformers_hf",
        display: "Transformers",
        category: "framework_library",
        aliases: ["transformers", "hugging face", "huggingface", "hugging-face"]
    },
    {
        id: "react",
        display: "React",
        category: "framework_library",
        aliases: ["react", "react.js", "reactjs"]
    },
    {
        id: "nextjs",
        display: "Next.js",
        category: "framework_library",
        // Strict aliases: Never match bare "next"
        aliases: ["next.js", "nextjs", "\\bnext\\.js\\b", "next js"]
    },
    {
        id: "nodejs",
        display: "Node.js",
        category: "framework_library",
        // Strict aliases: Never match bare "node"
        aliases: ["node.js", "nodejs", "\\bnode\\.js\\b", "node js"]
    },
    {
        id: "vuejs",
        display: "Vue.js",
        category: "framework_library",
        aliases: ["vue", "vue.js", "vuejs"]
    },
    {
        id: "angular",
        display: "Angular",
        category: "framework_library",
        aliases: ["angular", "angularjs"]
    },
    {
        id: "svelte",
        display: "Svelte",
        category: "framework_library",
        aliases: ["svelte", "sveltekit"]
    },
    {
        id: "express",
        display: "Express",
        category: "framework_library",
        // Strict technical aliases to prevent matching ordinary English "express" (e.g., "express interest")
        aliases: ["express.js", "\\bexpress\\.js\\b", "expressjs", "express framework", "express server"]
    },
    {
        id: "django",
        display: "Django",
        category: "framework_library",
        aliases: ["django"]
    },
    {
        id: "flask",
        display: "Flask",
        category: "framework_library",
        aliases: ["flask"]
    },
    {
        id: "fastapi",
        display: "FastAPI",
        category: "framework_library",
        aliases: ["fastapi", "fast-api"]
    },
    {
        id: "spring_boot",
        display: "Spring Boot",
        category: "framework_library",
        aliases: ["spring boot", "spring framework", "\\bspring\\b"]
    },
    {
        id: "tailwind",
        display: "Tailwind CSS",
        category: "framework_library",
        aliases: ["tailwind", "tailwindcss", "tailwind css"]
    },
    {
        id: "redux",
        display: "Redux",
        category: "framework_library",
        aliases: ["redux", "redux toolkit"]
    },

    // -------------------------------------------------------------------------
    // 3. Tools & Platforms
    // -------------------------------------------------------------------------
    {
        id: "docker",
        display: "Docker",
        category: "tool_platform",
        aliases: ["docker", "containerization", "containers"]
    },
    {
        id: "kubernetes",
        display: "Kubernetes",
        category: "tool_platform",
        aliases: ["kubernetes", "k8s"]
    },
    {
        id: "aws",
        display: "AWS",
        category: "tool_platform",
        aliases: ["aws", "amazon web services", "ec2", "s3", "lambda"]
    },
    {
        id: "azure",
        display: "Azure",
        category: "tool_platform",
        aliases: ["azure", "microsoft azure"]
    },
    {
        id: "gcp",
        display: "GCP",
        category: "tool_platform",
        aliases: ["gcp", "google cloud", "google cloud platform"]
    },
    {
        id: "terraform",
        display: "Terraform",
        category: "tool_platform",
        aliases: ["terraform", "iac", "infrastructure as code"]
    },
    {
        id: "git",
        display: "Git / Version Control",
        category: "tool_platform",
        aliases: ["git", "github", "gitlab", "version control"]
    },
    {
        id: "linux",
        display: "Linux",
        category: "tool_platform",
        aliases: ["linux", "unix", "ubuntu", "debian", "centos"]
    },
    {
        id: "nginx",
        display: "Nginx",
        category: "tool_platform",
        aliases: ["nginx", "apache"]
    },
    {
        id: "prometheus",
        display: "Prometheus / Monitoring",
        category: "tool_platform",
        aliases: ["prometheus", "grafana", "monitoring", "datadog"]
    },
    {
        id: "ollama",
        display: "Ollama",
        category: "tool_platform",
        aliases: ["ollama"]
    },
    {
        id: "postgresql",
        display: "PostgreSQL",
        category: "tool_platform",
        aliases: ["postgresql", "postgres"]
    },
    {
        id: "mysql",
        display: "MySQL",
        category: "tool_platform",
        aliases: ["mysql"]
    },
    {
        id: "mongodb",
        display: "MongoDB",
        category: "tool_platform",
        aliases: ["mongodb", "mongo"]
    },
    {
        id: "redis",
        display: "Redis",
        category: "tool_platform",
        aliases: ["redis"]
    },
    {
        id: "kafka",
        display: "Kafka",
        category: "tool_platform",
        aliases: ["kafka", "apache kafka"]
    },
    {
        id: "wireshark",
        display: "Wireshark",
        category: "tool_platform",
        aliases: ["wireshark", "nmap", "tcpdump"]
    },
    {
        id: "metasploit",
        display: "Metasploit",
        category: "tool_platform",
        aliases: ["metasploit", "burp suite", "burpsuite"]
    },

    // -------------------------------------------------------------------------
    // 4. CS Fundamentals & Concepts
    // -------------------------------------------------------------------------
    {
        id: "dsa",
        display: "Data Structures & Algorithms",
        category: "cs_concept",
        aliases: ["data structures", "algorithms", "dsa"]
    },
    {
        id: "oop",
        display: "OOP",
        category: "cs_concept",
        aliases: ["oop", "object-oriented programming", "object oriented programming"]
    },
    {
        id: "system_design",
        display: "System Design",
        category: "cs_concept",
        aliases: ["system design", "distributed systems", "high availability", "scalability"]
    },
    {
        id: "rest_api",
        display: "REST APIs",
        category: "cs_concept",
        aliases: ["rest api", "rest apis", "restful", "restful api", "restful apis"]
    },
    {
        id: "graphql",
        display: "GraphQL",
        category: "cs_concept",
        aliases: ["graphql"]
    },
    {
        id: "microservices",
        display: "Microservices",
        category: "cs_concept",
        aliases: ["microservices", "microservice architecture"]
    },
    {
        id: "ci_cd",
        display: "CI/CD",
        category: "cs_concept",
        aliases: ["ci/cd", "ci-cd", "continuous integration", "continuous deployment", "jenkins", "github actions"]
    },
    {
        id: "unit_testing",
        display: "Unit Testing / TDD",
        category: "cs_concept",
        aliases: ["unit testing", "tdd", "test driven development", "jest", "pytest", "unit tests"]
    },
    {
        id: "agile",
        display: "Agile / Scrum",
        category: "cs_concept",
        aliases: ["agile", "scrum", "kanban", "sprint planning"]
    },

    // -------------------------------------------------------------------------
    // 5. Domain-Specific Skills
    // -------------------------------------------------------------------------
    {
        id: "machine_learning",
        display: "Machine Learning",
        category: "domain_specific",
        aliases: ["machine learning", "\\bml\\b"]
    },
    {
        id: "deep_learning",
        display: "Deep Learning",
        category: "domain_specific",
        aliases: ["deep learning", "\\bdl\\b"]
    },
    {
        id: "llm",
        display: "Large Language Models",
        category: "domain_specific",
        aliases: ["large language models", "llm", "llms", "genai", "generative ai"]
    },
    {
        id: "nlp",
        display: "NLP",
        category: "domain_specific",
        aliases: ["natural language processing", "nlp"]
    },
    {
        id: "computer_vision",
        display: "Computer Vision",
        category: "domain_specific",
        aliases: ["computer vision", "cv models", "vision models"]
    },
    {
        id: "neural_networks",
        display: "Neural Networks",
        category: "domain_specific",
        aliases: ["neural networks", "neural network", "cnn", "rnn", "lstm"]
    },
    {
        id: "rag",
        display: "RAG",
        category: "domain_specific",
        aliases: ["retrieval-augmented generation", "retrieval augmented generation", "\\brag\\b"]
    },
    {
        id: "vector_search",
        display: "Vector Search",
        category: "domain_specific",
        aliases: ["vector search", "vector database", "vector db", "vector embeddings", "faiss", "pinecone", "milvus"]
    },
    {
        id: "embeddings",
        display: "Embeddings",
        category: "domain_specific",
        aliases: ["embeddings", "embedding"]
    },
    {
        id: "mlops",
        display: "MLOps",
        category: "domain_specific",
        aliases: ["mlops", "model deployment", "model serving", "data pipelines"]
    },
    {
        id: "penetration_testing",
        display: "Penetration Testing",
        category: "domain_specific",
        aliases: ["penetration testing", "pen testing", "pentest", "ethical hacking"]
    },
    {
        id: "vulnerability_assessment",
        display: "Vulnerability Assessment",
        category: "domain_specific",
        aliases: ["vulnerability assessment", "vulnerability management", "cve"]
    },
    {
        id: "siem_soc",
        display: "SIEM & SOC",
        category: "domain_specific",
        aliases: ["siem", "soc", "security operations center", "splunk", "qradar"]
    },
    {
        id: "cryptography",
        display: "Cryptography",
        category: "domain_specific",
        aliases: ["cryptography", "encryption", "pki", "tls", "ssl"]
    },
    {
        id: "firewalls",
        display: "Firewalls & Network Security",
        category: "domain_specific",
        aliases: ["firewalls", "firewall", "ids", "ips", "network security"]
    },
    {
        id: "zero_trust",
        display: "Zero Trust",
        category: "domain_specific",
        aliases: ["zero trust", "iam", "identity access management"]
    },
    {
        id: "owasp",
        display: "OWASP Top 10",
        category: "domain_specific",
        aliases: ["owasp", "owasp top 10", "appsec", "application security"]
    },

    // -------------------------------------------------------------------------
    // 6. Certifications & Qualifications
    // -------------------------------------------------------------------------
    {
        id: "cissp",
        display: "CISSP",
        category: "certification",
        aliases: ["cissp"]
    },
    {
        id: "ceh",
        display: "CEH",
        category: "certification",
        aliases: ["ceh", "certified ethical hacker"]
    },
    {
        id: "security_plus",
        display: "Security+",
        category: "certification",
        aliases: ["comptia security+", "security+"]
    },
    {
        id: "aws_cert",
        display: "AWS Certified",
        category: "certification",
        aliases: ["aws certified", "solutions architect"]
    }
];

/**
 * Regex patterns for requirement tier language.
 */
const PREFERRED_LANGUAGE_PATTERNS = [
    /\b(?:preferred|nice to have|good to have|bonus points?|plus|a plus|is a plus|optional|desired|advantageous|appreciated|not required)\b/i,
    /\bfamiliarity with (?:.*?) is (?:a )?(?:plus|bonus|preferred)\b/i,
    /\bexperience with (?:.*?) is (?:a )?(?:plus|bonus|preferred)\b/i
];

const PREFERRED_SECTION_HEADER_PATTERNS = [
    /^(?:preferred|nice to have|bonus|desired|additional|optional)\s*(?:qualifications|skills|requirements|experience|competencies)?[:\s-]*$/im,
    /(?:what's nice to have|bonus points for|good to have)[:\s-]*$/im
];

const REQUIRED_SECTION_HEADER_PATTERNS = [
    /^(?:required|basic|minimum|must[- ]have|core)\s*(?:qualifications|skills|requirements|experience|competencies)?[:\s-]*$/im,
    /(?:what you'll need|what you bring|responsibilities & requirements)[:\s-]*$/im
];

/**
 * Checks if a specific pattern matches within text using word boundaries.
 */
export function matchPattern(text: string, pattern: string): boolean {
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
 * Segments JD text into discrete sentences/bullet points with section context.
 */
interface TextSegment {
    text: string;
    sectionTier: RequirementTier;
    sentenceTier: RequirementTier;
}

function segmentJdText(jdText: string): TextSegment[] {
    const lines = jdText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const segments: TextSegment[] = [];

    let currentSectionTier: RequirementTier = "required";

    for (const line of lines) {
        // Check if this line is a section header
        const isPreferredHeader = PREFERRED_SECTION_HEADER_PATTERNS.some(rx => rx.test(line));
        const isRequiredHeader = REQUIRED_SECTION_HEADER_PATTERNS.some(rx => rx.test(line));

        if (isPreferredHeader) {
            currentSectionTier = "preferred";
            continue;
        } else if (isRequiredHeader) {
            currentSectionTier = "required";
            continue;
        }

        // Split line into sentences if bullet contains multiple periods
        const bulletContent = line.replace(/^[•\-\*\d\.\)\s]+/, "").trim();
        if (!bulletContent) continue;

        // Break on period followed by space and capital letter or end
        const sentences = bulletContent.split(/(?<=[.?!])\s+(?=[A-Z0-9])/).filter(Boolean);

        for (const s of sentences) {
            const isPreferredSentence = PREFERRED_LANGUAGE_PATTERNS.some(rx => rx.test(s));
            const sentenceTier: RequirementTier = isPreferredSentence ? "preferred" : currentSectionTier;

            segments.push({
                text: s,
                sectionTier: currentSectionTier,
                sentenceTier,
            });
        }
    }

    return segments;
}

/**
 * Parses a Job Description and extracts categorized, prioritized technical competencies.
 *
 * @param jobDescription Target job description text
 * @param jobTitle Target job title (optional context)
 * @returns Structured ParsedJobDescription with required and preferred skills
 */

/**
 * Detects JD seniority level deterministically from job title and description.
 */
export function detectJdSeniority(jobTitle: string, jobDescription: string): JdSeniorityMetadata {
    const rules: { level: SeniorityLevel; rx: RegExp }[] = [
        { level: "intern", rx: /\b(?:intern(?:ship)?|co-?op|student\s+trainee|summer\s+analyst)\b/i },
        { level: "entry_level", rx: /\b(?:entry[- ]level|new\s+grad(?:uate)?|associate|freshers?|junior\s+level|trainee)\b/i },
        { level: "junior", rx: /\b(?:junior|jr\.?|level\s+1|\bl1\b|developer\s+1|engineer\s+1)\b/i },
        { level: "lead", rx: /\b(?:lead|principal|staff|architect|head\s+of|director|founding)\b/i },
        { level: "manager", rx: /\b(?:engineering\s+manager|technical\s+manager|development\s+manager|project\s+manager|manager)\b/i },
        { level: "senior", rx: /\b(?:senior|sr\.?|level\s+[345]|\bl[567]\b|tech\s+lead)\b/i },
    ];

    const cleanTitle = jobTitle.trim();
    if (cleanTitle) {
        for (const r of rules) {
            const m = cleanTitle.match(r.rx);
            if (m) {
                return { detectedLevel: r.level, confidence: "high", matchedSignals: [m[0]] };
            }
        }
    }

    if (jobDescription) {
        for (const r of rules) {
            const m = jobDescription.match(r.rx);
            if (m) {
                return { detectedLevel: r.level, confidence: "medium", matchedSignals: [m[0]] };
            }
        }
    }

    return { detectedLevel: "unspecified", confidence: "low", matchedSignals: [] };
}

/**
 * Standard resume section patterns for deterministic segmentation.
 */
const RESUME_SECTION_PATTERNS: { name: ResumeSectionName; pattern: RegExp }[] = [
    {
        name: "Experience",
        pattern: /(?:^|\n)[ \t]*(?:work\s+experience|professional\s+experience|employment\s+history|experience\s*(?:&|and|\/)\s*practical\s+training|experience\s*(?:&|and|\/)\s*training|internships?\s*(?:&|and|\/)\s*training|practical\s+training|industrial\s+training|vocational\s+training|internships?|experience|work\s+history)[ \t]*(?:\n|:)/im,
    },
    {
        name: "Skills",
        pattern: /(?:^|\n)[ \t]*(?:technical\s+skills|core\s+skills|skills\s+&(?:amp;)?\s+technologies|technologies|skills|competencies)[ \t]*(?:\n|:)/im,
    },
    {
        name: "Projects",
        pattern: /(?:^|\n)[ \t]*(?:projects|key\s+projects|personal\s+projects|academic\s+projects|notable\s+projects)[ \t]*(?:\n|:)/im,
    },
    {
        name: "Education",
        pattern: /(?:^|\n)[ \t]*(?:education|academic\s+background|academic\s+qualifications|academics|degrees)[ \t]*(?:\n|:)/im,
    },
    {
        name: "Certifications",
        pattern: /(?:^|\n)[ \t]*(?:certifications|licenses|professional\s+certifications|certificates|accreditations)[ \t]*(?:\n|:)/im,
    },
    {
        name: "Summary / Objective",
        pattern: /(?:^|\n)[ \t]*(?:professional\s+summary|executive\s+summary|summary|profile|about\s+me|career\s+objective|objective)[ \t]*(?:\n|:)/im,
    },
    {
        name: "Achievements",
        pattern: /(?:^|\n)[ \t]*(?:achievements|awards|honors|accomplishments|publications)[ \t]*(?:\n|:)/im,
    },
    {
        name: "Relevant Coursework",
        pattern: /(?:^|\n)[ \t]*(?:relevant\s+coursework|coursework|courses)[ \t]*(?:\n|:)/im,
    },
];

/**
 * Segments resume text into distinct structured sections.
 */
export function segmentResumeSections(resumeText: string): ParsedResumeSection[] {
    const headerMatches: { name: ResumeSectionName; startIndex: number; headerLength: number }[] = [];

    for (const sec of RESUME_SECTION_PATTERNS) {
        const match = sec.pattern.exec(resumeText);
        if (match) {
            headerMatches.push({
                name: sec.name,
                startIndex: match.index,
                headerLength: match[0].length,
            });
        }
    }

    headerMatches.sort((a, b) => a.startIndex - b.startIndex);

    if (headerMatches.length === 0) {
        return [{
            name: "Other",
            content: resumeText,
            startIndex: 0,
            endIndex: resumeText.length,
        }];
    }

    const sections: ParsedResumeSection[] = [];

    // Pre-header chunk (typically Header / Contact / Summary)
    if (headerMatches[0].startIndex > 0) {
        sections.push({
            name: "Summary / Objective",
            content: resumeText.slice(0, headerMatches[0].startIndex).trim(),
            startIndex: 0,
            endIndex: headerMatches[0].startIndex,
        });
    }

    for (let i = 0; i < headerMatches.length; i++) {
        const current = headerMatches[i];
        const nextStart = (i + 1 < headerMatches.length) ? headerMatches[i + 1].startIndex : resumeText.length;
        const content = resumeText.slice(current.startIndex + current.headerLength, nextStart).trim();
        sections.push({
            name: current.name,
            content,
            startIndex: current.startIndex,
            endIndex: nextStart,
        });
    }

    return sections;
}

/**
 * Proficiency signals and action verbs that demonstrate practical implementation.
 */
export const PROFICIENCY_SIGNALS = [
    "built", "developed", "implemented", "deployed", "trained", "designed",
    "worked with", "experience in", "proficient in", "architected", "optimized",
    "created", "engineered", "fine-tuned", "spearheaded", "automated", "scaled",
    "maintained", "integrated", "managed", "benchmarked", "crafted", "modeled"
];

/**
 * Evaluates context and evidence strength for a specific skill across resume sections.
 */
export function analyzeSkillEvidence(
    skill: ExtractedSkill,
    sections: ParsedResumeSection[],
    fullResumeText: string
): SkillEvidence | null {
    const skillDef = SKILLS_TAXONOMY.find(s => s.id === skill.id);
    if (!skillDef) return null;

    const isPresent = skillDef.aliases.some(alias => matchPattern(fullResumeText, alias));
    if (!isPresent) return null;

    const detectedSections: ResumeSectionName[] = [];
    let hasProficiencySignal = false;
    const matchedPhrases: string[] = [];
    let sampleSnippet: string | undefined = undefined;

    for (const sec of sections) {
        const matchesSec = skillDef.aliases.some(alias => matchPattern(sec.content, alias));
        if (matchesSec) {
            detectedSections.push(sec.name);

            const lines = sec.content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                const lineHasSkill = skillDef.aliases.some(alias => matchPattern(line, alias));
                if (lineHasSkill) {
                    const lineLower = line.toLowerCase();
                    for (const signal of PROFICIENCY_SIGNALS) {
                        if (lineLower.includes(signal)) {
                            hasProficiencySignal = true;
                            if (!matchedPhrases.includes(signal)) {
                                matchedPhrases.push(signal);
                            }
                        }
                    }
                    if (!sampleSnippet && (sec.name === "Experience" || sec.name === "Projects")) {
                        sampleSnippet = line.slice(0, 120);
                    }
                }
            }
        }
    }

    if (!sampleSnippet && detectedSections.length > 0) {
        const firstSec = sections.find(s => detectedSections.includes(s.name));
        if (firstSec) {
            const firstLine = firstSec.content.split(/\r?\n/).find(l => skillDef.aliases.some(a => matchPattern(l, a)));
            if (firstLine) sampleSnippet = firstLine.trim().slice(0, 120);
        }
    }

    const inActionSection = detectedSections.includes("Experience") || detectedSections.includes("Projects");
    let evidenceLevel: SkillEvidenceLevel = "mention_only";

    if (inActionSection && hasProficiencySignal) {
        evidenceLevel = "strong";
    } else if (inActionSection || hasProficiencySignal) {
        evidenceLevel = "moderate";
    } else {
        evidenceLevel = "mention_only";
    }

    return {
        skill,
        evidenceLevel,
        detectedSections,
        hasProficiencySignal,
        matchedPhrases,
        sampleSnippet,
    };
}


export function parseJobDescription(
    jobDescription: string,
    jobTitle: string = ""
): ParsedJobDescription {
    const rawCombined = `${jobTitle}\n${jobDescription}`.trim();
    const segments = segmentJdText(rawCombined);

    const hasPreferredSection = PREFERRED_SECTION_HEADER_PATTERNS.some(rx => rx.test(rawCombined));
    const hasRequiredSection = REQUIRED_SECTION_HEADER_PATTERNS.some(rx => rx.test(rawCombined));

    const extractedMap = new Map<string, ExtractedSkill>();

    // For each skill in the taxonomy, check which segment matches
    for (const skill of SKILLS_TAXONOMY) {
        for (const segment of segments) {
            const matchedAlias = skill.aliases.find(alias => matchPattern(segment.text, alias));
            if (matchedAlias) {
                const tier = segment.sentenceTier;

                const existing = extractedMap.get(skill.id);
                // If already extracted, promote "required" over "preferred" if mentioned in both
                if (!existing || (existing.tier === "preferred" && tier === "required")) {
                    extractedMap.set(skill.id, {
                        id: skill.id,
                        display: skill.display,
                        category: skill.category,
                        tier,
                        matchedAlias,
                        contextSentence: segment.text,
                    });
                }
            }
        }
    }

    // Also check the job title itself (Job title keywords are always REQUIRED)
    if (jobTitle.trim()) {
        for (const skill of SKILLS_TAXONOMY) {
            const matchedAlias = skill.aliases.find(alias => matchPattern(jobTitle, alias));
            if (matchedAlias) {
                extractedMap.set(skill.id, {
                    id: skill.id,
                    display: skill.display,
                    category: skill.category,
                    tier: "required",
                    matchedAlias,
                    contextSentence: jobTitle,
                });
            }
        }
    }

    const allSkills = Array.from(extractedMap.values());
    const requiredSkills = allSkills.filter(s => s.tier === "required");
    const preferredSkills = allSkills.filter(s => s.tier === "preferred");

    const skillsByCategory: Record<SkillCategory, ExtractedSkill[]> = {
        programming_language: [],
        framework_library: [],
        tool_platform: [],
        cs_concept: [],
        domain_specific: [],
        certification: [],
    };

    for (const skill of allSkills) {
        skillsByCategory[skill.category].push(skill);
    }

    const seniority = detectJdSeniority(jobTitle, jobDescription);

    return {
        rawText: jobDescription,
        jobTitle,
        requiredSkills,
        preferredSkills,
        allSkills,
        skillsByCategory,
        sectionsDetected: {
            required: hasRequiredSection,
            preferred: hasPreferredSection,
        },
        seniority,
    };
}

/**
 * Compares extracted JD skills against candidate resume text deterministically.
 */
export interface JdSkillMatchResult {
    matchedRequired: ExtractedSkill[];
    missingRequired: ExtractedSkill[];
    matchedPreferred: ExtractedSkill[];
    missingPreferred: ExtractedSkill[];
    allMatched: ExtractedSkill[];
    allMissing: ExtractedSkill[];
    coverageRequiredPct: number;
    coveragePreferredPct: number;
    coverageTotalPct: number;
    evidenceMap: Record<string, SkillEvidence>;
    evidenceSummary: {
        strong: number;
        moderate: number;
        mentionOnly: number;
    };
    gapAnalysis: SkillGapAnalysis;
    detectedSections: ResumeSectionName[];
}

export function matchSkillsAgainstResume(
    parsedJd: ParsedJobDescription,
    resumeText: string
): JdSkillMatchResult {
    const isSkillInResume = (skillId: string): boolean => {
        const def = SKILLS_TAXONOMY.find(s => s.id === skillId);
        if (!def) return false;
        return def.aliases.some(alias => matchPattern(resumeText, alias));
    };

    const sections = segmentResumeSections(resumeText);
    const detectedSections = Array.from(new Set(sections.map(s => s.name)));

    const matchedRequired: ExtractedSkill[] = [];
    const missingRequired: ExtractedSkill[] = [];
    const matchedPreferred: ExtractedSkill[] = [];
    const missingPreferred: ExtractedSkill[] = [];
    const evidenceMap: Record<string, SkillEvidence> = {};

    for (const skill of parsedJd.requiredSkills) {
        if (isSkillInResume(skill.id)) {
            matchedRequired.push(skill);
            const ev = analyzeSkillEvidence(skill, sections, resumeText);
            if (ev) evidenceMap[skill.id] = ev;
        } else {
            missingRequired.push(skill);
        }
    }

    for (const skill of parsedJd.preferredSkills) {
        if (isSkillInResume(skill.id)) {
            matchedPreferred.push(skill);
            const ev = analyzeSkillEvidence(skill, sections, resumeText);
            if (ev) evidenceMap[skill.id] = ev;
        } else {
            missingPreferred.push(skill);
        }
    }

    const totalRequired = parsedJd.requiredSkills.length;
    const totalPreferred = parsedJd.preferredSkills.length;
    const totalAll = parsedJd.allSkills.length;

    const coverageRequiredPct = totalRequired > 0
        ? Math.round((matchedRequired.length / totalRequired) * 100)
        : 100;

    const coveragePreferredPct = totalPreferred > 0
        ? Math.round((matchedPreferred.length / totalPreferred) * 100)
        : 100;

    const allMatched = [...matchedRequired, ...matchedPreferred];
    const allMissing = [...missingRequired, ...missingPreferred];

    const coverageTotalPct = totalAll > 0
        ? Math.round((allMatched.length / totalAll) * 100)
        : 100;

    // Evidence summary breakdown
    let strong = 0;
    let moderate = 0;
    let mentionOnly = 0;

    for (const ev of Object.values(evidenceMap)) {
        if (ev.evidenceLevel === "strong") strong++;
        else if (ev.evidenceLevel === "moderate") moderate++;
        else mentionOnly++;
    }

    // Gap analysis
    const gapAnalysis: SkillGapAnalysis = {
        criticalGaps: missingRequired,
        secondaryGaps: missingPreferred,
        evidenceGaps: Object.values(evidenceMap).filter(ev => ev.evidenceLevel === "mention_only"),
    };

    return {
        matchedRequired,
        missingRequired,
        matchedPreferred,
        missingPreferred,
        allMatched,
        allMissing,
        coverageRequiredPct,
        coveragePreferredPct,
        coverageTotalPct,
        evidenceMap,
        evidenceSummary: {
            strong,
            moderate,
            mentionOnly,
        },
        gapAnalysis,
        detectedSections,
    };
}
