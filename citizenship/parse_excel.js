const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('uscis.xlsm');
const sheetNames = workbook.SheetNames;
let allQuestions = [];

sheetNames.forEach(sheetName => {
  if (sheetName !== 'Summary') {
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    allQuestions.push({ sheetName, data });
  }
});

fs.writeFileSync('questions_128.json', JSON.stringify(allQuestions, null, 2));
console.log('Saved questions_128.json');
