import { useEffect, useRef } from "react";
import * as pdfjs from "pdfjs-dist";
import { jsPDF } from "jspdf";

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = "../../public/pdf.worker.min.js";

const AnnotatedPdf = ({ file }) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const renderPDF = async () => {
      const pdf = await pdfjs.getDocument(file).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport,
      };
      await page.render(renderContext).promise;
    };

    renderPDF().catch(console.error);
  }, [file]);

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const exportPdf = () => {
    const canvas = canvasRef.current;
    const pdf = new jsPDF();

    // Add the canvas content as an image to the PDF
    const imgData = canvas.toDataURL("image/png");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // Maintain aspect ratio
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

    // Save the PDF
    pdf.save("annotated.pdf");
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ border: "1px solid black", marginBottom: "10px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <button
        onClick={exportPdf}
        style={{ padding: "10px", cursor: "pointer" }}
      >
        Export as PDF
      </button>
    </div>
  );
};

export default AnnotatedPdf;
