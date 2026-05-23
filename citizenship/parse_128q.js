const fs = require('fs');

const rawText = fs.readFileSync('128q_text.txt', 'utf8');
const lines = rawText.split('\n');

const questions = [];
let pendingAnswers = [];

const questionRegex = /^(\d+)\.\s+(.+)$/;
const answerRegex = /^•\s+(.+)$/;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trim();
  if (!line) continue;
  
  // Clean up massive spacing inside the text, caused by pdf extraction
  line = line.replace(/\s{2,}/g, ' ');
  
  // Strip asterisk at the end if it exists (e.g. " *")
  if (line === '*') continue;
  line = line.replace(/\s*\*\s*$/, '');
  
  const aMatch = line.match(answerRegex);
  if (aMatch) {
    let aText = aMatch[1].trim();
    // Remove instruction text in brackets
    aText = aText.replace(/\s*\[.*?\]\s*/g, ' ').trim();
    if (aText) {
      pendingAnswers.push(aText);
    }
    continue;
  }
  
  const qMatch = line.match(questionRegex);
  if (qMatch) {
    const id = qMatch[1];
    let qText = qMatch[2];
    
    // Reverse pending answers so they appear in top-to-bottom order from the PDF (since extractor reads bottom-up)
    pendingAnswers.reverse();
    
    questions.push({
      id: parseInt(id),
      question: qText.trim(),
      answers: [...pendingAnswers]
    });
    
    pendingAnswers = []; // reset for the next question
    continue;
  }
}

// Sort by ID to ensure correct order
questions.sort((a, b) => a.id - b.id);

console.log(`Parsed ${questions.length} questions`);

fs.writeFileSync('clean_128.json', JSON.stringify(questions, null, 2));
fs.writeFileSync('app/public/questions_128.json', JSON.stringify(questions, null, 2));
console.log('Saved to clean_128.json and app/public/questions_128.json');
