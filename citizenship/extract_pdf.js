const fs = require('fs');
const PDFParser = require("pdf2json");

const pdfParser = new PDFParser(this, 1);

pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
pdfParser.on("pdfParser_dataReady", pdfData => {
    fs.writeFileSync('100q_text.txt', pdfParser.getRawTextContent());
    console.log('Extracted 100q text to 100q_text.txt');
});

pdfParser.loadPDF("100q.pdf");
