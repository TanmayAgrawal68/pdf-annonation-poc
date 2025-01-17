import "./App.css";
import React, { useState } from "react";
import AnnotatedPdf from "./components/AnnonatedPdf";
import AnnotatedPdfUpdate from "./components/AnnonatedPdfUpdate";
import AnnotatedPdfkonva from "./components/AnnonatedPdfKonva";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileURL(URL.createObjectURL(file)); // Generate a temporary URL for the file
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>PDF Annotation App</h1>

      {/* File Input */}
      <div>
        {/* <p>Selected file : {selectedFile}</p> */}
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{ marginBottom: "20px" }}
        />
      </div>

      {/* Render AnnotatedPdf if a file is selected */}
      {/* {fileURL ? (
        <AnnotatedPdf file={fileURL} />
      ) : (
        <p>Please select a PDF file to annotate.</p>
      )} */}
      {fileURL ? (
        <AnnotatedPdfUpdate file={fileURL} />
      ) : (
        <p>Please select a PDF file to annotate.</p>
      )}
      {/* {fileURL ? (
        <AnnotatedPdfkonva file={fileURL} />
      ) : (
        <p>Please select a PDF file to annotate.</p>
      )} */}
    </div>
  );
}

export default App;
