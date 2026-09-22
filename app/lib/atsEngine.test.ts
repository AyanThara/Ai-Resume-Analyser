import { calculateAtsScore } from "./atsEngine";

export const testResumeML = `Alex Chen
Email: alex.chen.ml@gmail.com | Phone: +1 (555) 234-5678
LinkedIn: linkedin.com/in/alexchen-ml | GitHub: github.com/alexchen-ai

Professional Summary
Senior Machine Learning Engineer with 6+ years of experience designing, training, and deploying large-scale AI and deep learning systems. Specialized in LLMs, RAG architectures, and scalable distributed ML infrastructure.

Skills
Languages: Python, C++, SQL, Bash
AI / ML: PyTorch, TensorFlow, Scikit-Learn, Deep Learning, Machine Learning, NLP, Computer Vision, Transformers, RAG, Vector Search, Embeddings, LangChain, Ollama, Pandas, NumPy
Cloud & DevOps: AWS, Docker, Kubernetes, CI/CD, Git, Linux
Core: Data Structures, Algorithms, OOP, System Design, REST APIs

Work Experience
Senior Machine Learning Engineer | HyperScale AI | Jan 2022 – Present
• Architected and deployed RAG pipelines using PyTorch, Transformers, and vector search, improving retrieval accuracy by 34%.
• Fine-tuned open-source LLMs using LoRA and distributed training, reducing inference latency by 45ms and saving $80k in annual cloud compute costs.
• Scaled model deployment infrastructure on Kubernetes and AWS to serve over 250k daily active users with 99.9% uptime.
• Engineered real-time computer vision semantic segmentation model with 98.5% precision on edge devices.
• Led a cross-functional team of 6 engineers to deliver enterprise AI microservices handling 50k requests per minute.

Machine Learning Engineer | DataCore Systems | Jun 2019 – Dec 2021
• Developed end-to-end predictive machine learning pipelines using Scikit-Learn and PyTorch, increasing customer retention by 18%.
• Optimized distributed data preprocessing workflows with Pandas and NumPy, cutting pipeline runtimes by 55%.
• Implemented automated CI/CD model evaluation suites, reducing regression bug rates by 40%.

Projects
Local Vector Search Engine | GitHub | 2023
• Developed an open-source vector search engine in Python utilizing HNSW indexing, earning 1,200+ GitHub stars.
• Integrated local LLM inference via Ollama and FastAPI, achieving sub-20ms query response times.

Education
Master of Science in Computer Science | Stanford University | 2017 – 2019
Bachelor of Science in Computer Engineering | UC Berkeley | 2013 – 2017

Certifications
AWS Certified Solutions Architect – Associate
DeepLearning.AI Deep Learning Specialization
`;

export const testResumeChef = `Gordon Ramsay
Email: gordon@restaurant.com | Phone: 555-123-4567
LinkedIn: linkedin.com/in/gordon

Summary
Executive Chef with 10 years experience leading high-volume commercial kitchens.

Experience
Executive Chef | Savoy Grill | 2018 – Present
• Managed kitchen staff of 25 chefs and reduced food waste by 30%.
• Increased restaurant revenue by 15% through menu redesign.
• Built inventory tracking system for kitchen supplies.
• Trained 40 culinary apprentices with 95% retention rate.
• Spearheaded farm-to-table initiative saving $50k annually.

Education
Bachelor of Arts in Culinary Arts | Culinary Institute | 2012 – 2016

Skills
Menu Planning, Food Preparation, Food Safety, Staff Leadership, Budgeting, French Cuisine
`;

export const testJdML = `
We are seeking an experienced Senior Machine Learning Engineer to build state-of-the-art AI systems.
The ideal candidate will have deep expertise in Python, PyTorch, Deep Learning, NLP, and Large Language Models.
Experience with RAG architectures, Vector Search, Embeddings, and Transformers is required.
Strong knowledge of Docker, Kubernetes, AWS, and CI/CD practices is essential.
Familiarity with MLOps pipelines and distributed System Design is strongly preferred.
You will architect, fine-tune, and deploy scalable ML models to production.
`;

export const testJdCyber = `
We are hiring a Lead Cybersecurity Analyst and Penetration Tester.
Requirements include expertise in SIEM, SOC operations, Penetration Testing, and Vulnerability Assessment.
Must have hands-on experience with Wireshark, Metasploit, Firewalls, Cryptography, and Incident Response.
Certifications like CISSP or CEH required.
Deep understanding of Zero Trust, OWASP top 10, and Network Security is mandatory.
`;

export const testJdGeneric = `
We are looking for a Software Engineer to join our backend team.
Responsibilities include building scalable REST APIs and microservices using Python, SQL, and Docker.
Experience with Git, Linux, Unit Testing, and Agile methodologies.
Familiarity with cloud platforms such as AWS and database management is required.
`;

export function runAtsInternalTests() {
    const resML = calculateAtsScore(testResumeML, testJdML, "Senior Machine Learning Engineer");
    const resGeneric = calculateAtsScore(testResumeML, testJdGeneric, "Software Engineer");
    const resCyber = calculateAtsScore(testResumeML, testJdCyber, "Lead Cybersecurity Analyst");
    const resChef = calculateAtsScore(testResumeChef, testJdCyber, "Lead Cybersecurity Analyst");

    // Strict relative ordering assertions
    if (resML.overallScore <= resGeneric.overallScore) {
        throw new Error(`Assertion failed: ML on ML (${resML.overallScore}) should exceed ML on Generic (${resGeneric.overallScore})`);
    }
    if (resGeneric.overallScore <= resCyber.overallScore) {
        throw new Error(`Assertion failed: ML on Generic (${resGeneric.overallScore}) should exceed ML on Cyber (${resCyber.overallScore})`);
    }
    if (resCyber.overallScore <= resChef.overallScore) {
        throw new Error(`Assertion failed: ML on Cyber (${resCyber.overallScore}) should exceed Chef on Cyber (${resChef.overallScore})`);
    }

    return {
        mlResult: resML,
        genericResult: resGeneric,
        cyberResult: resCyber,
        chefResult: resChef,
    };
}


/**
 * Phase 7.2 Deterministic Test Suite
 * Validates Formula 2 (Strict Core Gated 80/20 Model) and edge cases.
 */
export function runPhase7_2AtsTests() {
    console.log("================================================================");
    console.log("RUNNING PHASE 7.2 ATS ENGINE DETERMINISTIC UNIT TESTS");
    console.log("================================================================");

    // 1. Required vs Preferred Weighting (80/20 asymmetric influence)
    console.log("\n[TEST 1] Required vs. Preferred 80/20 Weighting");
    const jdReqPref = `
    Required Skills:
    • Python, Docker, PostgreSQL, Linux
    Preferred Skills:
    • Kubernetes, AWS, Redis, GraphQL
    `;

    const resumeReqOnly = "Experienced engineer with Python, Docker, PostgreSQL, and Linux.";
    const resumePrefOnly = "Familiar with Kubernetes, AWS, Redis, and GraphQL.";
    const resumeBalanced = "Skills: Python, Docker, Kubernetes, AWS.";

    const scoreReqOnly = calculateAtsScore(resumeReqOnly, jdReqPref, "Backend Engineer");
    const scorePrefOnly = calculateAtsScore(resumePrefOnly, jdReqPref, "Backend Engineer");
    const scoreBalanced = calculateAtsScore(resumeBalanced, jdReqPref, "Backend Engineer");

    console.log(`  Req Only (100% Req, 0% Pref): Kw=${scoreReqOnly.breakdown.keywordMatch}/40, Total=${scoreReqOnly.overallScore}`);
    console.log(`  Pref Only (0% Req, 100% Pref): Kw=${scorePrefOnly.breakdown.keywordMatch}/40, Total=${scorePrefOnly.overallScore}`);
    console.log(`  Balanced (50% Req, 50% Pref): Kw=${scoreBalanced.breakdown.keywordMatch}/40, Total=${scoreBalanced.overallScore}`);

    if (scoreReqOnly.breakdown.keywordMatch <= scorePrefOnly.breakdown.keywordMatch) {
        throw new Error("Test 1 Failed: Required-only candidate must outscore Preferred-only candidate");
    }
    if (scorePrefOnly.breakdown.keywordMatch !== 0) {
        throw new Error(`Test 1 Failed: Preferred-only candidate (0 required skills) must receive 0 keyword points, got ${scorePrefOnly.breakdown.keywordMatch}`);
    }
    console.log("  ✓ Test 1 Passed: Required skills have 4x dominance over preferred skills.");

    // 2. Required Coverage < 50% Gating
    console.log("\n[TEST 2] Required Coverage < 50% Gating");
    const resumeLowReq = "Skills: Python, Kubernetes, AWS, Redis, GraphQL."; // 1/4 req (25%), 4/4 pref (100%)
    const scoreLowReq = calculateAtsScore(resumeLowReq, jdReqPref, "Backend Engineer");
    // With 25% req, gate multiplier is 25%/50% = 0.5. Gated pref cov is 50%.
    // Eff cov = 0.8 * 0.25 + 0.2 * 0.5 = 0.20 + 0.10 = 0.30.
    // 0.30 * 40 = 12 kw points.
    console.log(`  Low Req + High Pref (25% Req, 100% Pref): Kw=${scoreLowReq.breakdown.keywordMatch}/40`);
    if (scoreLowReq.breakdown.keywordMatch > 15) {
        throw new Error(`Test 2 Failed: Preferred score was not gated properly when req < 50% (got ${scoreLowReq.breakdown.keywordMatch})`);
    }
    console.log("  ✓ Test 2 Passed: Preferred skills are discounted when required coverage < 50%.");

    // 3. Required Coverage = 0 Gating
    console.log("\n[TEST 3] Required Coverage = 0 produces strictly 0 keyword score");
    if (scorePrefOnly.breakdown.keywordMatch !== 0) {
        throw new Error("Test 3 Failed: 0 required skills must result in 0 keyword points");
    }
    console.log("  ✓ Test 3 Passed: 0 required skills guarantees 0 keyword points.");

    // 4. No Preferred Skills in JD
    console.log("\n[TEST 4] JD with No Preferred Skills Section");
    const jdNoPref = `
    Required:
    • Python, Docker, PostgreSQL, Redis, REST APIs, Linux, AWS, Git
    `;
    const resumeAllReq = "Python, Docker, PostgreSQL, Redis, REST APIs, Linux, AWS, Git.";
    const scoreNoPref = calculateAtsScore(resumeAllReq, jdNoPref, "Software Engineer");
    console.log(`  All Required Matched (no pref section): Kw=${scoreNoPref.breakdown.keywordMatch}/40`);
    if (scoreNoPref.breakdown.keywordMatch !== 40) {
        throw new Error(`Test 4 Failed: Full match on required-only JD should achieve 40/40, got ${scoreNoPref.breakdown.keywordMatch}`);
    }
    console.log("  ✓ Test 4 Passed: Required skills use full 40-point budget when no preferred skills exist.");

    // 5. Duplicate Skills in JD
    console.log("\n[TEST 5] Duplicate Skills in JD Immunity");
    const jdDuplicates = `
    We need a Python developer who knows Python.
    Must build Docker containers using Docker.
    Docker and Python expertise is mandatory.
    `;
    const scoreDup = calculateAtsScore("Python, Docker", jdDuplicates, "Python Developer");
    if (!scoreDup.keywordStats.requiredTotal || scoreDup.keywordStats.requiredTotal !== 2) {
        throw new Error(`Test 5 Failed: Duplicated mentions should resolve to 2 unique skills, got ${scoreDup.keywordStats.requiredTotal}`);
    }
    console.log("  ✓ Test 5 Passed: Duplicate skill mentions deduplicated to canonical IDs.");

    // 6. Same Skill in Required and Preferred Sections
    console.log("\n[TEST 6] Same Skill in Both Required and Preferred");
    const jdSameSkill = `
    Required:
    • Python, SQL
    Preferred:
    • Advanced Python is a plus.
    • Kubernetes
    `;
    const scoreSame = calculateAtsScore("Python, SQL, Kubernetes", jdSameSkill, "Data Engineer");
    if (scoreSame.keywordStats.total !== 3) {
        throw new Error(`Test 6 Failed: Same skill across sections must be deduplicated, expected 3 skills, got ${scoreSame.keywordStats.total}`);
    }
    console.log("  ✓ Test 6 Passed: Same skill in both tiers promoted to Required and deduplicated.");

    // 7. Short JD Depth Dampener Protection
    console.log("\n[TEST 7] Short JD Depth Dampener (1-skill JD)");
    const jdShort = "We need a React developer.";
    const scoreShort = calculateAtsScore("React", jdShort, "React Developer");
    console.log(`  1-Skill JD Match: Kw=${scoreShort.breakdown.keywordMatch}/40`);
    if (scoreShort.breakdown.keywordMatch >= 40) {
        throw new Error(`Test 7 Failed: Short JD must not yield 40/40, got ${scoreShort.breakdown.keywordMatch}`);
    }
    if (scoreShort.breakdown.keywordMatch > 20) {
        throw new Error(`Test 7 Failed: 1-skill JD should be dampened to <= 20 pts, got ${scoreShort.breakdown.keywordMatch}`);
    }
    console.log("  ✓ Test 7 Passed: Short JD dampened by depth factor (capped at <= 20/40).");

    // 8. Long JD Handling
    console.log("\n[TEST 8] Long JD (25+ Skills)");
    const jdLong = `
    Required: Python, C++, Java, JavaScript, TypeScript, Rust, React, Next.js, Node.js,
    Docker, Kubernetes, AWS, PostgreSQL, MySQL, MongoDB, Redis, System Design, OOP, REST APIs, Git.
    Preferred: PyTorch, TensorFlow, LangChain, RAG, Vector Search, SIEM, CISSP.
    `;
    const scoreLong = calculateAtsScore(testResumeML, jdLong, "Principal Architect");
    if (isNaN(scoreLong.breakdown.keywordMatch) || scoreLong.breakdown.keywordMatch < 0 || scoreLong.breakdown.keywordMatch > 40) {
        throw new Error(`Test 8 Failed: Long JD yielded invalid keyword score: ${scoreLong.breakdown.keywordMatch}`);
    }
    console.log(`  Long JD Score: Kw=${scoreLong.breakdown.keywordMatch}/40, Total=${scoreLong.overallScore}/100`);
    console.log("  ✓ Test 8 Passed: Long JD handles extensive skill sets cleanly.");

    // 9. Job-Title Technical Keywords
    console.log("\n[TEST 9] Job-Title Technical Keywords Classification");
    const jdTitleTech = "Build high-volume scalable backend systems.";
    const scoreTitle = calculateAtsScore(testResumeML, jdTitleTech, "Senior Python & Docker Engineer");
    if (!scoreTitle.matchedKeywords.includes("Python") || !scoreTitle.matchedKeywords.includes("Docker")) {
        throw new Error("Test 9 Failed: Title skills Python and Docker should be recognized as required");
    }
    console.log("  ✓ Test 9 Passed: Job title technical competencies accurately classified as Required.");

    // 10. Express.js False-Positive vs Technical Context
    console.log("\n[TEST 10] Express.js Technical vs Generic Word Disambiguation");
    const jdExpressFalse = "Must express enthusiasm and communicate well.";
    const scoreExpressFalse = calculateAtsScore("express", jdExpressFalse, "HR Specialist");
    if (scoreExpressFalse.matchedKeywords.includes("Express")) {
        throw new Error("Test 10 Failed: Bare 'express' incorrectly matched Express.js!");
    }
    const jdExpressTrue = "Experience with Express.js or Express framework and Express server.";
    const scoreExpressTrue = calculateAtsScore("Built an Express server with Express.js", jdExpressTrue, "Node.js Developer");
    if (!scoreExpressTrue.matchedKeywords.includes("Express")) {
        throw new Error("Test 10 Failed: Valid Express.js technical context failed to match!");
    }
    console.log("  ✓ Test 10 Passed: Express.js strictly requires technical contexts.");

    // 11. Node / Next / Go / C / R False-Positive Protections
    console.log("\n[TEST 11] Node / Next / Go / C / R Protected Languages");
    const jdProtectedFalse = `
    Will manage a cluster node in our network and lead next product sprints.
    Must go to remote offices and interact with C-level executives for R&D operations.
    `;
    const scoreProtFalse = calculateAtsScore(testResumeChef, jdProtectedFalse, "Executive Director");
    if (scoreProtFalse.matchedKeywords.length > 0) {
        throw new Error(`Test 11 Failed: Bare English words triggered false matches: ${scoreProtFalse.matchedKeywords.join(", ")}`);
    }
    console.log("  ✓ Test 11 Passed: Strict boundary protections prevent false positives for node, next, go, c, r.");

    console.log("\n================================================================");
    console.log("ALL PHASE 7.2 ATS ENGINE DETERMINISTIC TESTS PASSED (11/11)!");
    console.log("================================================================");
    return true;
}


if (import.meta.url.endsWith(process.argv[1])) {
    runAtsInternalTests();
    runPhase7_2AtsTests();
    runPhase7_3Tests();
    runPhase7_4Tests();
}


/**
 * Phase 7.3 Advanced Resume/JD Intelligence Deterministic Unit Tests
 */
export function runPhase7_3Tests() {
    console.log("================================================================");
    console.log("RUNNING PHASE 7.3 ADVANCED RESUME/JD INTELLIGENCE UNIT TESTS");
    console.log("================================================================");

    const jdFull = `
    Job Title: Full Stack Platform Architect
    Required:
    • Python
    • Docker
    • PostgreSQL
    Preferred:
    • Redis
    • Kubernetes
    `;

    // 1. Skill in Skills section only (mention_only evidence)
    console.log("\n[TEST 1] Skill in Skills section only");
    const resumeSkillsOnly = `
Skills
Languages & Tools: Python
    `;
    const resSkillsOnly = calculateAtsScore(resumeSkillsOnly, jdFull, "Full Stack Platform Architect");
    const pyEv1 = resSkillsOnly.matchResult?.evidenceMap["python"];
    if (!pyEv1 || pyEv1.evidenceLevel !== "mention_only") {
        throw new Error(`Test 1 Failed: Expected mention_only evidence for Python, got ${pyEv1?.evidenceLevel}`);
    }
    if (!pyEv1.detectedSections.includes("Skills")) {
        throw new Error("Test 1 Failed: Expected Python detectedSections to include Skills");
    }
    console.log("  ✓ Test 1 Passed: Skills-only mention accurately classified as mention_only.");

    // 2. Skill in Projects section
    console.log("\n[TEST 2] Skill in Projects section with action verb");
    const resumeProject = `
Projects
• Built a high-throughput search tool using Python and SQLite.
    `;
    const resProject = calculateAtsScore(resumeProject, jdFull, "Full Stack Platform Architect");
    const pyEv2 = resProject.matchResult?.evidenceMap["python"];
    if (!pyEv2 || pyEv2.evidenceLevel !== "strong") {
        throw new Error(`Test 2 Failed: Expected strong evidence for Python in Projects with 'built', got ${pyEv2?.evidenceLevel}`);
    }
    if (!pyEv2.detectedSections.includes("Projects")) {
        throw new Error("Test 2 Failed: Expected Python detectedSections to include Projects");
    }
    console.log("  ✓ Test 2 Passed: Project section mention with verb classified as strong evidence.");

    // 3. Skill in Experience section
    console.log("\n[TEST 3] Skill in Experience section with action verb");
    const resumeExp = `
Experience
• Developed containerized microservices utilizing Docker and Linux.
    `;
    const resExp = calculateAtsScore(resumeExp, jdFull, "Full Stack Platform Architect");
    const dockerEv = resExp.matchResult?.evidenceMap["docker"];
    if (!dockerEv || dockerEv.evidenceLevel !== "strong") {
        throw new Error(`Test 3 Failed: Expected strong evidence for Docker in Experience, got ${dockerEv?.evidenceLevel}`);
    }
    if (!dockerEv.detectedSections.includes("Experience")) {
        throw new Error("Test 3 Failed: Expected Docker detectedSections to include Experience");
    }
    console.log("  ✓ Test 3 Passed: Experience section mention with verb classified as strong evidence.");

    // 4. Skill in both Skills and Projects without double counting
    console.log("\n[TEST 4] Skill in both Skills and Projects (immunity to double counting)");
    const resumeBoth = `
Skills
Python, Docker

Projects
• Architected and deployed scalable analytics engine in Python.
    `;
    const resBoth = calculateAtsScore(resumeBoth, jdFull, "Full Stack Platform Architect");
    const pyEvBoth = resBoth.matchResult?.evidenceMap["python"];
    if (!pyEvBoth || pyEvBoth.evidenceLevel !== "strong") {
        throw new Error(`Test 4 Failed: Expected strong evidence for Python appearing in both sections, got ${pyEvBoth?.evidenceLevel}`);
    }
    if (!pyEvBoth.detectedSections.includes("Skills") || !pyEvBoth.detectedSections.includes("Projects")) {
        throw new Error("Test 4 Failed: Expected both Skills and Projects in detectedSections");
    }
    // Verify Python only appears once in matchedKeywords
    const pyOccurrences = resBoth.matchedKeywords.filter(k => k === "Python").length;
    if (pyOccurrences !== 1) {
        throw new Error(`Test 4 Failed: Python should only appear once in matchedKeywords, found ${pyOccurrences}`);
    }
    console.log("  ✓ Test 4 Passed: Skills + Projects presence yields strong evidence without double counting.");

    // 5. Strong evidence verbs detection
    console.log("\n[TEST 5] Strong evidence verbs detection");
    const resumeVerbs = `
Experience
• Trained deep learning models and deployed inference microservices with Python.
    `;
    const resVerbs = calculateAtsScore(resumeVerbs, jdFull, "Full Stack Platform Architect");
    const pyEvVerbs = resVerbs.matchResult?.evidenceMap["python"];
    if (!pyEvVerbs?.hasProficiencySignal || !pyEvVerbs.matchedPhrases.includes("trained") || !pyEvVerbs.matchedPhrases.includes("deployed")) {
        throw new Error("Test 5 Failed: Expected proficiency signals 'trained' and 'deployed' to be detected");
    }
    console.log("  ✓ Test 5 Passed: Verbs 'trained' and 'deployed' properly captured in matchedPhrases.");

    // 6. Weak / no contextual evidence (evidence gap)
    console.log("\n[TEST 6] Weak / no contextual evidence flagged in gapAnalysis");
    const resumeWeak = `
Skills
Python, Redis
    `;
    const resWeak = calculateAtsScore(resumeWeak, jdFull, "Full Stack Platform Architect");
    const evidenceGapDisplays = resWeak.gapAnalysis?.evidenceGaps.map(eg => eg.skill.display) || [];
    if (!evidenceGapDisplays.includes("Python") || !evidenceGapDisplays.includes("Redis")) {
        throw new Error(`Test 6 Failed: Python and Redis should be flagged in evidenceGaps, got: ${evidenceGapDisplays.join(", ")}`);
    }
    console.log("  ✓ Test 6 Passed: Skills-only matches accurately identified as evidence gaps.");

    // 7. Missing required skills (critical gaps)
    console.log("\n[TEST 7] Missing required skills flagged in criticalGaps");
    const critGapDisplays = resWeak.gapAnalysis?.criticalGaps.map(cg => cg.display) || [];
    if (!critGapDisplays.includes("Docker") || !critGapDisplays.includes("PostgreSQL")) {
        throw new Error(`Test 7 Failed: Docker and PostgreSQL should be criticalGaps, got: ${critGapDisplays.join(", ")}`);
    }
    console.log("  ✓ Test 7 Passed: Missing required skills accurately identified as critical gaps.");

    // 8. Missing preferred skills (secondary gaps)
    console.log("\n[TEST 8] Missing preferred skills flagged in secondaryGaps");
    const secGapDisplays = resWeak.gapAnalysis?.secondaryGaps.map(sg => sg.display) || [];
    if (!secGapDisplays.includes("Kubernetes")) {
        throw new Error(`Test 8 Failed: Kubernetes should be secondaryGaps, got: ${secGapDisplays.join(", ")}`);
    }
    console.log("  ✓ Test 8 Passed: Missing preferred skills accurately identified as secondary gaps.");

    // 9. Intern / Entry-level seniority detection
    console.log("\n[TEST 9] Intern and Entry-level seniority detection");
    const resIntern = calculateAtsScore(testResumeML, jdFull, "Machine Learning Engineer Intern");
    if (resIntern.seniority?.detectedLevel !== "intern") {
        throw new Error(`Test 9 Failed: Expected 'intern', got ${resIntern.seniority?.detectedLevel}`);
    }
    const resEntry = calculateAtsScore(testResumeML, "Looking for entry-level developers", "Associate Software Engineer");
    if (resEntry.seniority?.detectedLevel !== "entry_level") {
        throw new Error(`Test 9 Failed: Expected 'entry_level', got ${resEntry.seniority?.detectedLevel}`);
    }
    console.log("  ✓ Test 9 Passed: Intern and Entry-level detected with high confidence.");

    // 10. Senior / Lead / Manager seniority detection
    console.log("\n[TEST 10] Senior, Lead, and Manager seniority detection");
    const resSenior = calculateAtsScore(testResumeML, jdFull, "Senior Machine Learning Engineer");
    if (resSenior.seniority?.detectedLevel !== "senior") {
        throw new Error(`Test 10 Failed: Expected 'senior', got ${resSenior.seniority?.detectedLevel}`);
    }
    const resLead = calculateAtsScore(testResumeML, jdFull, "Lead Cybersecurity Analyst");
    if (resLead.seniority?.detectedLevel !== "lead") {
        throw new Error(`Test 10 Failed: Expected 'lead', got ${resLead.seniority?.detectedLevel}`);
    }
    const resMgr = calculateAtsScore(testResumeML, jdFull, "Engineering Manager");
    if (resMgr.seniority?.detectedLevel !== "manager") {
        throw new Error(`Test 10 Failed: Expected 'manager', got ${resMgr.seniority?.detectedLevel}`);
    }
    console.log("  ✓ Test 10 Passed: Senior, Lead, and Manager titles detected accurately.");

    // 11. Existing Node / Next / Go / C / R / Express protections
    console.log("\n[TEST 11] Existing protected words & Express immunity");
    const jdProt = `
    Must express dedication. Need team players who go beyond.
    Manage cluster node networks. Interface with C-level executives for R&D operations.
    `;
    const resProt = calculateAtsScore(testResumeChef, jdProt, "Program Coordinator");
    if (resProt.matchedKeywords.length > 0) {
        throw new Error(`Test 11 Failed: Bare English words triggered false matches: ${resProt.matchedKeywords.join(", ")}`);
    }
    console.log("  ✓ Test 11 Passed: Bare English words strictly excluded from false matching.");

    // 12. Calibration Ordering check
    console.log("\n[TEST 12] Phase 7.2 Calibration Ordering strictly maintained");
    const resML = calculateAtsScore(testResumeML, testJdML, "Senior Machine Learning Engineer");
    const resGeneric = calculateAtsScore(testResumeML, testJdGeneric, "Software Engineer");
    const resCyber = calculateAtsScore(testResumeML, testJdCyber, "Lead Cybersecurity Analyst");
    const resChef = calculateAtsScore(testResumeChef, testJdCyber, "Lead Cybersecurity Analyst");

    if (resML.overallScore <= resGeneric.overallScore ||
        resGeneric.overallScore <= resCyber.overallScore ||
        resCyber.overallScore <= resChef.overallScore) {
        throw new Error("Test 12 Failed: Calibration ordering violated!");
    }
    console.log(`  Calibration scores: ML (${resML.overallScore}) > Generic (${resGeneric.overallScore}) > Cyber (${resCyber.overallScore}) > Chef (${resChef.overallScore})`);
    console.log("  ✓ Test 12 Passed: Existing calibration ordering strictly intact.");

    console.log("\n================================================================");
    console.log("ALL PHASE 7.3 ADVANCED INTELLIGENCE TESTS PASSED (12/12)!");
    console.log("================================================================");
    return true;
}


/**
 * Phase 7.4 Resume Quality & JD Alignment Intelligence Deterministic Unit Tests
 */
export function runPhase7_4Tests() {
    console.log("================================================================");
    console.log("RUNNING PHASE 7.4 RESUME QUALITY & JD ALIGNMENT UNIT TESTS");
    console.log("================================================================");

    const jdFull = `
    Job Title: Full Stack Platform Architect
    Required:
    • Python
    • Docker
    • PostgreSQL
    Preferred:
    • Redis
    • Kubernetes
    `;

    const resumeMultiQuality = `
Summary
A hardworking team player with passion for software engineering.

Skills
Languages & Tools: Python, Docker, Redis

Projects
• Architected and deployed scalable analytics engine in Python, improving throughput by 35%.
• Developed backend microservices using FastAPI and SQLite database.
• Worked on various coding tasks.
    `;

    const res = calculateAtsScore(resumeMultiQuality, jdFull, "Full Stack Platform Architect");
    const diag = res.diagnostics;

    if (!diag) {
        throw new Error("Phase 7.4 Test Failed: Expected diagnostics object on AtsResult");
    }

    // 1. Skill placement analysis
    console.log("\n[TEST 1] Skill Placement Analysis");
    const pyPlacement = diag.placementAnalysis.items.find(i => i.skillDisplay === "Python");
    const dockerPlacement = diag.placementAnalysis.items.find(i => i.skillDisplay === "Docker");

    if (!pyPlacement || pyPlacement.quality !== "optimal") {
        throw new Error(`Test 1 Failed: Expected Python to be optimal, got ${pyPlacement?.quality}`);
    }
    if (!dockerPlacement || dockerPlacement.quality !== "mention_only") {
        throw new Error(`Test 1 Failed: Expected Docker to be mention_only, got ${dockerPlacement?.quality}`);
    }
    if (!dockerPlacement.isPoorlyPlaced) {
        throw new Error("Test 1 Failed: Expected Docker to be flagged as isPoorlyPlaced");
    }
    console.log("  ✓ Test 1 Passed: Optimal vs mention_only placement accurately distinguished.");

    // 2. Skills-only skill detection
    console.log("\n[TEST 2] Skills-Only Skill Detection");
    if (!diag.placementAnalysis.skillsOnlySkills.includes("Docker")) {
        throw new Error("Test 2 Failed: Docker should be in skillsOnlySkills");
    }
    if (!diag.placementAnalysis.skillsOnlySkills.includes("Redis")) {
        throw new Error("Test 2 Failed: Redis should be in skillsOnlySkills");
    }
    console.log("  ✓ Test 2 Passed: Skills-only skills accurately identified.");

    // 3. Project/Experience practical evidence verification
    console.log("\n[TEST 3] Required Skill Practical Evidence Verification");
    const pyReq = diag.requiredSkillReport.items.find(i => i.display === "Python");
    const dockerReq = diag.requiredSkillReport.items.find(i => i.display === "Docker");
    const pgReq = diag.requiredSkillReport.items.find(i => i.display === "PostgreSQL");

    if (!pyReq?.hasPracticalEvidence || pyReq.verdict !== "fully_aligned") {
        throw new Error(`Test 3 Failed: Python should be fully_aligned with practical evidence`);
    }
    if (dockerReq?.hasPracticalEvidence || dockerReq?.verdict !== "listed_without_evidence") {
        throw new Error(`Test 3 Failed: Docker should be listed_without_evidence`);
    }
    if (pgReq?.verdict !== "missing_critical") {
        throw new Error(`Test 3 Failed: PostgreSQL should be missing_critical`);
    }
    console.log("  ✓ Test 3 Passed: Required skills categorized into fully_aligned, listed_without_evidence, missing_critical.");

    // 4. Achievement / Bullet Quality Analysis
    console.log("\n[TEST 4] Achievement / Bullet Quality Analysis (Strong vs Needs Metrics vs Weak)");
    const bullets = diag.achievementAnalysis.bullets;
    const strongB = bullets.find(b => b.text.includes("35%"));
    const needsMetB = bullets.find(b => b.text.includes("FastAPI"));
    const weakB = bullets.find(b => b.text.includes("coding tasks"));

    if (!strongB || strongB.qualityTier !== "strong") {
        throw new Error("Test 4 Failed: Bullet with action verb, tech, and metric should be 'strong'");
    }
    if (!needsMetB || needsMetB.qualityTier !== "needs_metrics") {
        throw new Error("Test 4 Failed: Bullet with verb and tech but no metric should be 'needs_metrics'");
    }
    if (!weakB || weakB.qualityTier !== "weak") {
        throw new Error("Test 4 Failed: Bullet with generic statement should be 'weak'");
    }
    console.log("  ✓ Test 4 Passed: Bullets accurately classified into strong, needs_metrics, and weak.");

    // 5. Measurable metrics detection
    console.log("\n[TEST 5] Measurable Metrics Detection");
    if (strongB.measurableMetrics.length === 0 || !strongB.measurableMetrics.includes("35%")) {
        throw new Error("Test 5 Failed: Expected 35% to be detected as measurable metric");
    }
    console.log("  ✓ Test 5 Passed: Metrics accurately captured from accomplishment bullets.");

    // 6. JD Alignment Signals
    console.log("\n[TEST 6] JD Alignment Signals");
    if (diag.alignmentSignal.alignmentLevel !== "partial_alignment") {
        throw new Error(`Test 6 Failed: Expected partial_alignment, got ${diag.alignmentSignal.alignmentLevel}`);
    }
    const resCyberChef = calculateAtsScore(testResumeChef, testJdCyber, "Lead Cybersecurity Analyst");
    if (resCyberChef.diagnostics?.alignmentSignal.alignmentLevel !== "major_skill_gaps") {
        throw new Error(`Test 6 Failed: Expected major_skill_gaps for Chef on Cyber, got ${resCyberChef.diagnostics?.alignmentSignal.alignmentLevel}`);
    }
    console.log("  ✓ Test 6 Passed: Alignment signals accurately identify partial_alignment and major_skill_gaps.");

    // 7. Resume Issue Detection & Buzzwords
    console.log("\n[TEST 7] Resume Issue Detection (Critical, Warnings, Buzzwords)");
    const issues = diag.issues;
    const hasMissingReqIssue = issues.some(i => i.type === "missing_required_skill" && i.target === "PostgreSQL");
    const hasSkillsOnlyIssue = issues.some(i => i.type === "skills_only_skill" && i.target === "Docker");
    const hasMetricsIssue = issues.some(i => i.type === "bullet_missing_metrics");
    const hasBuzzwordIssue = issues.some(i => i.type === "generic_buzzwords");

    if (!hasMissingReqIssue) throw new Error("Test 7 Failed: Expected missing_required_skill issue for PostgreSQL");
    if (!hasSkillsOnlyIssue) throw new Error("Test 7 Failed: Expected skills_only_skill issue for Docker");
    if (!hasMetricsIssue) throw new Error("Test 7 Failed: Expected bullet_missing_metrics issue");
    if (!hasBuzzwordIssue) throw new Error("Test 7 Failed: Expected generic_buzzwords issue");
    console.log("  ✓ Test 7 Passed: Issues detected across missing skills, skills-only entries, metrics, and buzzwords.");

    // 8. Actionable Recommendations Categorization
    console.log("\n[TEST 8] Actionable Recommendations Categorization");
    const recs = diag.recommendations;
    if (recs.critical.length === 0 || !recs.critical.some(r => r.includes("PostgreSQL"))) {
        throw new Error("Test 8 Failed: Critical recommendations should include missing PostgreSQL");
    }
    if (recs.critical.length === 0 || !recs.critical.some(r => r.includes("Docker"))) {
        throw new Error("Test 8 Failed: Critical recommendations should include practical bullets for Docker");
    }
    if (recs.important.length === 0 || !recs.important.some(r => r.includes("Quantify"))) {
        throw new Error("Test 8 Failed: Important recommendations should include quantifying bullets");
    }
    if (recs.optional.length === 0 || !recs.optional.some(r => r.includes("Kubernetes"))) {
        throw new Error("Test 8 Failed: Optional recommendations should include preferred Kubernetes");
    }
    console.log("  ✓ Test 8 Passed: Recommendations cleanly prioritized into Critical, Important, and Optional.");

    // 9. Preservation of existing calibration ordering
    console.log("\n[TEST 9] Preservation of Calibration Ordering");
    const resML = calculateAtsScore(testResumeML, testJdML, "Senior Machine Learning Engineer");
    const resGeneric = calculateAtsScore(testResumeML, testJdGeneric, "Software Engineer");
    const resCyber = calculateAtsScore(testResumeML, testJdCyber, "Lead Cybersecurity Analyst");
    const resChef = calculateAtsScore(testResumeChef, testJdCyber, "Lead Cybersecurity Analyst");

    if (resML.overallScore <= resGeneric.overallScore ||
        resGeneric.overallScore <= resCyber.overallScore ||
        resCyber.overallScore <= resChef.overallScore) {
        throw new Error("Test 9 Failed: Calibration ordering violated in Phase 7.4!");
    }
    console.log(`  Calibration check: ML (${resML.overallScore}) > Generic (${resGeneric.overallScore}) > Cyber (${resCyber.overallScore}) > Chef (${resChef.overallScore})`);
    console.log("  ✓ Test 9 Passed: Calibration ordering strictly intact.");

    console.log("\n================================================================");
    console.log("ALL PHASE 7.4 QUALITY & ALIGNMENT TESTS PASSED (9/9)!");
    console.log("================================================================");
    return true;
}
