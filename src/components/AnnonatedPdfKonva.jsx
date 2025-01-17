import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Text, Line } from "react-konva";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import { ZoomIn, ZoomOut, ChevronRight, ChevronLeft } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs.worker.min.js";

const AnnotatedPdfkonva = ({ file }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState("black");
  const [selectedFontSize, setSelectedFontSize] = useState(16);
  const [newText, setNewText] = useState(null);

  const stageRef = useRef(null);
  const pdfPageRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    const fetchPdf = async () => {
      const pdfBlob = await fetch(file).then((res) => res.blob());
      setPdfUrl(URL.createObjectURL(pdfBlob));
    };
    fetchPdf();
  }, [file]);

  const handleAddText = (text) => {
    setNewText({
      x: 50,
      y: 50,
      text: text,
      fontSize: selectedFontSize,
      fill: selectedColor,
    });
  };

  const handleTextDragEnd = (e, index) => {
    const updatedAnnotations = [...annotations];
    updatedAnnotations[index] = {
      ...updatedAnnotations[index],
      x: e.target.x(),
      y: e.target.y(),
    };
    setAnnotations(updatedAnnotations);
  };

  const handleStageMouseDown = (e) => {
    if (!isDrawing) return;
    const pos = e.target.getStage().getPointerPosition();
    setDrawings([
      ...drawings,
      { points: [pos.x, pos.y], stroke: selectedColor, strokeWidth: 2 },
    ]);
  };

  const handleStageMouseMove = (e) => {
    if (!isDrawing || drawings.length === 0) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastDrawing = drawings[drawings.length - 1];
    lastDrawing.points = lastDrawing.points.concat([point.x, point.y]);
    setDrawings([...drawings.slice(0, -1), lastDrawing]);
  };

  const handleSaveDrawing = () => {
    setIsDrawing(false);
  };

  const goToNextPage = () => {
    if (pageNumber < numPages) setPageNumber(pageNumber + 1);
  };

  const goToPrevPage = () => {
    if (pageNumber > 1) setPageNumber(pageNumber - 1);
  };

  const handleZoomIn = () => setZoomLevel((prev) => prev + 0.25);

  const handleZoomOut = () =>
    setZoomLevel((prev) => Math.max(0.25, prev - 0.25));

  return (
    <div className="pdf-editor-container w-full max-w-screen-lg mx-auto md:p-4">
      <div className="flex justify-between items-center bg-gray-100 sm:p-2 md:p-4 shadow-md mb-4 rounded-lg">
        <h2 className="sm:text-sm md:text-lg font-bold text-gray-700">
          PDF Editor
        </h2>
        <div className="flex md:space-x-4">
          <button
            onClick={handleAddText}
            className="bg-blue-500 text-white md:py-2 md:px-4 rounded hover:bg-blue-600"
          >
            Add Text
          </button>
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className="bg-green-500 text-white md:py-2 md:px-4 rounded hover:bg-green-600"
          >
            {isDrawing ? "Finish Drawing" : "Draw"}
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-gray-500 text-white md:py-2 md:px-4 rounded hover:bg-gray-600"
          >
            <ZoomOut />
          </button>
          <button
            onClick={handleZoomIn}
            className="bg-gray-500 text-white md:py-2 md:px-4 rounded hover:bg-gray-600"
          >
            <ZoomIn />
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

      <div className="relative">
        <div className="relative flex justify-center items-center w-full">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setPageNumber(1);
            }}
            className="shadow-2xl"
          >
            <Page
              pageNumber={pageNumber}
              scale={zoomLevel}
              inputRef={(ref) => {
                if (ref) pdfPageRef.current = ref;
              }}
              className="relative z-0"
              style={{ display: "inline-block", border: "1px solid black" }}
            />
          </Document>
        </div>

        <Stage
          width={pdfPageRef.current?.offsetWidth || 800}
          height={pdfPageRef.current?.offsetHeight || 600}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleSaveDrawing}
          ref={stageRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 50,
            width: "100%",
            height: "100%",
          }}
        >
          <Layer>
            {annotations.map((annotation, index) => (
              <Text
                key={index}
                draggable
                {...annotation}
                onDragEnd={(e) => handleTextDragEnd(e, index)}
              />
            ))}
            {drawings.map((drawing, index) => (
              <Line key={index} points={drawing.points} {...drawing} />
            ))}
          </Layer>
        </Stage>
      </div>
      {isDrawing && (
        <button
          onClick={handleSaveDrawing}
          className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 mt-2"
        >
          Save Drawing
        </button>
      )}
    </div>
  );
};

export default AnnotatedPdfkonva;
