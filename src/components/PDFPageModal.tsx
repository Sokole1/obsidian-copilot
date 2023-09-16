import { App, Modal, TFile, loadPdfJs } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import * as React from "react";

/**
 * Modal that allows the user to define a page range in their PDF
 */
export class PDFPageModal extends Modal {
	private root: Root | null = null;
	pageRange: { startPage: number; endPage: number } = {
		startPage: 0,
		endPage: 0,
	};
	file: TFile;
	onSubmit: (startPage: number, endPage: number) => void;

	constructor(
		app: App,
		file: TFile,
		onSubmit: (startPage: number, endPage: number) => void
	) {
		super(app);
		this.file = file;
		this.onSubmit = onSubmit;
	}

	setPageRange(startPage: number, endPage: number) {
		this.pageRange = { startPage, endPage };
	}

	onSubmitModal() {
		this.onSubmit(this.pageRange.startPage, this.pageRange.endPage);
		this.close();
	}

	async onOpen(): Promise<void> {
		const pdfBinary = await this.app.vault.readBinary(this.file);
		this.root = createRoot(this.contentEl);
		this.root.render(
			<PDFViewer
				pdfBinary={pdfBinary}
				setPageRange={this.setPageRange.bind(this)}
				onSubmit={this.onSubmitModal.bind(this)}
			/>
		);
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
		}
	}
}


interface PDFViewerProps {
	pdfBinary: ArrayBuffer;
	setPageRange: (startPage: number, endPage: number) => void;
	onSubmit: (startPage: number, endPage: number) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfBinary, setPageRange, onSubmit }) => {
	let maxPages = 1;

	const [pdfDocument, setPdfDocument] = React.useState<null | any>(null);
	const [currentPage, setCurrentPage] = React.useState<number>(1);
	const [pageCount, setPageCount] = React.useState<number>(0);
	const [totalPages, setTotalPages] = React.useState<number>(0);

	const [startPage, setStartPage] = React.useState<number>(1);
	const [endPage, setEndPage] = React.useState<number>(1);

	React.useEffect(() => {
		async function loadPdf() {
			const PDFjs = await loadPdfJs();
			// Load the PDF document
			PDFjs.getDocument(pdfBinary).promise.then(
				(pdf: { numPages: number }) => {
					setPdfDocument(pdf);
					maxPages = pdf.numPages;
					setPageCount(maxPages);
					setEndPage(maxPages);
					setTotalPages(maxPages);
					setPageRange(1, maxPages);
				}
			);
		}
		loadPdf();
	}, [pdfBinary]);



	const handlePageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(event.target.value, 10);
		setCurrentPage(value);
	};

	const handlePageBlur = () => {
		if (currentPage < 1) {
			setCurrentPage(1);
		} else if (currentPage > endPage) {
			setCurrentPage(endPage);
		}
	};

	const handlePageRangeChange = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const { name, value } = event.target;

		if (name === "startPage") {
			const newStartPage = parseInt(value, 10);
			setStartPage(newStartPage);
		} else if (name === "endPage") {
			const newEndPage = parseInt(value, 10);
			setEndPage(newEndPage);
		}
		setPageRange(startPage, endPage);
	};

	const handlePageRangeBlur = () => {
		let newStartPage = startPage;
		let newEndPage = endPage;

		if (Number.isNaN(newStartPage)) {
			newStartPage = 1;			
		}

		if (Number.isNaN(newEndPage)) {
			newEndPage = pageCount;
		}

		[newStartPage, newEndPage] = clampPageRange(newStartPage, newEndPage, pageCount);

		// Ensure currentPage is not out of range
		let newCurrentPage = currentPage;
		if (currentPage < newStartPage) {
			newCurrentPage = newStartPage;
		} else if (currentPage > newEndPage) {
			newCurrentPage = newEndPage;
		}

		setStartPage(newStartPage);
		setEndPage(newEndPage);
		setCurrentPage(newCurrentPage); // Update currentPage
		setTotalPages(newEndPage - newStartPage + 1);

		setPageRange(newStartPage, newEndPage);
	};

	const handleNextPage = () => {
		if (currentPage < endPage && currentPage < pageCount) {
			setCurrentPage(currentPage + 1);
		}
	};

	const handlePrevPage = () => {
		if (currentPage > startPage && currentPage > 1) {
			setCurrentPage(currentPage - 1);
		}
	};

	const renderPage = async (pageNumber: number) => {
		if (pdfDocument) {
			const page = await pdfDocument.getPage(pageNumber);
			const scale = 1;
			const viewport = page.getViewport({ scale });
			const canvas = document.getElementById(
				"pdf-canvas"
			) as HTMLCanvasElement;
			const context = canvas.getContext("2d");
			canvas.style.width = "100%";
			canvas.style.height = "100%";
			canvas.width = viewport.width;
			canvas.height = viewport.height;
			const renderContext = {
				canvasContext: context,
				viewport: viewport,
			};
			await page.render(renderContext);
		}
	};

	React.useEffect(() => {
		if (
			pdfDocument &&
			!Number.isNaN(currentPage) &&
			currentPage >= startPage &&
			currentPage <= endPage &&
			currentPage <= pageCount
		) {
			renderPage(currentPage);
		}
	}, [pdfDocument, currentPage, startPage, endPage, pageCount]);

	return (
		<div className="pdf-main-container">
			{/* Control Panel */}
			<div className="pdf-control-panel">
				{/* Current Page Controls */}
				<div className="pdf-control-section">
					<div className="pdf-flex-center pdf-range-label">
						View Page:
						<button 
						onClick={handlePrevPage}
						disabled={currentPage <= startPage || currentPage <= 1} // Disabled condition for "-"
						>
						-
					</button>
						<label className="pdf-input-label">
							<input
								className="pdf-input"
								type="number"
								value={currentPage}
								onChange={handlePageChange}
								onBlur={handlePageBlur}
							/>
						</label>
						<button 
						onClick={handleNextPage}
						disabled={currentPage >= endPage || currentPage >= pageCount} // Disabled condition for "+"
						>
						+
					</button>
					</div>
					<span>Total PDF Pages: {pageCount}</span>
				</div>
				<hr className="pdf-control-section-hr" />

				{/* Range Controls */}
				<div className="pdf-control-section">
					<label className="pdf-range-label">
						Range:
						<input
							className="pdf-input"
							type="number"
							name="startPage"
							value={startPage}
							onChange={handlePageRangeChange}
							onBlur={handlePageRangeBlur}
						/>
						-
						<input
							className="pdf-input"
							type="number"
							name="endPage"
							value={endPage}
							onChange={handlePageRangeChange}
							onBlur={handlePageRangeBlur}
						/>
					</label>
					<span>{totalPages} Pages Selected</span>
				</div>
				<hr className="pdf-control-section-hr" />

				{/* Submit Button */}
				<button onClick={() => onSubmit(startPage, endPage)}>
					Submit
				</button>
			</div>

			{/* PDF Canvas */}
			<div className="pdf-canvas-container">
				<canvas id="pdf-canvas"></canvas>
			</div>
		</div>
	);
}

/**
 * Make sure that 1 <= newStartPage <= newEndPage <= pageCount 
 * @param newStartPage 
 * @param newEndPage 
 * @param pageCount 
 * @returns 
 */
function clampPageRange(newStartPage: number, newEndPage: number, pageCount: number): [number, number] {
	if (newStartPage < 1) {
		newStartPage = 1;
	}

	if (newEndPage > pageCount) {
		newEndPage = pageCount;
	}

	if (newStartPage > newEndPage) {
		newStartPage = newEndPage;
	}

	return [newStartPage, newEndPage];
}