import React, { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, ChevronRight, ChevronLeft } from "lucide-react"; // ShadCN Icons
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs.worker.min.js";

const AnnotatedPdfUpdate = ({ file }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [allAnnotations, setAllAnnotations] = useState([]);
  const pdfRef = useRef(null);
  const pdfPageRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    const fetchPdf = async () => {
      const existingPdfBytes = await fetch(file).then((res) =>
        res.arrayBuffer()
      );
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const modifiedPdfBytes = await pdfDoc.save();
      const pdfUrl = URL.createObjectURL(
        new Blob([modifiedPdfBytes], { type: "application/pdf" })
      );
      setPdfUrl(pdfUrl);
    };
    fetchPdf();
  }, [file]);

  const handleAddAnnotationClick = () => {
    setIsAddingAnnotation(true);
  };

  const handleCanvasClick = (event) => {
    if (!isAddingAnnotation || !pdfPageRef.current) return;

    const rect = pdfPageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newAnnotation = {
      x,
      y,
      text: "",
      fontSize: 16,
      color: "black",
    };
    setCurrentAnnotation(newAnnotation);
  };

  const handleTextChange = (event) => {
    if (!currentAnnotation) return;
    setCurrentAnnotation({ ...currentAnnotation, text: event.target.value });
  };

  const handleKeyDown = async (event) => {
    if (event.key !== "Enter" || !currentAnnotation.text.trim()) return;

    const existingPdfBytes = await fetch(pdfUrl).then((res) =>
      res.arrayBuffer()
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[pageNumber - 1];
    const { width, height } = firstPage.getSize();

    // Draw all previous annotations
    allAnnotations.forEach((annotation) => {
      firstPage.drawText(annotation.text, {
        x: annotation.x / zoomLevel,
        y: height - annotation.y / zoomLevel,
        size: annotation.fontSize,
        color: rgb(0, 0, 0),
      });
    });

    // Draw the current annotation
    firstPage.drawText(currentAnnotation.text, {
      x: currentAnnotation.x / zoomLevel,
      y: height - currentAnnotation.y / zoomLevel,
      size: currentAnnotation.fontSize,
      color: rgb(0, 0, 0),
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const updatedPdfUrl = URL.createObjectURL(
      new Blob([modifiedPdfBytes], { type: "application/pdf" })
    );
    setPdfUrl(updatedPdfUrl);

    setAllAnnotations([...allAnnotations, currentAnnotation]);
    setCurrentAnnotation(null);
    setIsAddingAnnotation(false);
  };

  return (
    <div className="pdf-editor-container w-full max-w-screen-lg mx-auto p-4">
      <div className="flex justify-between items-center bg-gray-100 p-4 shadow-md mb-4 rounded-lg">
        <h2 className="text-lg font-bold text-gray-700">PDF Editor</h2>
        <button
          onClick={handleAddAnnotationClick}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Add Annotation
        </button>
      </div>

      <div
        ref={pdfRef}
        className="pdf-view-container relative w-full max-w-screen-md mx-auto mb-4"
        onClick={handleCanvasClick}
      >
        {isAddingAnnotation && currentAnnotation && (
          <textarea
            style={{
              position: "absolute",
              top: currentAnnotation.y,
              left: currentAnnotation.x,
              zIndex: 100,
              fontSize: `${currentAnnotation.fontSize}px`,
              color: currentAnnotation.color,
            }}
            value={currentAnnotation.text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setPageNumber(numPages)}
        >
          <Page
            pageNumber={pageNumber}
            scale={zoomLevel}
            inputRef={(ref) => {
              if (ref) pdfPageRef.current = ref;
            }}
            className="relative z-0"
          />
        </Document>
      </div>
    </div>
  );
};

export default AnnotatedPdfUpdate;
