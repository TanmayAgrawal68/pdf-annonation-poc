import { useState, useRef, useEffect } from "react";
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
  ImagePlus,
  PenTool,
  Type,
  Download,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { saveAs } from "file-saver";

pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs.worker.min.js";
const tabcolors = {
  colorblack: rgb(0, 0, 0),
  colorred: rgb(1, 0, 0),
  colorgreen: rgb(0, 1, 0),
};
// eslint-disable-next-line react/prop-types
const AnnotatedPdfUpdate = ({ file }) => {
  const [undoCount, setUndoCount] = useState(0);
  const [editedPdfs, setEditedPdfs] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [annotationCordinates, setAnnotationCordinates] = useState({});
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

  //for uploading images
  const [uploadImage, setUploadImage] = useState(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [scale, setScale] = useState(1); // Resizing factor
  const [rotation, setRotation] = useState(0); // Rotation in degrees
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isImageMode) {
      drawImageOnCanvas();
    }
  }, [isImageMode, scale, rotation, uploadImage]);

  const handleAddAnnotationClick = () => {
    setIsAddingAnnotation(true);
  };
  //To get event x and y co-ordinate for touch and click event
  const getEventCoordinates = (canvas, event) => {
    let rect = null;
    if (canvas) {
      rect = canvas.getBoundingClientRect();
    } else {
      rect = pdfPageRef.current.getBoundingClientRect();
    }
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleCanvasClick = (event) => {
    if (!isAddingAnnotation || !pdfPageRef.current) return;

    // const rect = pdfPageRef.current.getBoundingClientRect();
    // const x = event.clientX - rect.left;
    // const y = event.clientY - rect.top;
    const { x, y } = getEventCoordinates(null, event);
    setAnnotationCordinates({ x, y });
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
    const { height } = firstPage.getSize();

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
    const { height } = firstPage.getSize();

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
    setIsImageMode(false);
    fileInputRef.current.value = ""; // Clear input file
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

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    setIsImageMode(true);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  // const drawImageOnCanvas = () => {
  //   const canvas = canvasRef.current;
  //   const ctx = canvas.getContext("2d");
  //   const img = new Image();
  //   img.src = uploadImage;
  //   console.log("image : ", uploadImage);

  //   img.onload = () => {
  //     ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redraw

  //     // Re-render the PDF content if needed
  //     // renderPDF(pdfFile);

  //     ctx.save();

  //     // Apply transformations (scaling and rotation)
  //     ctx.translate(canvas.width / 2, canvas.height / 2); // Move to center for rotation
  //     ctx.rotate((rotation * Math.PI) / 180);
  //     ctx.scale(scale, scale);

  //     // Draw image at adjusted position
  //     ctx.drawImage(
  //       img,
  //       -img.width / 2,
  //       -img.height / 2,
  //       img.width,
  //       img.height
  //     );

  //     ctx.restore();

  //   };

  // };
  // const drawImageOnCanvas = () => {
  //   const canvas = canvasRef.current;
  //   const ctx = canvas.getContext("2d");
  //   const img = new Image();
  //   img.src = uploadImage;

  //   // Initial position for the image
  //   let imageX = canvas.width / 2;
  //   let imageY = canvas.height / 2;
  //   let isDragging = false;
  //   let dragOffsetX = 0;
  //   let dragOffsetY = 0;

  //   img.onload = () => {
  //     ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

  //     // Draw the image initially at the specified position
  //     drawImage(ctx, img, imageX, imageY);
  //   };

  //   // Helper function to draw the image with transformations
  //   const drawImage = (ctx, img, x, y) => {
  //     ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redraw
  //     ctx.save();
  //     ctx.translate(x, y); // Move image center to (x, y)
  //     ctx.rotate((rotation * Math.PI) / 180);
  //     ctx.scale(scale, scale);
  //     ctx.drawImage(
  //       img,
  //       -img.width / 2,
  //       -img.height / 2,
  //       img.width,
  //       img.height
  //     );
  //     ctx.restore();
  //   };

  //   // Mouse down event to start dragging
  //   canvas.addEventListener("mousedown", (e) => {
  //     const rect = canvas.getBoundingClientRect();
  //     const mouseX = e.clientX - rect.left;
  //     const mouseY = e.clientY - rect.top;

  //     // Check if the click is within the image bounds
  //     if (
  //       mouseX >= imageX - img.width / 2 &&
  //       mouseX <= imageX + img.width / 2 &&
  //       mouseY >= imageY - img.height / 2 &&
  //       mouseY <= imageY + img.height / 2
  //     ) {
  //       isDragging = true;
  //       dragOffsetX = mouseX - imageX;
  //       dragOffsetY = mouseY - imageY;
  //     }
  //   });

  //   // Mouse move event to drag the image
  //   canvas.addEventListener("mousemove", (e) => {
  //     if (isDragging) {
  //       const rect = canvas.getBoundingClientRect();
  //       const mouseX = e.clientX - rect.left;
  //       const mouseY = e.clientY - rect.top;

  //       imageX = mouseX - dragOffsetX;
  //       imageY = mouseY - dragOffsetY;

  //       drawImage(ctx, img, imageX, imageY); // Redraw image at new position
  //     }
  //   });

  //   // Mouse up event to stop dragging
  //   canvas.addEventListener("mouseup", () => {
  //     isDragging = false;
  //   });

  //   // Mouse out event to stop dragging when leaving canvas
  //   canvas.addEventListener("mouseout", () => {
  //     isDragging = false;
  //   });
  // };
  // Normalize touch/mouse event coordinates

  const drawImageOnCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = uploadImage;

    // Initial position for the image
    let imageX = canvas.width / 2;
    let imageY = canvas.height / 2;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
      drawImage(ctx, img, imageX, imageY);
    };

    const drawImage = (ctx, img, x, y) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redraw
      ctx.save();
      ctx.translate(x, y); // Move image center to (x, y)
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(
        img,
        -img.width / 2,
        -img.height / 2,
        img.width,
        img.height
      );
      ctx.restore();
    };

    // Mouse and touch down event to start dragging
    const handleStart = (event) => {
      event.preventDefault();
      const { x, y } = getEventCoordinates(canvas, event);

      // Check if the click/touch is within the image bounds
      if (
        x >= imageX - img.width / 2 &&
        x <= imageX + img.width / 2 &&
        y >= imageY - img.height / 2 &&
        y <= imageY + img.height / 2
      ) {
        isDragging = true;
        dragOffsetX = x - imageX;
        dragOffsetY = y - imageY;
      }
    };

    // Mouse and touch move event to drag the image
    const handleMove = (event) => {
      if (isDragging) {
        event.preventDefault();
        const { x, y } = getEventCoordinates(canvas, event);

        imageX = x - dragOffsetX;
        imageY = y - dragOffsetY;

        drawImage(ctx, img, imageX, imageY);
      }
    };

    // Mouse and touch up event to stop dragging
    const handleEnd = () => {
      isDragging = false;
    };

    // Add mouse and touch event listeners
    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("mouseout", handleEnd);

    canvas.addEventListener("touchstart", handleStart, { passive: false });
    canvas.addEventListener("touchmove", handleMove, { passive: false });
    canvas.addEventListener("touchend", handleEnd);
    canvas.addEventListener("touchcancel", handleEnd);
  };

  return (
    <div className="pdf-editor-container w-full max-w-screen-lg mx-auto md:p-4">
      <div className=" md:flex justify-between items-center bg-gray-100 sm:p-2  md:p-2 shadow-md mb-4 rounded-lg">
        <h2 className=" sm:text-sm md:text-lg  font-bold text-gray-700">
          PDF Editor
        </h2>
        <div className="flex flex-wrap p-2 gap-2 justify-between md:space-x-4">
          <div className="flex gap-2 ">
            <button
              onClick={handleUndo}
              className="bg-gray-400  text-white py-2 px-3 rounded-full hover:bg-purple-600"
            >
              <Undo />
            </button>
            <button
              onClick={handleRedo}
              className="bg-gray-400 text-white py-2 px-3 rounded-full hover:bg-purple-600"
            >
              <Redo />
            </button>
          </div>
          <button
            onClick={downloadPdf}
            className="bg-purple-500 text-white py-2 px-3 rounded-full hover:bg-purple-600"
          >
            <Download className="w-6 h-6" />
          </button>
          <button
            onClick={handleAddAnnotationClick}
            className="bg-blue-500 text-white  py-2 px-3 rounded-full hover:bg-blue-600"
          >
            <Type className="w-6 h-6" />
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            className="hidden"
          />

          {/* Lucide Icon Button */}
          <button
            onClick={() => fileInputRef.current.click()}
            className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 flex items-center justify-center"
            title="Choose Image"
          >
            <ImagePlus />
          </button>
          <button
            onClick={handleAddDrawingClick}
            className="bg-green-500 text-white  py-2 px-3 rounded-full hover:bg-green-600"
          >
            <PenTool />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleZoomOut}
              className="bg-gray-500 text-white py-2 px-3 rounded-full hover:bg-gray-600"
            >
              <ZoomOut />
            </button>
            <button
              onClick={handleZoomIn}
              className="bg-gray-500 text-white py-2 px-3 rounded-full hover:bg-gray-600"
            >
              <ZoomIn />
            </button>
          </div>
        </div>
      </div>
      <div>
        {isImageMode && (
          <div>
            {/* Resize Slider */}
            <div className="mt-4">
              <label className="block">Resize Image:</label>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
              />
              <span className="ml-2">{scale.toFixed(1)}x</span>
            </div>

            {/* Rotation Slider */}
            <div className="mt-4">
              <label className="block">Rotate Image:</label>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
              />
              <span className="ml-2">{rotation}°</span>
            </div>
          </div>
        )}
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
        onClick={isDrawingMode ? null : handleCanvasClick}
        onMouseDown={handleDrawingStart}
        onMouseMove={handleDrawingMove}
        onMouseUp={handleDrawingEnd}
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
              // top: currentAnnotation.y,
              // left: currentAnnotation.x,
              top: annotationCordinates.y,
              left: annotationCordinates.x,
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

        {isImageMode && (
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

      {(isDrawingMode || isImageMode) && (
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
