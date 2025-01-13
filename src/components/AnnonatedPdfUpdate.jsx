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
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const pdfRef = useRef(null);
  const pdfPageRef = useRef(null);

  // Initialize PDF document loading
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

  // Function to add annotation to the PDF using pdf-lib
  const addAnnotation = async (text = "This is a comment annotation") => {
    const existingPdfBytes = await fetch(file).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Add text annotation
    firstPage.drawText(text, {
      x: 100,
      y: 350,
      size: 12,
      color: rgb(0, 0, 0),
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const pdfUrl = URL.createObjectURL(
      new Blob([modifiedPdfBytes], { type: "application/pdf" })
    );
    setPdfUrl(pdfUrl);
  };

  // Function to toggle between pages
  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, 5)); // Assuming 5 pages as max
  };

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3)); // Max zoom level is 3
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 0.5)); // Min zoom level is 0.5
  };

  // Drawing on the PDF (handling touch or mouse events)
  const startDrawing = () => {
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawOnPdf = (event) => {
    if (!isDrawing || !pdfPageRef.current) return;

    const page = pdfPageRef.current;
    const rect = page.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    if (isDrawing) {
      setAnnotations((prevAnnotations) => [
        ...prevAnnotations,
        { x: offsetX, y: offsetY, size: 5 },
      ]);
    }
  };

  const handleTouchMove = (event) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      drawOnPdf(touch);
    }
  };

  return (
    <div className="pdf-editor-container w-full max-w-screen-lg mx-auto p-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-gray-100 p-4 shadow-md mb-4 rounded-lg">
        <h2 className="text-lg font-bold text-gray-700">PDF Editor</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={addAnnotation}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Add Annotation
          </button>
          <button
            onClick={startDrawing}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Start Drawing
          </button>
          <button
            onClick={stopDrawing}
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            Stop Drawing
          </button>
          <button
            onClick={goToPreviousPage}
            className="bg-gray-200 p-2 rounded hover:bg-gray-300"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={goToNextPage}
            className="bg-gray-200 p-2 rounded hover:bg-gray-300"
          >
            <ChevronRight />
          </button>
          <button
            onClick={handleZoomIn}
            className="bg-gray-200 p-2 rounded hover:bg-gray-300"
          >
            <ZoomIn />
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-gray-200 p-2 rounded hover:bg-gray-300"
          >
            <ZoomOut />
          </button>
        </div>
      </div>

      {/* PDF View */}
      <div
        ref={pdfRef}
        className="pdf-view-container relative w-full max-w-screen-md mx-auto mb-4"
        onMouseMove={drawOnPdf}
        onTouchMove={handleTouchMove}
        style={{ position: "relative" }}
      >
        {/* Drawing annotations */}
        <div className="annotations-layer absolute top-0 left-0 w-full h-full pointer-events-none z-10">
          {annotations.map((annotation, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                top: `${annotation.y}px`,
                left: `${annotation.x}px`,
                width: `${annotation.size}px`,
                height: `${annotation.size}px`,
                backgroundColor: "black", // Black color for the drawing
                borderRadius: "50%",
                zIndex: 10,
              }}
            />
          ))}
        </div>
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setPageNumber(numPages)}
        >
          <Page
            pageNumber={pageNumber}
            scale={zoomLevel}
            ref={(ref) => (pdfPageRef.current = ref)} // Using the ref directly here
            className="relative z-0"
          />
        </Document>
      </div>

      {/* Zoom Slider */}
      <div className="zoom-slider w-full max-w-lg mx-auto mt-4">
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={zoomLevel}
          onChange={(e) => setZoomLevel(e.target.value)}
          className="w-full h-2 bg-gray-300 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50%</span>
          <span>100%</span>
          <span>300%</span>
        </div>
      </div>
    </div>
  );
};

export default AnnotatedPdfUpdate;
