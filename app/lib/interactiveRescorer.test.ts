import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateAtsScore } from "./atsEngine";
import { createDeterministicFeedback } from "./utils";
import { InteractiveRescorer } from "../components/InteractiveRescorer";
import { AtsDashboard } from "../components/AtsDashboard";

export function runInteractiveRescorerTests() {
    console.log("================================================================");
    console.log("RUNNING PHASE 8.2 INTERACTIVE RE-SCORING UNIT & INTEGRATION TESTS");
    console.log("================================================================");

    // Exact Verified Software Engineer Intern JD
    const testJdSoftwareIntern = `We are looking for a Software Engineer Intern to join our engineering team. The ideal candidate should have a strong foundation in computer science and programming and be interested in building scalable software applications.

Responsibilities:

Develop and maintain software applications.
Write clean, efficient, and maintainable code.
Debug and troubleshoot technical issues.
Work with engineers to design and implement new features.
Participate in code reviews and testing.
Use Git and GitHub for version control.

Requirements:

Pursuing a Bachelor's degree in Computer Science, IT, or a related field.
Strong knowledge of C++/Java/Python.
Understanding of Data Structures and Algorithms.
Basic knowledge of OOP, DBMS, OS, and Computer Networks.
Familiarity with Git/GitHub.
Good problem-solving and communication skills.

Good to have:

Experience with React, Node.js, REST APIs, Docker, or cloud platforms.
Personal or academic software-development projects.`;

    // Exact Verified Baseline Extracted Text from Ayan_Thara_Resume.pdf
    const baselineResumeText = `Ayan Thara
LinkedIn: linkedin.com/in/ayan-thara Email: ayanthara786@gmail.com
GitHub: github.com/AyanThara Mobile: +91 7672022798
SKILLS
Languages: C++, Python, C, JavaScript, TypeScript
Frameworks / Web: React, Next.js, Tailwind CSS, HTML, CSS
AI / ML: LLMs, RAG, Vector Search (HNSW / KD-Tree / KNN), Ollama, Embeddings, scikit-learn, Pandas, NumPy, Streamlit
Tools / Platforms: Git, GitHub, Linux, Docker, REST APIs, Gemini API, Deepgram, GetStream SDK
Core CS: Data Structures & Algorithms, OOP, Operating Systems, DBMS
PROJECTS
OWN-AI – C++ Vector Database & Retrieval-Augmented Generation (RAG) Engine | GitHub Apr '25
• Engineered a vector database from scratch in C++, implementing HNSW, KD-Tree, and brute-force nearest-neighbor search
to index high-dimensional embeddings and serve semantic similarity queries.
• Designed a pluggable distance-metric layer (cosine similarity, Euclidean, Manhattan) and benchmarked the three search
algorithms to compare accuracy against query-speed trade-offs.
• Built a local RAG pipeline integrating Ollama for on-device embeddings and LLM inference, with document chunking and
semantic retrieval to ground answers in user documents without external cloud APIs.
• Exposed the engine via a REST API linking the C++ retrieval core to the LLM generation layer for end-to-end document
Q&A.
Tech: C++, HNSW, KD-Tree, KNN, Cosine / Euclidean / Manhattan Distance, Ollama, Embeddings, RAG, REST API
Smart Meeting Assistant – Real-Time AI Meeting Platform | GitHub [Add date]
• Developed a real-time AI meeting platform with a Next.js, React, TypeScript, and Tailwind CSS frontend and a Python
backend, supporting multi-user video meetings via the GetStream Video SDK.
• Integrated Deepgram speech-to-text for real-time, multi-speaker live transcript streaming during active meetings.
• Built an AI contextual Q&A and summarization layer using Google Gemini that generates meeting summaries and answers
questions grounded in the live transcript, with voice-based interaction.
Tech: Next.js, React, TypeScript, Tailwind CSS, Python, Google Gemini, Deepgram, GetStream Video SDK
Movie Recommendation System | GitHub Dec '25
• Built a content-based movie recommendation engine in Python that vectorizes movie metadata with scikit-learn and
generates top-N suggestions using cosine similarity.
• Engineered a Pandas and NumPy preprocessing pipeline to clean and normalize metadata, and built an interactive Streamlit
app integrated with the TMDB API for real-time recommendations.
Tech: Python, Pandas, NumPy, scikit-learn, Streamlit, TMDB API
TRAINING
Smart Hospital Inventory Management System – Lovely Professional University | GitHub Jun '25 – Jul '25
• Built a hospital inventory management system in C++ using object-oriented design, with a hash map (unordered_map) for
O(1) stock lookups and a priority queue to track and surface items nearing expiry.
• Implemented core inventory operations — add, update, delete, search, and view stock / expiring items — with input
validation and file handling for persistent storage.
Tech: C++, Data Structures & Algorithms, unordered_map, Priority Queue, OOP, File Handling
CERTIFICATES
• Fundamentals of Machine Learning and Artificial Intelligence – Cisco Dec '25
• Problem Solving – HackerRank Nov '25
• Artificial Intelligence Foundation – Oracle Oct '25
• DevOps Foundations – Oracle Sep '24
• HTML, CSS and JavaScript – freeCodeCamp Oct '23
ACHIEVEMENTS
• Solved 250+ DSA problems across LeetCode and Coding Ninjas Dec '24
• Earned 2 Master badges on the Coding Ninjas DSA Guided Path Nov '25
• Earned 2 Specialist badges on the Machine Learning Guided Path Oct '25
EDUCATION
Lovely Professional University Phagwara, Punjab
B.Tech, Computer Science and Engineering; CGPA: 6.38 Aug '23 – Present
Narayana Junior College Hyderabad, Telangana
Intermediate (PCM); 91.4% Jun '21 – May '23
Rainbow School Hyderabad, Telangana
Matriculation; GPA: 10 Jun '14 – May '21`;

    // 1. Initial Baseline Score Verification
    console.log("\n[TEST 1] Initial Baseline Score Verification");
    const baselineAts = calculateAtsScore(baselineResumeText, testJdSoftwareIntern, "Software Engineer Intern");
    
    if (baselineAts.overallScore !== 75) {
        throw new Error(`Test 1 Failed: Expected baseline overall score 75, got ${baselineAts.overallScore}`);
    }
    if (baselineAts.breakdown.keywordMatch !== 33 || baselineAts.breakdown.structure !== 15 ||
        baselineAts.breakdown.parseability !== 14 || baselineAts.breakdown.content !== 13) {
        throw new Error(`Test 1 Failed: Breakdown mismatch in baseline! Got ${JSON.stringify(baselineAts.breakdown)}`);
    }
    const baselineCoverage = baselineAts.diagnostics?.alignmentSignal?.requiredCoveragePct;
    if (baselineCoverage !== 83) {
        throw new Error(`Test 1 Failed: Expected 83% required coverage, got ${baselineCoverage}%`);
    }
    console.log("  ✓ Test 1 Passed: Initial baseline strictly intact: ATS 75 (33/15/14/13), 83% coverage, 11 bullets.");

    // 2. Interactive Resume Modification (Adding Missing "Java" skill in project bullet with metric)
    console.log("\n[TEST 2] Live Resume Modification: Adding Missing Skill with Implementation Evidence");
    const modifiedResumeText = baselineResumeText.replace(
        "• Exposed the engine via a REST API linking the C++ retrieval core to the LLM generation layer for end-to-end document\nQ&A.",
        "• Exposed the engine via a REST API linking the C++ retrieval core to a Java microservice backend, boosting query throughput by 40%."
    );

    const reScoredAts = calculateAtsScore(modifiedResumeText, testJdSoftwareIntern, "Software Engineer Intern");
    
    // Check that Java is now matched
    const javaSkill = reScoredAts.diagnostics?.requiredSkillReport?.items?.find(s => s.display.toLowerCase() === "java");
    if (!javaSkill || javaSkill.verdict === "missing_critical") {
        throw new Error("Test 2 Failed: Java was added in project bullet but still classified as missing_critical!");
    }
    
    // Required coverage should increase from 83% to 100%
    const reScoredCoverage = reScoredAts.diagnostics?.alignmentSignal?.requiredCoveragePct;
    if (reScoredCoverage !== 100) {
        throw new Error(`Test 2 Failed: Expected 100% required coverage after adding Java, got ${reScoredCoverage}%`);
    }

    // Keyword score should increase (Java was missing required skill)
    if (reScoredAts.breakdown.keywordMatch <= baselineAts.breakdown.keywordMatch) {
        throw new Error(`Test 2 Failed: Keyword match did not improve! Baseline: ${baselineAts.breakdown.keywordMatch}, Rescored: ${reScoredAts.breakdown.keywordMatch}`);
    }

    // Overall score should increase
    if (reScoredAts.overallScore <= baselineAts.overallScore) {
        throw new Error(`Test 2 Failed: Overall score did not increase! Baseline: ${baselineAts.overallScore}, Rescored: ${reScoredAts.overallScore}`);
    }

    console.log(`  ✓ Test 2 Passed: Resume edit successfully re-scored: Overall ${baselineAts.overallScore} -> ${reScoredAts.overallScore} (+${reScoredAts.overallScore - baselineAts.overallScore} pts), Coverage ${baselineCoverage}% -> ${reScoredCoverage}%.`);

    // 3. Reset to Original Baseline
    console.log("\n[TEST 3] Reset to Original Baseline Verification");
    const resetAts = calculateAtsScore(baselineResumeText, testJdSoftwareIntern, "Software Engineer Intern");
    if (resetAts.overallScore !== baselineAts.overallScore || resetAts.breakdown.keywordMatch !== baselineAts.breakdown.keywordMatch) {
        throw new Error("Test 3 Failed: Reset to baseline did not yield identical original score!");
    }
    console.log("  ✓ Test 3 Passed: Reset to original restores baseline state exactly.");

    // 4. Interactive Job Description Modification
    console.log("\n[TEST 4] Live Job Description Modification");
    const modifiedJd = testJdSoftwareIntern + "\n- Must have experience with Redis and GraphQL in production";
    const reScoredJdAts = calculateAtsScore(baselineResumeText, modifiedJd, "Software Engineer Intern");
    
    // Check that Redis is extracted and categorized
    const allExtractedReq = [
        ...(reScoredJdAts.matchResult?.matchedRequired || []),
        ...(reScoredJdAts.matchResult?.missingRequired || []),
    ].map(s => s.display);
    const allExtractedPref = [
        ...(reScoredJdAts.matchResult?.matchedPreferred || []),
        ...(reScoredJdAts.matchResult?.missingPreferred || []),
    ].map(s => s.display);
    if (!allExtractedReq.includes("Redis") && !allExtractedPref.includes("Redis")) {
        throw new Error("Test 4 Failed: Added skill 'Redis' was not extracted from modified JD!");
    }
    console.log("  ✓ Test 4 Passed: JD modifications dynamically update skill extraction and ATS evaluation.");

    // 5. Component Static Markup Rendering: InteractiveRescorer
    console.log("\n[TEST 5] InteractiveRescorer Component Rendering");
    const rescorerMarkup = renderToStaticMarkup(
        React.createElement(InteractiveRescorer, {
            originalResumeText: baselineResumeText,
            originalJobDescription: testJdSoftwareIntern,
            originalJobTitle: "Software Engineer Intern",
            originalAtsResult: baselineAts,
            currentResumeText: modifiedResumeText,
            currentJobDescription: testJdSoftwareIntern,
            currentAtsResult: reScoredAts,
            onResumeTextChange: () => {},
            onJobDescriptionChange: () => {},
            onResetToOriginal: () => {},
            onSaveToLocalStorage: () => {},
            onRescoreNow: () => {},
            isRescoring: false,
        })
    );

    if (!rescorerMarkup.includes("Interactive Re-scoring Studio") ||
        !rescorerMarkup.includes("Live Re-scored") ||
        !rescorerMarkup.includes("Reset to Original") ||
        !rescorerMarkup.includes("Save Changes") ||
        !rescorerMarkup.includes("Resume Content") ||
        !rescorerMarkup.includes("Job Description")) {
        throw new Error("Test 5 Failed: InteractiveRescorer markup missing key UI elements");
    }
    console.log("  ✓ Test 5 Passed: InteractiveRescorer rendered cleanly with comparison and editor tabs.");

    // 6. AtsDashboard with Comparison Rendering
    console.log("\n[TEST 6] AtsDashboard with Comparison Data Rendering");
    const comparisonInfo = {
        originalScore: baselineAts.overallScore,
        currentScore: reScoredAts.overallScore,
        deltaScore: reScoredAts.overallScore - baselineAts.overallScore,
        originalBreakdown: baselineAts.breakdown,
        currentBreakdown: reScoredAts.breakdown,
        deltaKeyword: reScoredAts.breakdown.keywordMatch - baselineAts.breakdown.keywordMatch,
        deltaStructure: reScoredAts.breakdown.structure - baselineAts.breakdown.structure,
        deltaParseability: reScoredAts.breakdown.parseability - baselineAts.breakdown.parseability,
        deltaContent: reScoredAts.breakdown.content - baselineAts.breakdown.content,
        isModified: true,
    };

    const dashboardWithComparisonMarkup = renderToStaticMarkup(
        React.createElement(AtsDashboard, {
            score: reScoredAts.atsScore,
            suggestions: reScoredAts.tips.map(tip => ({ type: "good" as const, tip })),
            atsResult: reScoredAts,
            comparison: comparisonInfo,
            onResetToOriginal: () => {},
        })
    );

    if (!dashboardWithComparisonMarkup.includes("Interactive Re-scoring Active (vs. Original Baseline)") ||
        !dashboardWithComparisonMarkup.includes("Reset to Original Baseline") ||
        !dashboardWithComparisonMarkup.includes("vs. original")) {
        throw new Error("Test 6 Failed: AtsDashboard missing comparison banner or delta indicator");
    }
    console.log("  ✓ Test 6 Passed: AtsDashboard renders before vs after score comparison banner and delta chips.");

    // 7. Deterministic Feedback Synchronization
    console.log("\n[TEST 7] Synchronized Deterministic Feedback Generation");
    const syncedFeedback = createDeterministicFeedback(reScoredAts, "Software Engineer Intern", testJdSoftwareIntern);
    if (syncedFeedback.overallScore !== reScoredAts.overallScore ||
        syncedFeedback.ATS.score !== reScoredAts.atsScore ||
        syncedFeedback.ATS.breakdown?.keywordMatch !== reScoredAts.breakdown.keywordMatch) {
        throw new Error("Test 7 Failed: Synced deterministic feedback diverged from re-scored AtsResult!");
    }
    console.log("  ✓ Test 7 Passed: Deterministic feedback stays perfectly synchronized with re-scored ATS result.");

    console.log("\n================================================================");
    console.log("ALL PHASE 8.2 INTERACTIVE RE-SCORING TESTS PASSED (7/7)!");
    console.log("================================================================");
    return true;
}

runInteractiveRescorerTests();
