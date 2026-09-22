import * as fs from 'fs';

async function check() {
    const dataBuffer = fs.readFileSync('/Users/ayanthara/Ayan_Thara_Resume.pdf');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    let hasEOLCount = 0;
    let totalItems = textContent.items.length;
    for (const item of textContent.items) {
        if ("hasEOL" in item && item.hasEOL) hasEOLCount++;
    }
    console.log('Total items:', totalItems, 'hasEOL items:', hasEOLCount);

    // Let's also see what happens if hasEOL is NOT set!
    // In many PDFs or pdfjs-dist versions/workers, hasEOL is FALSE for all items or most items!
}

check();
