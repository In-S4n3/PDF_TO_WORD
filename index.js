const { PDFNet } = require("@pdftron/pdfnet-node");
require("dotenv").config();
const express = require("express");
const app = express();
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const upload = multer({ dest: "./files/" });

app.use(cors());
app.listen(process.env.PORT, () => {
  console.log(`Server app is running on ${process.env.PORT}`);
});

app.post("/", upload.single("file"), async (req, res) => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    return res.status(400).json({ error: "No PDF file uploaded." });
  }
  PDFNet.initialize(process.env.PDFTRON_KEY);
  PDFNet.runWithCleanup(async () => {
    try {
      const pdfDoc = await PDFNet.PDFDoc.createFromFilePath(uploadedFile.path);
      pdfDoc.initSecurityHandler();
      pdfDoc.lock();

      const pdfToWordOptions = new PDFNet.Convert.WordOutputOptions();

      const outputFile = `${uploadedFile.filename}.docx`;
      const outputFilePath = path.resolve(__dirname, "files", outputFile);
      await PDFNet.Convert.toWord(pdfDoc, outputFilePath, pdfToWordOptions);

      return res.json({ success: true, outputFile });
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: "Failed to convert PDF to Word." });
    } finally {
      PDFNet.shutdown();
    }
  });
});

app.get("/download", (req, res) => {
  const outputFile = req.query.file;

  if (!outputFile) {
    return res.status(400).json({ error: "Invalid request." });
  }

  const filePath = path.join(__dirname, "files", outputFile);

  res.download(filePath, (err) => {
    if (err) {
      console.error("Error downloading file:", err);
      res.status(500).json({ error: "Failed to download the file." });
    } else {
      // Delete the downloaded file after the successful download
      fs.unlink(filePath, (deleteErr) => {
        if (deleteErr) {
          console.error("Error deleting file:", deleteErr);
        } else {
          console.log("File deleted successfully:", filePath);
        }
      });
    }
  });
});
