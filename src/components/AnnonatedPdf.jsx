import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { jsPDF } from "jspdf";

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = "../../public/pdf.worker.min.js";

const AnnotatedPdf = ({ file }) => {
  const [pages, setPages] = useState([]); // Array of { page, canvas }
  const [drawingData, setDrawingData] = useState([]); // Array to store drawing data for each page
  const isDrawing = useRef(false);

  useEffect(() => {
    const renderPDF = async () => {
      const pdf = await pdfjs.getDocument(file).promise;
      const renderedPages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const scale = 2; // High quality rendering
        const viewport = page.getViewport({ scale });

        // Create a base canvas for the page
        const baseCanvas = document.createElement("canvas");
        const baseContext = baseCanvas.getContext("2d");
        baseCanvas.width = viewport.width;
        baseCanvas.height = viewport.height;

        // Render the page onto the base canvas
        const renderContext = {
          canvasContext: baseContext,
          viewport,
        };
        await page.render(renderContext).promise;

        // Create a drawing canvas that will sit on top
        const drawingCanvas = document.createElement("canvas");
        const drawingContext = drawingCanvas.getContext("2d");
        drawingCanvas.width = baseCanvas.width;
        drawingCanvas.height = baseCanvas.height;

        // Store page and canvases
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

  const handleMouseDown = (e, index) => {
    isDrawing.current = true;
    const ctx = pages[index].drawingCanvas.getContext("2d");
    const offsetX = e.nativeEvent.offsetX;
    const offsetY = e.nativeEvent.offsetY;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);

    // Save drawing data
    setDrawingData((prev) => [
      ...prev,
      { pageIndex: index, type: "start", x: offsetX, y: offsetY },
    ]);
  };

  const handleMouseMove = (e, index) => {
    if (!isDrawing.current) return;
    const ctx = pages[index].drawingCanvas.getContext("2d");
    const offsetX = e.nativeEvent.offsetX;
    const offsetY = e.nativeEvent.offsetY;
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();

    // Save drawing data
    setDrawingData((prev) => [
      ...prev,
      { pageIndex: index, type: "draw", x: offsetX, y: offsetY },
    ]);
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const exportPdf = () => {
    const pdf = new jsPDF();

    pages.forEach(({ baseCanvas, drawingCanvas }, index) => {
      // Create an offscreen canvas to combine the base and drawing layers
      const offscreenCanvas = document.createElement("canvas");
      const offscreenCtx = offscreenCanvas.getContext("2d");
      offscreenCanvas.width = baseCanvas.width;
      offscreenCanvas.height = baseCanvas.height;

      // Draw the base PDF page onto the offscreen canvas
      offscreenCtx.drawImage(baseCanvas, 0, 0);

      // Overlay the drawing canvas
      offscreenCtx.drawImage(drawingCanvas, 0, 0);

      // Add the combined image to the PDF
      const imgData = offscreenCanvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (baseCanvas.height * pdfWidth) / baseCanvas.width; // Maintain aspect ratio
      if (index > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    });

    pdf.save("annotated.pdf");
  };

  return (
    <div>
      <div
        style={{
          overflowY: "scroll",
          height: "80vh",
          border: "1px solid #ccc",
          padding: "10px",
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
                cursor: "crosshair",
              }}
              onMouseDown={(e) => handleMouseDown(e, index)}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseUp={handleMouseUp}
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
