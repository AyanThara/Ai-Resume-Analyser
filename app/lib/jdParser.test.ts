import { parseJobDescription, matchSkillsAgainstResume, matchPattern } from "./jdParser";

export function runJdParserTests() {
    console.log("================================================================");
    console.log("RUNNING PHASE 7.1 JD PARSER UNIT TESTS");
    console.log("================================================================");

    // -------------------------------------------------------------------------
    // TEST 1: Required vs. Preferred Separation
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Required vs Preferred Skill Separation");
    const testJdReqPref = `
    We are seeking a Backend Engineer.
    Must have experience with Python, PostgreSQL, and Docker.
    Proficient in REST APIs and Microservices.
    Experience with Redis or Kafka is a plus.
    Familiarity with Kubernetes is preferred.
    Bonus points for AWS certification.
    `;

    const parsed1 = parseJobDescription(testJdReqPref, "Backend Engineer");
    const reqDisplays = parsed1.requiredSkills.map(s => s.display);
    const prefDisplays = parsed1.preferredSkills.map(s => s.display);

    console.log("  Required skills extracted:", reqDisplays);
    console.log("  Preferred skills extracted:", prefDisplays);

    if (!reqDisplays.includes("Python") || !reqDisplays.includes("PostgreSQL") || !reqDisplays.includes("Docker")) {
        throw new Error("Test 1 Failed: Core required skills missing from requiredSkills");
    }
    if (!prefDisplays.includes("Redis") || !prefDisplays.includes("Kafka") || !prefDisplays.includes("Kubernetes")) {
        throw new Error("Test 1 Failed: Expected preferred skills (Redis, Kafka, Kubernetes) missing from preferredSkills");
    }
    if (reqDisplays.includes("Redis") || reqDisplays.includes("Kafka")) {
        throw new Error("Test 1 Failed: Preferred skill incorrectly flagged as required");
    }
    console.log("  ✓ Test 1 Passed: Required and Preferred skills cleanly separated.");

    // -------------------------------------------------------------------------
    // TEST 2: Section Header Detection (Requirements vs Nice-to-Have)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Section Header-Based Tier Classification");
    const testJdSections = `
    Required Qualifications:
    • 3+ years experience with TypeScript
    • Strong knowledge of React and Next.js
    • Experience with CI/CD pipelines

    Preferred Qualifications:
    • Familiarity with Tailwind CSS
    • Knowledge of GraphQL
    `;

    const parsed2 = parseJobDescription(testJdSections, "Frontend Engineer");
    const req2 = parsed2.requiredSkills.map(s => s.display);
    const pref2 = parsed2.preferredSkills.map(s => s.display);

    console.log("  Section Required:", req2);
    console.log("  Section Preferred:", pref2);

    if (!req2.includes("TypeScript") || !req2.includes("React") || !req2.includes("Next.js")) {
        throw new Error("Test 2 Failed: Section required skills not detected");
    }
    if (!pref2.includes("Tailwind CSS") || !pref2.includes("GraphQL")) {
        throw new Error("Test 2 Failed: Section preferred skills not detected");
    }
    console.log("  ✓ Test 2 Passed: Section headers cleanly set requirement tier.");

    // -------------------------------------------------------------------------
    // TEST 3: Aliases & Normalization
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Alias Normalization (sklearn, JS, TS, REST APIs)");
    const testJdAliases = `
    Looking for a developer skilled in sklearn, JS, TS, and building restful apis.
    `;
    const parsed3 = parseJobDescription(testJdAliases, "Full Stack Developer");
    const displays3 = parsed3.allSkills.map(s => s.display);

    console.log("  Normalized skill displays:", displays3);
    if (!displays3.includes("Scikit-Learn")) {
        throw new Error("Test 3 Failed: 'sklearn' did not normalize to 'Scikit-Learn'");
    }
    if (!displays3.includes("JavaScript")) {
        throw new Error("Test 3 Failed: 'JS' did not normalize to 'JavaScript'");
    }
    if (!displays3.includes("TypeScript")) {
        throw new Error("Test 3 Failed: 'TS' did not normalize to 'TypeScript'");
    }
    if (!displays3.includes("REST APIs")) {
        throw new Error("Test 3 Failed: 'restful apis' did not normalize to 'REST APIs'");
    }
    console.log("  ✓ Test 3 Passed: Aliases correctly mapped to canonical displays.");

    // -------------------------------------------------------------------------
    // TEST 4: False-Positive Protection
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] False-Positive Protection (node, next, go, c, r)");
    const falsePositiveText = `
    You will manage a cluster node in the network and plan our next product iteration.
    We encourage candidates to go above and beyond in their daily tasks.
    Must communicate with C-level leadership and conduct ongoing R&D operations.
    Must express excitement for continuous growth and expressing ideas clearly.
    `;
    const parsed4 = parseJobDescription(falsePositiveText, "Operations Manager");
    const falseDisplays = parsed4.allSkills.map(s => s.display);

    console.log("  Extracted from false-positive sentence:", falseDisplays);
    if (falseDisplays.includes("Node.js")) {
        throw new Error("Test 4 Failed: Bare word 'node' incorrectly triggered Node.js!");
    }
    if (falseDisplays.includes("Next.js")) {
        throw new Error("Test 4 Failed: Bare word 'next' incorrectly triggered Next.js!");
    }
    if (falseDisplays.includes("Go")) {
        throw new Error("Test 4 Failed: Common English word 'go' incorrectly triggered Go language!");
    }
    if (falseDisplays.includes("C")) {
        throw new Error("Test 4 Failed: 'C-level' incorrectly triggered C programming language!");
    }
    if (falseDisplays.includes("R")) {
        throw new Error("Test 4 Failed: 'R&D' incorrectly triggered R programming language!");
    }
    if (falseDisplays.includes("Express")) {
        throw new Error("Test 4 Failed: Bare English word 'express/expressing' incorrectly triggered Express.js!");
    }
    console.log("  ✓ Test 4 Passed: Strict regex prevents bare English words from false-matching.");

    // -------------------------------------------------------------------------
    // TEST 5: Legitimate Context Matching for Protected Languages
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Legitimate Matches for Protected Languages");
    const truePositiveText = `
    Required: C programming, Golang, Node.js, Next.js, and R programming.
    `;
    const parsed5 = parseJobDescription(truePositiveText, "Systems Developer");
    const trueDisplays = parsed5.allSkills.map(s => s.display);

    console.log("  Extracted from true-positive sentence:", trueDisplays);
    if (!trueDisplays.includes("C") || !trueDisplays.includes("Go") || !trueDisplays.includes("Node.js") || !trueDisplays.includes("Next.js") || !trueDisplays.includes("R")) {
        throw new Error("Test 5 Failed: Contextual multi-word aliases failed to match valid technical mentions");
    }
    console.log("  ✓ Test 5 Passed: Contextual aliases match legitimate language usages.");

    // -------------------------------------------------------------------------
    // TEST 6: Category Breakdown
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Categorization into Standard Taxonomy Categories");
    const testJdMultiCat = `
    Role: Machine Learning Engineer
    Languages: Python, C++
    Frameworks: PyTorch, Scikit-Learn
    Tools: Docker, Kubernetes, AWS
    Concepts: OOP, System Design, CI/CD
    Domain: Deep Learning, Computer Vision, RAG
    Certifications: CISSP, AWS Certified
    `;
    const parsed6 = parseJobDescription(testJdMultiCat, "Machine Learning Engineer");

    console.log("  Languages:", parsed6.skillsByCategory.programming_language.map(s => s.display));
    console.log("  Frameworks:", parsed6.skillsByCategory.framework_library.map(s => s.display));
    console.log("  Tools:", parsed6.skillsByCategory.tool_platform.map(s => s.display));
    console.log("  Concepts:", parsed6.skillsByCategory.cs_concept.map(s => s.display));
    console.log("  Domain:", parsed6.skillsByCategory.domain_specific.map(s => s.display));
    console.log("  Certifications:", parsed6.skillsByCategory.certification.map(s => s.display));

    if (parsed6.skillsByCategory.programming_language.length < 2) throw new Error("Category test failed for languages");
    if (parsed6.skillsByCategory.framework_library.length < 2) throw new Error("Category test failed for frameworks");
    if (parsed6.skillsByCategory.tool_platform.length < 3) throw new Error("Category test failed for tools");
    if (parsed6.skillsByCategory.cs_concept.length < 3) throw new Error("Category test failed for concepts");
    if (parsed6.skillsByCategory.domain_specific.length < 3) throw new Error("Category test failed for domain");
    if (parsed6.skillsByCategory.certification.length < 2) throw new Error("Category test failed for certifications");

    console.log("  ✓ Test 6 Passed: Skills accurately sorted across all 6 taxonomic categories.");

    // -------------------------------------------------------------------------
    // TEST 7: Resume Matching (Matched vs Missing Required & Preferred)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Matching Against Candidate Resume");
    const sampleResume = `
    Alex Chen | Python, PyTorch, Docker, Git.
    Experience with Machine Learning and Deep Learning models.
    Built REST APIs in FastAPI.
    `;
    const matchResult = matchSkillsAgainstResume(parsed1, sampleResume);

    console.log("  Matched Required:", matchResult.matchedRequired.map(s => s.display));
    console.log("  Missing Required:", matchResult.missingRequired.map(s => s.display));
    console.log("  Matched Preferred:", matchResult.matchedPreferred.map(s => s.display));
    console.log("  Missing Preferred:", matchResult.missingPreferred.map(s => s.display));
    console.log(`  Required Coverage: ${matchResult.coverageRequiredPct}%`);
    console.log(`  Preferred Coverage: ${matchResult.coveragePreferredPct}%`);

    if (!matchResult.matchedRequired.map(s => s.display).includes("Python")) {
        throw new Error("Test 7 Failed: Python should be in matchedRequired");
    }
    if (!matchResult.missingRequired.map(s => s.display).includes("PostgreSQL")) {
        throw new Error("Test 7 Failed: PostgreSQL should be in missingRequired");
    }
    console.log("  ✓ Test 7 Passed: Resume match accurately computes required vs preferred coverage.");


    // -------------------------------------------------------------------------
    // TEST 8: Express.js False-Positive & Technical Context Protection
    // -------------------------------------------------------------------------
    console.log("\n[TEST 8] Express.js Technical Context vs English Word Disambiguation");
    const testExpressNeg = parseJobDescription("Must express excitement for continuous growth", "Product Lead");
    if (testExpressNeg.allSkills.some(s => s.display === "Express")) {
        throw new Error("Test 8 Failed: 'Must express excitement...' incorrectly matched Express!");
    }

    const testExpress1 = parseJobDescription("Experience with Express.js required", "Backend Engineer");
    if (!testExpress1.allSkills.some(s => s.display === "Express")) {
        throw new Error("Test 8 Failed: 'Experience with Express.js' failed to match Express!");
    }

    const testExpress2 = parseJobDescription("Experience with Express framework is essential", "Node Developer");
    if (!testExpress2.allSkills.some(s => s.display === "Express")) {
        throw new Error("Test 8 Failed: 'Experience with Express framework' failed to match Express!");
    }

    const testExpress3 = parseJobDescription("Built an Express server handling 10k req/s", "Full Stack Developer");
    if (!testExpress3.allSkills.some(s => s.display === "Express")) {
        throw new Error("Test 8 Failed: 'Built an Express server' failed to match Express!");
    }
    console.log("  ✓ Test 8 Passed: Express.js strictly requires technical contexts (express.js, express framework, express server).");

    console.log("\n================================================================");
    console.log("ALL PHASE 7.1/7.2 JD PARSER TESTS PASSED SUCCESSFULLY (8/8)!");
    console.log("================================================================");
    return true;
}

if (import.meta.url.endsWith(process.argv[1])) {
    runJdParserTests();
}
