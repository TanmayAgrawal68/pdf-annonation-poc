import React, { useState, useRef, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { Document, Page } from "react-pdf";
import { pdfjs } from "react-pdf";
import {
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  Undo,
  Redo,
  Highlighter
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { saveAs } from "file-saver";

pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs.worker.min.js";
const tabcolors = {
  colorblack: rgb(0, 0, 0),
  colorred: rgb(1, 0, 0),
  colorgreen: rgb(0, 1, 0),
  coloryellow: rgb(1, 1, 0), // Highlighter color
};
const AnnotatedPdfUpdate = ({ file }) => {
  const [undoCount, setUndoCount] = useState(0);
  const [editedPdfs, setEditedPdfs] = useState([]);
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
  const [numPages, setNumPages] = useState(null);
  const [strokeColor, setStrokeColor] = useState("black");
  const [textColor, setTextColor] = useState(tabcolors.colorblack);
  const [lineThickness, setLineThickness] = useState(0.25);
  const [fontSize, setFontSize] = useState(12);
  const [isDragging, setIsDragging] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageSize, setImageSize] = useState({ width: 100, height: 100 });
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [highlightRects, setHighlightRects] = useState([]);
  const [pdfDocExisting, setPdfDocExisting] = useState('')
  useEffect(() => {
    if (!file) return;
    const fetchPdf = async () => {
      const existingPdfBytes = await fetch(file).then((res) =>
        res.arrayBuffer()
      );
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      setPdfDocExisting(pdfDoc)
      const modifiedPdfBytes = await pdfDoc.save();
      const pdfUrl = URL.createObjectURL(
        new Blob([modifiedPdfBytes], { type: "application/pdf" })
      );
      setPdfUrl(pdfUrl);
      setEditedPdfs([modifiedPdfBytes]);
    };
    fetchPdf();
    const handleResize = () => {
      if (canvasRef.current && pdfPageRef.current && pdfRef.current) {
        const pdfContainerWidth = pdfRef.current.offsetWidth;
        const pdfPageWidth = pdfPageRef.current.offsetWidth;

        setZoomLevel(pdfContainerWidth / pdfPageWidth);
        console.log("zoomLevel : ", zoomLevel);
        console.log("zzom calc : ");

        canvasRef.current.width = pdfPageWidth;
        canvasRef.current.height = pdfPageRef.current.offsetHeight;
      } else {
        setZoomLevel(0.6);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Initial adjustment
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [file]);

  const handleAddAnnotationClick = () => {
    setIsAddingAnnotation(true);
  };
  const handleHighlightClick = () => {
    setIsHighlighting(!isHighlighting);
  };

  const handleCanvasClick = async (event) => {
    if (!isAddingAnnotation || !pdfPageRef.current) return;

    const rect = pdfPageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newAnnotation = {
      x,
      y,
      text: "",
      fontSize: +fontSize,
      color: strokeColor,
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

    // allAnnotations.forEach((annotation) => {
    //   firstPage.drawText(annotation.text, {
    //     x: annotation.x / zoomLevel,
    //     y: height - annotation.y / zoomLevel,
    //     size: annotation.fontSize,
    //     color: strokeColor,
    //   });
    // });

    firstPage.drawText(currentAnnotation.text, {
      x: currentAnnotation.x / zoomLevel,
      y: height - currentAnnotation.y / zoomLevel,
      size: currentAnnotation.fontSize,
      color: textColor,
    });

    const modifiedPdfBytes = await pdfDoc.save();
    const updatedPdfUrl = URL.createObjectURL(
      new Blob([modifiedPdfBytes], { type: "application/pdf" })
    );
    setPdfUrl(updatedPdfUrl);
    setEditedPdfs((prev) => [...prev, modifiedPdfBytes]);

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

    const x = (event.touches?.[0]?.clientX || event.clientX) - rect.left;
    const y = (event.touches?.[0]?.clientY || event.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(
      x * (canvas.width / rect.width),
      y * (canvas.height / rect.height)
    );
  };

  const handleDrawingMove = (event) => {
    if (!isDrawingMode || !isDrawing.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    const x = (event.touches?.[0]?.clientX || event.clientX) - rect.left;
    const y = (event.touches?.[0]?.clientY || event.clientY) - rect.top;

    ctx.lineTo(
      x * (canvas.width / rect.width),
      y * (canvas.height / rect.height)
    );
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineThickness;
    ctx.lineJoin = "miter";
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
  const handleZoomIn = () => setZoomLevel((prev) => prev + 0.25);

  const handleZoomOut = () =>
    setZoomLevel((prev) => Math.max(0.25, prev - 0.25));
  const downloadPdf = async () => {
    if (!pdfUrl) return;

    const response = await fetch(pdfUrl);
    const blob = await response.blob();

    // Save the PDF file
    saveAs(blob, "annotated.pdf");
  };
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setUploadedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const handleUndo = () => {
    undoCount >= 0 && setUndoCount((prev) => prev + 1);
    console.log("all Annonations : ", editedPdfs, "undoCount : ", undoCount);
    const lastEdited = editedPdfs.length - undoCount - 1;
    console.log("lastEdited : ", lastEdited);
    const modifiedPdfBytes = editedPdfs[lastEdited];
    if (modifiedPdfBytes) {
      const updatedPdfUrl = URL.createObjectURL(
        new Blob([modifiedPdfBytes], { type: "application/pdf" })
      );
      setPdfUrl(updatedPdfUrl);
    }
  };
  const handleRedo = () => {
    setUndoCount((prev) => prev - 1);
    console.log(
      "all Annonations redo  : ",
      editedPdfs,
      "undoCount redo : ",
      undoCount
    );
    const lastEdited = editedPdfs.length - undoCount - 1;
    console.log("lastEdited Redo : ", lastEdited);
    const modifiedPdfBytes = editedPdfs[lastEdited >= 0 ? lastEdited : 0];
    if (modifiedPdfBytes) {
      const updatedPdfUrl = URL.createObjectURL(
        new Blob([modifiedPdfBytes], { type: "application/pdf" })
      );
      setPdfUrl(updatedPdfUrl);

    }
  };

  let startX = null;
  let startY = null;
  let isTextSelected = false;

  const calculateHighlightDimensions = (rect) => {
    const pdfRect = pdfPageRef.current.getBoundingClientRect();

    const x = rect.left - pdfRect.left;
    const y = rect.top - pdfRect.top;
    const width = rect.width;
    const height = rect.height;

    return { x, y, width, height };
  };

  const addHighlightToPdf = async (highlight) => {
    if (!isHighlighting) return;
    console.log("highlight", highlight);

    const existingPdfBytes = await fetch(pdfUrl).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const page = pdfDoc.getPages()[pageNumber - 1];
    const { height } = page.getSize();

    page.drawRectangle({
      x: highlight.x / zoomLevel,
      y: height - highlight.y / zoomLevel - highlight.height / zoomLevel,
      width: highlight.width / zoomLevel,
      height: highlight.height / zoomLevel,
      color: tabcolors.coloryellow,
      opacity: 0.5,
    });

    const updatedPdfBytes = await pdfDoc.save();
    setPdfUrl(URL.createObjectURL(new Blob([updatedPdfBytes], { type: "application/pdf" })));
  };

  // MouseDown: Capture the start coordinates
  const handleCanvasMouseDown = (event) => {
    const { clientX, clientY } = event;
    startX = clientX;
    startY = clientY;
    isTextSelected = false; // Reset selection flag
    console.log("Mouse down at:", { startX, startY });
  };

  // MouseUp: Calculate dimensions and add the highlight
  const handleCanvasMouseUp = (event) => {
    if (!isHighlighting) return;

    if (startX === null || startY === null) {
      console.error("Start coordinates not set!");
      return;
    }

    const selection = window.getSelection();
    if (selection.rangeCount === 0 || !selection.toString().trim()) {
      console.log("No text selected!");
      return;
    }

    // Mark text as selected
    isTextSelected = true;

    // Get the bounding rectangle of the selected text
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate highlight dimensions
    const dimensions = calculateHighlightDimensions(rect);

    setHighlightRects([...highlightRects, dimensions]);
    addHighlightToPdf(dimensions);

    // Reset selection and coordinates
    selection.removeAllRanges();
    startX = null;
    startY = null;
    console.log("Mouse up at:", { endX: event.clientX, endY: event.clientY });
  };
  return (
    <div className="pdf-editor-container w-full max-w-screen-lg mx-auto md:p-4">
      <div className=" md:flex justify-between items-center bg-gray-100 sm:p-2  md:p-2 shadow-md mb-4 rounded-lg">
        <h2 className=" sm:text-sm md:text-lg  font-bold text-gray-700">
          PDF Editor
        </h2>
        <div className="flex flex-col gap-2 md:flex-row md:space-x-4">
          <button
            onClick={handleUndo}
            className="bg-gray-400 text-white md:py-2 md:px-4 rounded hover:bg-purple-600"
          >
            <Undo />
          </button>
          <button
            onClick={handleRedo}
            className="bg-gray-400 text-white md:py-2 md:px-4 rounded hover:bg-purple-600"
          >
            <Redo />
          </button>
          <button
            onClick={downloadPdf}
            className="bg-purple-500 text-white md:py-2 md:px-4 rounded hover:bg-purple-600"
          >
            Download PDF
          </button>
          <button
            onClick={handleAddAnnotationClick}
            className="bg-blue-500 text-white sm:p-4 md:py-2 md:px-4 rounded hover:bg-blue-600"
          >
            Add Annotation
          </button>
          <button
            onClick={handleAddDrawingClick}
            className="bg-green-500 text-white  md:py-2 md:px-4 rounded hover:bg-green-600"
          >
            Add Drawing
          </button>
          <button onClick={handleHighlightClick}
          style={{
            backgroundColor: isHighlighting ? "yellow" : "white",
            border: "1px solid gray",
            borderRadius: "5px",
            padding: "5px 10px",
            cursor: "pointer",
          }}><Highlighter /></button>
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
      {(isDrawingMode || isAddingAnnotation) && (
        <div className=" flex gap-5 items-center justify-center mt-2 mb-2">
          <div className=" flex space-x-3 h-4 items-center ">
            <p>Color set : </p>
            <button
              onClick={() => {
                setStrokeColor("red");
                setTextColor(tabcolors.colorred);
              }}
              className="bg-red-500 p-2 rounded-full"
            ></button>
            <button
              onClick={() => {
                setStrokeColor("black");
                setTextColor(tabcolors.colorblack);
              }}
              className="bg-black p-2 rounded-full"
            ></button>
            <button
              onClick={() => {
                setStrokeColor("green");
                setTextColor(tabcolors.colorgreen);
              }}
              className="bg-green-500 p-2 rounded-full"
            ></button>
          </div>
          {isDrawingMode ? (
            <div>
              <select
                onChange={(e) => setLineThickness(e.target.value)}
                name="line Thickness"
                id="lt"
              >
                <option value={0.25}>fine thick 0.25</option>
                <option value={0.5}>semi fine thick 0.5</option>
                <option value={1}> thick 1</option>
                <option value={1.25}> marker 1.25</option>
              </select>
            </div>
          ) : (
            <div className="space-x-3">
              <div>
                <label>Font Size : </label>
                <input
                  className="border-gray-500 border-2 w-16 px-2 rounded-full"
                  type="number"
                  placeholder={fontSize + "px"}
                  onChange={(e) => setFontSize(e.target.value)}
                ></input>
              </div>
            </div>
          )}
        </div>
      )}

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
        className="pdf-view-container relative mx-auto mb-4 flex justify-center items-center"
        onClick={isHighlighting
          ? addHighlightToPdf
          : isDrawingMode ? null
            : handleCanvasClick
        }
        onMouseUp={isHighlighting
          ? handleCanvasMouseUp
          : handleDrawingEnd
        }
        onMouseDown={isHighlighting
          ? handleCanvasMouseDown
          : handleDrawingStart
        }
        onMouseMove={handleDrawingMove}
        onMouseLeave={handleDrawingEnd}
        onTouchStart={handleDrawingStart}
        onTouchMove={handleDrawingMove}
        onTouchEnd={handleDrawingEnd}
        style={{ overflow: "hidden", border: "1px solid black" }}
      >
        {isAddingAnnotation && currentAnnotation && (
          <textarea
            style={{
              position: "absolute",
              top: currentAnnotation.y - 50,
              left: currentAnnotation.x + 200,
              zIndex: 100,
              fontSize: `${currentAnnotation.fontSize}px`,
              color: strokeColor,
              opacity: "0.9",
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
              // backgroundColor: "yellow",
              // opacity: 0.5,
            }}
            width={pdfPageRef.current?.offsetWidth || 800}
            height={pdfPageRef.current?.offsetHeight || 600}
          ></canvas>
        )}

        <div className="relative flex justify-center items-center w-full">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setPageNumber(pageNumber);
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
              style={{
                display: "inline-block",
                border: "1px solid black",
              }}
            />
          </Document>
        </div>
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
