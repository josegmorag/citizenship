const fs = require('fs');

const raw128 = JSON.parse(fs.readFileSync('questions_128.json', 'utf-8'));
let clean128 = [];
let idCounter = 1;

raw128.forEach(sheet => {
  if (sheet.data && Array.isArray(sheet.data)) {
    sheet.data.forEach(row => {
      if (row.length >= 2) {
        let question = typeof row[0] === 'string' ? row[0].trim() : String(row[0]);
        let answer = typeof row[1] === 'string' ? row[1].trim() : String(row[1]);
        
        // Skip rows that look like headers or invalid data
        if (question && answer && !question.includes("QUESTIONS") && !answer.includes("QUESTIONS") && question !== "TOPIC") {
           // sometimes answers have extra metadata like "Back to summary" which we ignore
           clean128.push({
             id: idCounter++,
             topic: sheet.sheetName.trim(),
             question: question.replace(/^[\d\.\s]+/, ''), // remove leading numbers if any
             answer: answer
           });
        }
      }
    });
  }
});

fs.writeFileSync('clean_128.json', JSON.stringify(clean128, null, 2));
console.log(`Cleaned 128 questions. Total extracted: ${clean128.length}`);
