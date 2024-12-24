import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { jsPDF } from "jspdf";

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = "../../public/pdf.worker.min.js";

const AnnotatedPdf = ({ file }) => {
  const [pages, setPages] = useState([]); // Array of { page, canvas }
  const isDrawing = useRef(false);

  useEffect(() => {
    const renderPDF = async () => {
      const pdf = await pdfjs.getDocument(file).promise;
      const renderedPages = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const scale = 2; // High quality rendering
        const viewport = page.getViewport({ scale });

        // Create a canvas for the page
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render the page onto the canvas
        const renderContext = {
          canvasContext: context,
          viewport,
        };
        await page.render(renderContext).promise;

        renderedPages.push({ page, canvas });
      }

      setPages(renderedPages);
    };

    renderPDF().catch(console.error);
  }, [file]);

  const handleMouseDown = (e, canvas) => {
    isDrawing.current = true;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const handleMouseMove = (e, canvas) => {
    if (!isDrawing.current) return;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const exportPdf = () => {
    const pdf = new jsPDF();

    pages.forEach(({ canvas }, index) => {
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // Maintain aspect ratio
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
        {pages.map(({ canvas }, index) => (
          <div key={index} style={{ marginBottom: "20px" }}>
            <canvas
              ref={(ref) => ref && ref.getContext("2d").drawImage(canvas, 0, 0)}
              width={canvas.width}
              height={canvas.height}
              style={{
                border: "1px solid black",
                display: "block",
                marginBottom: "20px",
                cursor: "crosshair",
                zIndex: 1000,
              }}
              onMouseDown={(e) => handleMouseDown(e, canvas)}
              onMouseMove={(e) => handleMouseMove(e, canvas)}
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
