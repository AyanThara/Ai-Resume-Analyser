import * as fs from "fs";
import { calculateAtsScore } from "../app/lib/atsEngine";
import { segmentResumeSections, parseJobDescription, matchSkillsAgainstResume } from "../app/lib/jdParser";


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

async function main() {
    const pdfPath = "/Users/ayanthara/Ayan_Thara_Resume.pdf";
    console.log(`Checking PDF at ${pdfPath}...`);
    if (!fs.existsSync(pdfPath)) {
        throw new Error(`File not found: ${pdfPath}`);
    }

    const dataBuffer = fs.readFileSync(pdfPath);
    console.log(`Read ${dataBuffer.byteLength} bytes.`);

    // Load pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const uint8Array = new Uint8Array(dataBuffer);
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    console.log(`PDF Pages: ${pdf.numPages}`);

    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        let rawPageText = "";
        for (const item of textContent.items) {
            if ("str" in item && typeof item.str === "string") {
                rawPageText += item.str;
                if (item.hasEOL) {
                    rawPageText += "\n";
                } else if (item.str.length > 0 && !item.str.endsWith(" ")) {
                    rawPageText += " ";
                }
            }
        }
        const cleanedPageLines = rawPageText
            .split("\n")
            .map((line: string) => line.replace(/[ \t]+/g, " ").trim())
            .filter((line: string) => line.length > 0);

        if (cleanedPageLines.length > 0) {
            pageTexts.push(cleanedPageLines.join("\n"));
        }
    }

    const fullText = pageTexts.join("\n\n").trim();
    console.log(`\n================================================================`);
    console.log(`RAW EXTRACTED TEXT (${fullText.length} chars):`);
    console.log(`================================================================`);
    console.log(fullText);
    console.log(`================================================================\n`);

    // Trace Sections
    console.log(`--- TRACING segmentResumeSections ---`);
    const sections = segmentResumeSections(fullText);
    console.log(`Detected ${sections.length} segments:`);
    for (const sec of sections) {
        console.log(`Section: "${sec.name}" (start: ${sec.startIndex}, end: ${sec.endIndex}, length: ${sec.content.length})`);
        console.log(`Snippet: ${JSON.stringify(sec.content.slice(0, 120))}...`);
    }

    // Trace calculateAtsScore
    console.log(`\n--- TRACING calculateAtsScore ---`);
    const atsResult = calculateAtsScore(fullText, testJdSoftwareIntern, "Software Engineer Intern");
    console.log(`Overall Score: ${atsResult.overallScore}`);
    console.log(`ATS Score: ${atsResult.atsScore}`);
    console.log(`Breakdown:`, atsResult.breakdown);
    console.log(`Detected Sections in ATS:`, atsResult.detectedSections);
    console.log(`Missing Sections in ATS:`, atsResult.missingSections);
    console.log(`Matched Keywords:`, atsResult.matchedKeywords);
    console.log(`Signals:`, atsResult.signals);

    // Trace Diagnostics
    const diag = atsResult.diagnostics;
    if (diag) {
        console.log(`\n--- TRACING DIAGNOSTICS ---`);
        console.log(`Alignment Signal:`, diag.alignmentSignal);
        console.log(`Required Skills Count: ${diag.requiredSkillReport.items.length}`);
        for (const it of diag.requiredSkillReport.items) {
            console.log(`  - ${it.display}: verdict=${it.verdict}, sections=${JSON.stringify(it.sections)}, strength=${it.evidenceStrength}`);
        }
        console.log(`Placement Optimal: ${diag.placementAnalysis.optimalCount}, SkillsOnly: ${diag.placementAnalysis.skillsOnlyCount}, Peripheral: ${diag.placementAnalysis.peripheralCount}`);
        console.log(`Bullets Count: Total=${diag.achievementAnalysis.totalBullets}, Strong=${diag.achievementAnalysis.strongBullets}, NeedsMetrics=${diag.achievementAnalysis.needsMetricsBullets}, Weak=${diag.achievementAnalysis.weakBullets}`);
        console.log(`Recommendations: Critical=${diag.recommendations.critical.length}, Important=${diag.recommendations.important.length}, Optional=${diag.recommendations.optional.length}`);
    }
}

main().catch(err => {
    console.error("FATAL ERROR in audit:", err);
    process.exit(1);
});
