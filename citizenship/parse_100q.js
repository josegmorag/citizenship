const fs = require('fs');

const text = fs.readFileSync('100q_text.txt', 'utf-8');
const lines = text.split('\n');

let questions = [];
let currentAnswers = [];

const qRegex = /^(\d+)\.\s*(.*)$/;
const aRegex = /^▪\s*(.*)$/;

for (let line of lines) {
  let cleaned = line.trim();
  let aMatch = cleaned.match(aRegex);
  if (aMatch) {
    currentAnswers.push(aMatch[1].trim());
  } else {
    let qMatch = cleaned.match(qRegex);
    if (qMatch) {
      questions.push({
        id: parseInt(qMatch[1], 10),
        question: qMatch[2].trim(),
        answers: [...currentAnswers].reverse()
      });
      currentAnswers = [];
    }
  }
}

questions.sort((a, b) => a.id - b.id);

fs.writeFileSync('clean_100.json', JSON.stringify(questions, null, 2));
console.log(`Extracted ${questions.length} questions.`);
