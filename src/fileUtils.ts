import { App, TFile, loadPdfJs, Notice } from "obsidian";
import { PDFPageModal } from "./components/PDFPageModal"
import { PAGES_FOR_LARGE_PDF } from "./constants";

async function loadPDF(app: App, file: TFile) {
  const PDFJS = await loadPdfJs();
  const pdfBinary = await app.vault.readBinary(file);
  const doc = await PDFJS.getDocument(pdfBinary).promise;
  return doc;
}

async function getPDFTextFromPages(doc: any, startIndex: number, endIndex: number): Promise<String[]> {
  let textContent = [];
  for (let i = startIndex; i < endIndex; i++) {
    let page = await doc.getPage(i + 1);
    let text = await page.getTextContent();

    if (text.items.length > 0) {
      let pageText = text.items.map((item: any) => item.str).join(" ");
      pageText = pageText.replace(/\s+/g, ' ').trim(); // Remove potentially duplicated spaces
      textContent.push(pageText);
    }
  }

  return textContent;
}

/**
 * Retrieves all the text content of a PDF file.
 * @param app The Obsidian App object.
 * @param file The PDF file to read.
 * @returns A Promise that resolves to the text content of the PDF file.
 */
export async function getAllPDFText(app: App, file: TFile): Promise<string | null> {
  const doc = await loadPDF(app, file);

  if (doc.numPages > PAGES_FOR_LARGE_PDF) {
    return new Promise((resolve, reject) => {
      new PDFPageModal(app, file, async (startPage, endPage) => {
        if (startPage == 0 && endPage == 0) { // This happens if they exit the modal without submitting
          resolve(null);
          return;
        }
        new Notice(
          "Reading PDF Pages: " +
            startPage +
            " - " +
            endPage
        );
        let textContent = await getPDFTextFromPages(doc, startPage - 1, endPage);
        resolve(textContent.length == 0 ? null : textContent.join(""));
      }).open();
    });
  } else {
    let textContent = await getPDFTextFromPages(doc, 0, doc.numPages);
    return textContent.length == 0 ? null : textContent.join("");
  }
}


export const FileUtils = {
	getAllPDFText,
}