import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { jsPDF } from "jspdf";

pdfjs.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";

const AnnotatedPdf = ({ file }) => {
  const [pages, setPages] = useState([]);
  const [drawingData, setDrawingData] = useState([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  
  const isDrawing = useRef(false);

  useEffect(() => {
    const renderPDF = async () => {
      const pdf = await pdfjs.getDocument(file).promise;
      const renderedPages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const scale = 2;
        const viewport = page.getViewport({ scale });

        const baseCanvas = document.createElement("canvas");
        const baseContext = baseCanvas.getContext("2d");
        baseCanvas.width = viewport.width;
        baseCanvas.height = viewport.height;

        const renderContext = {
          canvasContext: baseContext,
          viewport,
        };
        await page.render(renderContext).promise;

        const drawingCanvas = document.createElement("canvas");
        const drawingContext = drawingCanvas.getContext("2d");
        drawingCanvas.width = baseCanvas.width;
        drawingCanvas.height = baseCanvas.height;

        renderedPages.push({
          page,
          baseCanvas,
          drawingCanvas,
          drawingData: [],
        });
      }

      setPages(renderedPages);
    };

    renderPDF().catch(console.error);
  }, [file]);

  const normalizeEvent = (e, canvas) => {
    let rect = canvas.getBoundingClientRect();
    if (e.touches) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
      };
    }
  };

  const handleStart = (e, index) => {
    if (!isDrawingMode) return;
    isDrawing.current = true;
    const canvas = pages[index].drawingCanvas;
    const ctx = canvas.getContext("2d");
    const { x, y } = normalizeEvent(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);

    setDrawingData((prev) => [
      ...prev,
      { pageIndex: index, type: "start", x, y },
    ]);
  };

  const handleMove = (e, index) => {
    if (!isDrawingMode || !isDrawing.current) return;
    const canvas = pages[index].drawingCanvas;
    const ctx = canvas.getContext("2d");
    const { x, y } = normalizeEvent(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();

    setDrawingData((prev) => [
      ...prev,
      { pageIndex: index, type: "draw", x, y },
    ]);
  };

  const handleEnd = () => {
    isDrawing.current = false;
  };

  const exportPdf = () => {
    const pdf = new jsPDF();

    pages.forEach(({ baseCanvas, drawingCanvas }, index) => {
      const offscreenCanvas = document.createElement("canvas");
      const offscreenCtx = offscreenCanvas.getContext("2d");
      offscreenCanvas.width = baseCanvas.width;
      offscreenCanvas.height = baseCanvas.height;

      offscreenCtx.drawImage(baseCanvas, 0, 0);
      offscreenCtx.drawImage(drawingCanvas, 0, 0);

      const imgData = offscreenCanvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (baseCanvas.height * pdfWidth) / baseCanvas.width;
      if (index > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    });

    pdf.save("annotated.pdf");
  };

  return (
    <div>
      <button
        onClick={() => setIsDrawingMode((prev) => !prev)}
        style={{ padding: "10px 20px", marginBottom: "20px", cursor: "pointer" }}
      >
        {isDrawingMode ? "Disable Drawing" : "Enable Drawing"}
      </button>
      <div
        style={{
          overflow: isDrawingMode ? "hidden" : "scroll", // Prevent scrolling when drawing mode is enabled
          height: "80vh",
          border: "1px solid #ccc",
          padding: "10px",
          touchAction: isDrawingMode ? "none" : "auto", // Only disable touch action when drawing mode is active
        }}
      >
        {pages.map(({ baseCanvas, drawingCanvas }, index) => (
          <div
            key={index}
            style={{ marginBottom: "20px", position: "relative" }}
          >
            <canvas
              ref={(ref) =>
                ref && ref.getContext("2d").drawImage(baseCanvas, 0, 0)
              }
              width={baseCanvas.width}
              height={baseCanvas.height}
              style={{
                border: "1px solid red",
                display: "block",
                marginBottom: "20px",
              }}
            />
            <canvas
              ref={(ref) =>
                ref && ref.getContext("2d").drawImage(drawingCanvas, 0, 0)
              }
              width={drawingCanvas.width}
              height={drawingCanvas.height}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                border: "none",
                cursor: isDrawingMode ? "crosshair" : "default",
              }}
              onMouseDown={(e) => handleStart(e, index)}
              onMouseMove={(e) => handleMove(e, index)}
              onMouseUp={handleEnd}
              onTouchStart={(e) => handleStart(e, index)}
              onTouchMove={(e) => handleMove(e, index)}
              onTouchEnd={handleEnd}
            />
          </div>
        ))}
      </div>
      <button
        onClick={exportPdf}
        style={{ padding: "10px 20px", marginTop: "20px", cursor: "pointer" }}
      >
        Export as PDF
      </button>
    </div>
  );
};

export default AnnotatedPdf;
