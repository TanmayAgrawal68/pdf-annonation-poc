import React, { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, ChevronRight, ChevronLeft } from "lucide-react";
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
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [allDrawings, setAllDrawings] = useState([]);
  const canvasRef = useRef(null);
  const pdfRef = useRef(null);
  const pdfPageRef = useRef(null);
  const isDrawing = useRef(false);

  const [numPages, setNumPages] = useState(null); // To keep track of the total pages

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

  const handleAddDrawingClick = () => {
    setIsDrawingMode(true);
  };

  const handleDrawingStart = (event) => {
    if (!isDrawingMode || !canvasRef.current) return;
    isDrawing.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDrawingMove = (event) => {
    if (!isDrawingMode || !isDrawing.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();

    setAllDrawings((prev) => [...prev, { x, y }]);
  };

  const handleDrawingEnd = () => {
    if (!isDrawingMode) return;
    isDrawing.current = false;
  };

  const saveDrawingToPdf = async () => {
    const existingPdfBytes = await fetch(pdfUrl).then((res) =>
      res.arrayBuffer()
    );
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[pageNumber - 1];
    const { width, height } = firstPage.getSize();

    const canvas = canvasRef.current;
    const pngImageBytes = canvas.toDataURL("image/png");
    const pngImage = await pdfDoc.embedPng(pngImageBytes);
    const pngDims = pngImage.scale(1 / zoomLevel);

    firstPage.drawImage(pngImage, {
      x: 0,
      y: height - pngDims.height,
      width: pngDims.width,
      height: pngDims.height,
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const updatedPdfUrl = URL.createObjectURL(
      new Blob([modifiedPdfBytes], { type: "application/pdf" })
    );
    setPdfUrl(updatedPdfUrl);

    setIsDrawingMode(false);
  };

  const goToNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  return (
    <div className="pdf-editor-container w-full max-w-screen-lg mx-auto p-4">
      <div className="flex justify-between items-center bg-gray-100 p-4 shadow-md mb-4 rounded-lg">
        <h2 className="text-lg font-bold text-gray-700">PDF Editor</h2>
        <div className="space-x-4">
          <button
            onClick={handleAddAnnotationClick}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Add Annotation
          </button>
          <button
            onClick={handleAddDrawingClick}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Add Drawing
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPrevPage}
          disabled={pageNumber === 1}
          className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
        >
          <ChevronLeft />
        </button>
        <span className="text-lg">
          Page {pageNumber} of {numPages}
        </span>
        <button
          onClick={goToNextPage}
          disabled={pageNumber === numPages}
          className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
        >
          <ChevronRight />
        </button>
      </div>

      <div
        ref={pdfRef}
        className="pdf-view-container relative w-full max-w-screen-md mx-auto mb-4"
        onClick={isDrawingMode ? null : handleCanvasClick}
        onMouseDown={handleDrawingStart}
        onMouseMove={handleDrawingMove}
        onMouseUp={handleDrawingEnd}
        onMouseLeave={handleDrawingEnd}
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

        {isDrawingMode && (
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 50,
              width: "100%",
              height: "100%",
              border: "1px solid black",
            }}
            width={pdfPageRef.current?.offsetWidth || 800}
            height={pdfPageRef.current?.offsetHeight || 600}
          ></canvas>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setPageNumber(1);
          }}
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

      {isDrawingMode && (
        <button
          onClick={saveDrawingToPdf}
          className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 mt-2"
        >
          Save Drawing
        </button>
      )}
    </div>
  );
};

export default AnnotatedPdfUpdate;
