import { TFile, App, loadPdfJs, Modal, Setting } from 'obsidian';
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FileUtils } from '@/fileUtils';
// See https://docs.obsidian.md/Plugins/User+interface/Modals

export class PDFPageSelectorModal extends Modal {
    private file: TFile;
    private range: { start: number; end: number } = { start: 0, end: 0 };
    private onSubmit: (range: { start: number; end: number }) => void;

    constructor(app: App, file: TFile, onSubmit: (range: { start: number; end: number }) => void) {
        super(app);
        this.file = file;
        this.onSubmit = onSubmit;
        this.range.end = 5;
    }

    onOpen() {
        const { contentEl } = this;
        const container = contentEl.createDiv();
        contentEl.createEl("h1", { text: "What's your name?" });

        new Setting(contentEl)
          .setName("Start")
          .addText((text) =>
            text.onChange((value) => {
              this.range.start = parseInt(value);
            }));

        new Setting(contentEl)
          .setName("End")
          .addText((text) =>
            text.onChange((value) => {
              this.range.end = parseInt(value);
            }));

        new Setting(contentEl)
          .addButton((btn) =>
            btn
              .setButtonText("Submit")
              .setCta()
              .onClick(() => {
                this.close();
                this.onSubmit(this.range);
              }));
      }

    onClose() {
      let { contentEl } = this;
      contentEl.empty();
    }
}

interface PDFViewerProps {
    app: App;
    file: TFile;
    onRangeSelect: (range: { start: number; end: number }) => void;
}

// Use PDFjs to preview the PDF and allow users to select a range of pages 
export const PDFViewer: React.FC<PDFViewerProps> = ({ app, file, onRangeSelect }) => {
  const pdfjs = loadPdfJs();

}
