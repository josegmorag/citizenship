// State
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let incorrectScore = 0;
let totalQuestions = 10;
let passScore = 6;
let testSession = [];
let isListening = false;
let synthesis = window.speechSynthesis;
let recognition = null;
let currentUtterance = null;
let questionAnswered = false;
let sessionHistory = [];
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
// DOM Elements
const screens = {
  welcome: document.getElementById('welcome-screen'),
  interview: document.getElementById('interview-screen'),
  results: document.getElementById('results-screen')
};

const UI = {
  btn100: document.getElementById('btn-100'),
  btn128: document.getElementById('btn-128'),
  btnExit: document.getElementById('btn-exit'),
  progressBar: document.getElementById('progress-bar'),
  scoreCorrect: document.getElementById('score-correct'),
  scoreIncorrect: document.getElementById('score-incorrect'),
  totalVal: document.getElementById('total-val'),
  questionText: document.getElementById('question-text'),
  avatar: document.getElementById('character').querySelector('.avatar'),
  btnMic: document.getElementById('btn-mic'),
  textAnswer: document.getElementById('text-answer'),
  btnSubmit: document.getElementById('btn-submit'),
  feedbackPanel: document.getElementById('feedback-panel'),
  feedbackTitle: document.getElementById('feedback-title'),
  feedbackUserAnswer: document.getElementById('feedback-user-answer'),
  feedbackDetail: document.getElementById('feedback-detail'),
  nextContainer: document.getElementById('next-container'),
  btnNext: document.getElementById('btn-next'),
  inputContainer: document.getElementById('input-container'),
  finalScore: document.getElementById('final-score'),
  finalMessage: document.getElementById('final-message'),
  btnRestart: document.getElementById('btn-restart'),
  statsPanel: document.getElementById('stats-panel'),
  statAttempts: document.getElementById('stat-attempts'),
  statPassed: document.getElementById('stat-passed'),
  reviewList: document.getElementById('review-list')
};

// Initialization
function init() {
  UI.btn100.addEventListener('click', () => loadTest('questions_100.json', 10, 6));
  UI.btn128.addEventListener('click', () => loadTest('questions_128.json', 20, 10));
  UI.btnExit.addEventListener('click', showWelcome);
  UI.btnRestart.addEventListener('click', showWelcome);
  
  UI.btnMic.addEventListener('click', toggleListening);
  UI.btnSubmit.addEventListener('click', submitTextAnswer);
  UI.textAnswer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitTextAnswer();
  });
  UI.btnNext.addEventListener('click', nextQuestion);

  setupSpeechRecognition();
  showWelcome(); // Initialize stats on load
}

// Audio
function playBeep(freq, type, duration, vol) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playCorrectSound() {
  playBeep(600, 'sine', 0.1, 0.5);
  setTimeout(() => playBeep(800, 'sine', 0.2, 0.5), 100);
}

function playIncorrectSound() {
  playBeep(300, 'sawtooth', 0.3, 0.5);
  setTimeout(() => playBeep(250, 'sawtooth', 0.4, 0.5), 150);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      UI.btnMic.classList.add('listening');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const transcript = finalTranscript || interimTranscript;
      UI.textAnswer.value = transcript;
      
      // Wait for the user to finish speaking before evaluating
      if (window.speechTimeout) clearTimeout(window.speechTimeout);
      
      window.speechTimeout = setTimeout(() => {
        if (transcript.trim()) {
          submitTextAnswer();
        }
      }, 2000); // 2 seconds of silence = done speaking
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      stopListening();
    };

    recognition.onend = () => {
      if (isListening) {
        // If it ended automatically but we still think we are listening, restart it or stop cleanly
        stopListening();
      }
    };
  } else {
    UI.btnMic.style.display = 'none'; // Hide mic if not supported
    UI.textAnswer.placeholder = "Speech not supported. Type answer...";
  }
}

// Navigation
function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenName].classList.add('active');
}

function showWelcome() {
  if (synthesis.speaking) synthesis.cancel();
  stopListening();
  showScreen('welcome');
  
  const stats = JSON.parse(localStorage.getItem('citizenship_stats') || '{"attempts":0, "passed":0}');
  if (stats.attempts > 0) {
    UI.statsPanel.classList.remove('hidden');
    UI.statAttempts.textContent = stats.attempts;
    UI.statPassed.textContent = stats.passed;
  }
}

// Test Logic
async function loadTest(jsonFile, testTotalQuestions, testPassScore) {
  try {
    const response = await fetch('/' + jsonFile);
    questions = await response.json();
    
    totalQuestions = testTotalQuestions;
    passScore = testPassScore;
    
    startTestSession();
  } catch (error) {
    console.error('Error loading questions:', error);
    alert('Failed to load questions. Please check console.');
  }
}

function startTestSession() {
  // Select random questions based on totalQuestions
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  testSession = shuffled.slice(0, totalQuestions);
  
  score = 0;
  incorrectScore = 0;
  currentQuestionIndex = 0;
  sessionHistory = [];
  
  UI.totalVal.textContent = totalQuestions;
  updateProgress();
  
  showScreen('interview');
  askQuestion();
}

function updateProgress() {
  UI.scoreCorrect.textContent = score;
  UI.scoreIncorrect.textContent = incorrectScore;
  const percentage = (currentQuestionIndex / totalQuestions) * 100;
  UI.progressBar.style.width = percentage + '%';
}

function askQuestion() {
  questionAnswered = false;
  // Reset UI
  UI.feedbackPanel.classList.add('hidden');
  UI.nextContainer.classList.add('hidden');
  UI.inputContainer.classList.remove('hidden');
  UI.textAnswer.value = '';
  UI.textAnswer.focus();
  
  const currentQ = testSession[currentQuestionIndex];
  
  // Show typing indicator momentarily, then prompt user to listen
  UI.questionText.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';
  
  setTimeout(() => {
    UI.questionText.innerHTML = '<em>🔊 Listen to the officer...</em>';
    speakText(currentQ.question);
  }, 600);
}

function speakText(text) {
  if (synthesis.speaking) synthesis.cancel();
  
  currentUtterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a good English voice
  const voices = synthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) 
    || voices.find(v => v.lang.includes('en-US'))
    || voices[0];
  if (englishVoice) currentUtterance.voice = englishVoice;
  
  currentUtterance.rate = 0.95; // slightly slower for clarity
  
  currentUtterance.onstart = () => {
    UI.avatar.classList.add('speaking');
  };
  
  currentUtterance.onend = () => {
    UI.avatar.classList.remove('speaking');
    // Optionally auto-start listening after asking if they want true hands-free
    // if (recognition && !isListening) startListening();
  };
  
  synthesis.speak(currentUtterance);
}

// Interaction
function toggleListening() {
  if (isListening) {
    submitTextAnswer();
  } else {
    startListening();
  }
}

function startListening() {
  if (recognition && !isListening) {
    try {
      if (synthesis.speaking) synthesis.cancel(); // Stop talking if we start listening
      UI.avatar.classList.remove('speaking');
      recognition.start();
    } catch(e) { console.error(e); }
  }
}

function stopListening() {
  if (recognition && isListening) {
    recognition.stop();
    isListening = false;
    UI.btnMic.classList.remove('listening');
  }
}

function submitTextAnswer() {
  const text = UI.textAnswer.value.trim();
  if (text) {
    stopListening();
    evaluateAnswer(text);
  }
}

// Evaluation
function getSignificantWords(str) {
  const stopwords = new Set(["the", "a", "an", "of", "and", "to", "in", "for", "because", "is", "are", "was", "were", "it", "that", "on", "at", "by", "with"]);
  const words = str.split(/\s+/);
  return words.filter(w => w.length > 0 && !stopwords.has(w));
}

function normalize(str) {
  return str.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
}

function getExpandedAnswersList(currentQ) {
  return currentQ.answers || [currentQ.answer];
}

function checkAnswerSilent(userAnswer) {
  if (!userAnswer || userAnswer.trim() === "") return false;
  
  const currentQ = testSession[currentQuestionIndex];
  if (!currentQ) return false;
  
  const rawNormalizedUser = normalize(userAnswer);
  const userWords = getSignificantWords(rawNormalizedUser);
  
  const answersList = getExpandedAnswersList(currentQ);
  
  for (let ans of answersList) {
    if (!ans) continue;
    
    const rawNormAns = normalize(ans);
    const coreAns = normalize(ans.replace(/\(.*?\)/g, ""));
    const ansWords = getSignificantWords(coreAns);
    
    // 1. Direct inclusion check
    if (rawNormalizedUser === rawNormAns) {
      return true;
    }
    if (rawNormalizedUser.includes(rawNormAns) || (rawNormAns.includes(rawNormalizedUser) && rawNormalizedUser.length > 3)) {
      return true;
    }
    
    // 1.5 Number exact match check (e.g. User types "435" for "Four hundred thirty-five (435)")
    const userNumbers = rawNormalizedUser.match(/\d+/g);
    const ansNumbers = rawNormAns.match(/\d+/g);
    if (userNumbers && ansNumbers) {
      if (userNumbers.some(n => ansNumbers.includes(n))) {
        return true;
      }
    }
    
    // 2. Fuzzy word intersection
    if (ansWords.length > 0 && userWords.length > 0) {
      let matchCount = 0;
      for (let aw of ansWords) {
        if (userWords.some(uw => uw === aw || (uw.length > 3 && aw.length > 3 && (uw.includes(aw) || aw.includes(uw))))) {
          matchCount++;
        }
      }
      
      const requiredMatches = Math.ceil(ansWords.length / 2);
      if (matchCount >= requiredMatches) {
        return true;
      }
    }
  }
  return false;
}

function evaluateAnswer(userAnswer) {
  if (questionAnswered) return;
  questionAnswered = true;
  
  if (synthesis.speaking) synthesis.cancel();
  UI.avatar.classList.remove('speaking');
  
  const currentQ = testSession[currentQuestionIndex];
  const answersList = getExpandedAnswersList(currentQ);
  
  // Reveal the question text
  UI.questionText.textContent = currentQ.question;
  
  const isCorrect = checkAnswerSilent(userAnswer);
  
  if (isCorrect) {
    score++;
    playCorrectSound();
    showFeedback(true, "Correct!", `You answered correctly.`, userAnswer);
    speakText("Correct.");
  } else {
    incorrectScore++;
    playIncorrectSound();
    const possibleAnswers = answersList.join(" OR ");
    showFeedback(false, "Incorrect", `Accepted answers: ${possibleAnswers}`, userAnswer);
    speakText("Incorrect. The answer is " + answersList[0]);
  }
  
  sessionHistory.push({
    question: currentQ.question,
    userAnswer: userAnswer || "(silence)",
    isCorrect: isCorrect,
    expected: answersList.join(" OR ")
  });
  
  updateProgress();
  
  UI.inputContainer.classList.add('hidden');
  UI.nextContainer.classList.remove('hidden');
  UI.btnNext.focus();
}

function showFeedback(isCorrect, title, detail, userAnswer) {
  UI.feedbackPanel.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  UI.feedbackTitle.textContent = title;
  UI.feedbackDetail.textContent = detail;
  UI.feedbackUserAnswer.textContent = `Your answer: "${userAnswer || '(none)'}"`;
  
  const iconSvg = isCorrect 
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>';
  
  UI.feedbackPanel.querySelector('.feedback-icon').innerHTML = iconSvg;
}

function nextQuestion() {
  currentQuestionIndex++;
  
  // Early termination check
  const incorrectAllowed = totalQuestions - passScore;
  
  if (score >= passScore) {
    // Early pass
    showResults();
  } else if (incorrectScore > incorrectAllowed) {
    // Early fail
    showResults();
  } else if (currentQuestionIndex >= totalQuestions) {
    // Reached end of questions
    showResults();
  } else {
    updateProgress();
    askQuestion();
  }
}

function showResults() {
  showScreen('results');
  
  // Update final score to reflect actual questions asked
  UI.finalScore.textContent = `${score}/${currentQuestionIndex}`;
  
  const isPassed = score >= passScore;
  let message = "";
  if (isPassed) {
    message = `Congratulations! You passed the civics test simulation. You got ${score} correct!`;
    speakText("Congratulations! You passed.");
  } else {
    message = `You did not pass. You needed at least ${passScore} correct answers.`;
    speakText("You did not pass. Keep studying and try again.");
  }
  UI.finalMessage.textContent = message;
    
  // Save stats
  const stats = JSON.parse(localStorage.getItem('citizenship_stats') || '{"attempts":0, "passed":0}');
  stats.attempts++;
  if (isPassed) stats.passed++;
  localStorage.setItem('citizenship_stats', JSON.stringify(stats));
  
  // Render review list
  if (UI.reviewList) {
    UI.reviewList.innerHTML = '';
    sessionHistory.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = `review-item ${item.isCorrect ? 'correct' : 'incorrect'}`;
      div.innerHTML = `
        <div class="review-q">Q${index + 1}: ${item.question}</div>
        <div class="review-a"><span>Your Answer:</span> ${item.userAnswer}</div>
        ${!item.isCorrect ? `<div class="review-expected"><span>Expected:</span> ${item.expected}</div>` : ''}
      `;
      UI.reviewList.appendChild(div);
    });
  }
}

// Ensure voices are loaded (Chrome quirk)
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => {};
}

// Start
document.addEventListener('DOMContentLoaded', init);
