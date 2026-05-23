const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser(this, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
  const rawText = pdfParser.getRawTextContent();
  fs.writeFileSync('128q_text.txt', rawText);
  console.log('Extracted 128q text to 128q_text.txt');
});

pdfParser.loadPDF('2025-Civics-Test-128-Questions-and-Answers.pdf');
