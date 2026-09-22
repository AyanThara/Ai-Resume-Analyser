let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    isLoading = true;
    const isNode = typeof window === "undefined";
    const importPromise = isNode
        ? import("pdfjs-dist/legacy/build/pdf.mjs")
        // @ts-expect-error - pdfjs-dist standard build for Browser environments
        : import("pdfjs-dist/build/pdf.mjs");

    loadPromise = importPromise.then((lib) => {
        if (!isNode) {
            lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }
        pdfjsLib = lib;
        isLoading = false;
        return lib;
    });

    return loadPromise;
}

/**
 * Extracts all readable text from an uploaded PDF file across all pages.
 * 
 * @param file The PDF File uploaded by the user
 * @returns Cleaned full text of the resume preserving line and page breaks
 * @throws Error if the file cannot be parsed or contains no readable text
 */
export async function extractTextFromPdf(file: File): Promise<string> {
    if (!file) {
        throw new Error("No file provided for text extraction.");
    }

    try {
        const lib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();

        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error("Uploaded PDF file is empty (0 bytes).");
        }

        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

        if (!pdf || pdf.numPages === 0) {
            throw new Error("PDF document contains no pages.");
        }

        const pageTexts: string[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
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

                // Clean up excessive whitespace while preserving line structure
                const cleanedPageLines = rawPageText
                    .split("\n")
                    .map((line) => line.replace(/[ \t]+/g, " ").trim())
                    .filter((line) => line.length > 0);

                if (cleanedPageLines.length > 0) {
                    pageTexts.push(cleanedPageLines.join("\n"));
                }
            } catch (pageErr) {
                console.warn(`[pdfTextExtractor] Warning: Failed to extract text from page ${pageNum}:`, pageErr);
                // Continue extracting remaining pages gracefully
            }
        }

        const fullText = pageTexts.join("\n\n").trim();

        if (!fullText) {
            throw new Error(
                "No readable text could be extracted from this PDF. The document may be scanned, image-only, password-protected, or corrupted."
            );
        }

        return fullText;
    } catch (err) {
        if (err instanceof Error) {
            throw err;
        }
        throw new Error(`Failed to extract text from PDF: ${String(err)}`);
    }
}
