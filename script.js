// Main application variables
let currentQuestion = 0;
const questionsPerPage = 1;
let totalQuestions = 0;
let userAnswers = [];
let markedQuestions = [];
let chartInstance = null;
let timeLeft = 90 * 60; // 90 minutes in seconds
let timerInterval = null;
let candidateName = "";
let rollNumber = "";

// Initialize the test when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're coming from start screen
  const urlParams = new URLSearchParams(window.location.search);
  const started = urlParams.get('started');
  
  if (!started) {
    // Show start screen
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('test-container').style.display = 'none';
    
    // Start test button handler
    document.getElementById('fullscreen-btn').addEventListener('click', function() {
      // Get candidate name
      const nameInput = document.getElementById('candidate-name');
      if (!nameInput.value.trim()) {
        alert("Please enter your name to continue");
        return;
      }
      
      candidateName = nameInput.value.trim();
      rollNumber = generateRollNumber();
      
      // Set flag in URL
      window.history.pushState({}, '', '?started=true');
      
      // Hide start screen
      document.getElementById('start-screen').style.display = 'none';
      
      // Show test container
      const testContainer = document.getElementById('test-container');
      testContainer.style.display = 'block';
      
      // Request fullscreen
      if (testContainer.requestFullscreen) {
        testContainer.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else if (testContainer.webkitRequestFullscreen) {
        testContainer.webkitRequestFullscreen();
      } else if (testContainer.msRequestFullscreen) {
        testContainer.msRequestFullscreen();
      }
      
      // Initialize test
      initializeTest();
    });
  } else {
    // Directly show test if coming with started param
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('test-container').style.display = 'block';
    initializeTest();
  }
  
  // Handle fullscreen change
  document.addEventListener('fullscreenchange', exitHandler);
  document.addEventListener('webkitfullscreenchange', exitHandler);
  document.addEventListener('mozfullscreenchange', exitHandler);
  document.addEventListener('MSFullscreenChange', exitHandler);
  
  // Check if required libraries are loaded
  checkLibrariesLoaded();
});

function checkLibrariesLoaded() {
  if (typeof Chart === 'undefined' || typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
    setTimeout(checkLibrariesLoaded, 100);
    return;
  }
  console.log("All required libraries are loaded");
}

function generateRollNumber() {
  const datePart = new Date().getTime().toString().slice(-4);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `RRB${datePart}${randomPart}`;
}

function initializeTest() {
  totalQuestions = questions.length;
  userAnswers = Array(totalQuestions).fill(null);
  markedQuestions = Array(totalQuestions).fill(false);
  
  document.getElementById('total-questions').textContent = totalQuestions;
  document.getElementById('max-marks').textContent = totalQuestions;
  
  renderQuiz();
  startTimer();
  updateProgress();
  
  // Add event listener for submit button
  document.getElementById('submit-btn').addEventListener('click', confirmSubmit);
  
  // Add event listener for restart button
  document.getElementById('restart-btn').addEventListener('click', function() {
    if (confirm("Are you sure you want to restart the test? All your progress will be lost.")) {
      // Remove the started parameter from URL and reload
      window.history.pushState({}, '', window.location.pathname);
      location.reload();
    }
  });
}

function exitHandler() {
  if (!document.fullscreenElement && 
      !document.webkitIsFullScreen && 
      !document.mozFullScreen && 
      !document.msFullscreenElement) {
    // Show warning if test is in progress
    if (timerInterval) {
      const warning = document.createElement('div');
      warning.className = 'fullscreen-warning';
      warning.textContent = 'Warning: You exited fullscreen mode. For best experience, please return to fullscreen.';
      warning.style.display = 'block';
      document.body.appendChild(warning);
      
      setTimeout(() => {
        warning.style.display = 'none';
        document.body.removeChild(warning);
      }, 5000);
    }
  }
}

// Render the current question
function renderQuiz() {
  const quizDiv = document.getElementById("quiz");
  quizDiv.innerHTML = "";
  
  const q = questions[currentQuestion];
  
  const qDiv = document.createElement("div");
  qDiv.className = `question ${markedQuestions[currentQuestion] ? 'marked' : ''}`;
  qDiv.innerHTML = `
    <div class="question-number">${currentQuestion + 1}</div>
    <span class="question-section">${q.section}</span>
    <p class="question-text">${q.question}</p>
    <div class="options" id="options-container">
      ${q.options.map((opt, j) => `
        <div class="option" onclick="selectOption(${j})">
          <input type="radio" name="q${currentQuestion}" id="q${currentQuestion}o${j}" value="${j}" 
            ${userAnswers[currentQuestion] === j ? 'checked' : ''}>
          <label for="q${currentQuestion}o${j}">${opt}</label>
        </div>
      `).join('')}
    </div>
  `;
  
  quizDiv.appendChild(qDiv);
  updateNavigationButtons();
  updateProgress();
}

// Navigation functions
function navigate(direction) {
  currentQuestion += direction;
  
  // Ensure currentQuestion stays within bounds
  if (currentQuestion < 0) currentQuestion = 0;
  if (currentQuestion >= totalQuestions) currentQuestion = totalQuestions - 1;
  
  renderQuiz();
}

function jumpToQuestion() {
  const input = document.getElementById('jump-to-question');
  const qNum = parseInt(input.value);
  
  if (isNaN(qNum)) {
    alert("Please enter a valid question number");
    return;
  }
  
  if (qNum >= 1 && qNum <= totalQuestions) {
    currentQuestion = qNum - 1;
    renderQuiz();
  } else {
    alert(`Please enter a number between 1 and ${totalQuestions}`);
  }
  
  input.value = '';
}

function updateNavigationButtons() {
  document.getElementById('prev-btn').disabled = currentQuestion === 0;
  document.getElementById('next-btn').disabled = currentQuestion === totalQuestions - 1;
  document.getElementById('question-counter').textContent = `Question ${currentQuestion + 1} of ${totalQuestions}`;
}

// Progress tracking
function updateProgress() {
  const answered = userAnswers.filter(a => a !== null).length;
  const percentage = Math.round((answered / totalQuestions) * 100);
  
  document.getElementById('progress-text').textContent = 
    `${answered}/${totalQuestions} (${percentage}%)`;
  
  document.getElementById('progress-bar').style.width = `${percentage}%`;
}

// Question interaction
function selectOption(optionIndex) {
  userAnswers[currentQuestion] = optionIndex;
  document.querySelector(`input[name="q${currentQuestion}"][value="${optionIndex}"]`).checked = true;
  updateProgress();
}

function markForReview() {
  markedQuestions[currentQuestion] = !markedQuestions[currentQuestion];
  renderQuiz();
}

// Timer functions
function startTimer() {
  clearInterval(timerInterval);
  timeLeft = 90 * 60; // Reset to 90 minutes
  updateTimerDisplay(); // Initial display
  timerInterval = setInterval(function() {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitTest();
    }
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  
  document.getElementById('timer').textContent = 
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Change color when time is running low
  if (timeLeft <= 300) { // 5 minutes
    document.getElementById('timer').style.color = 'var(--danger-color)';
  }
}

// Test submission
function confirmSubmit() {
  const unattempted = userAnswers.filter(a => a === null).length;
  const marked = markedQuestions.filter(m => m).length;
  
  let confirmMessage = `You have ${unattempted} unattempted questions`;
  if (marked > 0) {
    confirmMessage += ` and ${marked} marked questions`;
  }
  confirmMessage += ". Are you sure you want to submit?";
  
  if (confirm(confirmMessage)) {
    submitTest();
  }
}

function submitTest() {
  clearInterval(timerInterval);
  
  let correct = 0, incorrect = 0, unattempted = 0, marked = 0;
  let sectionWise = {};
  
  // Calculate scores with negative marking (1/3 deduction for wrong answers)
  questions.forEach((q, i) => {
    const sec = q.section;
    if (!sectionWise[sec]) {
      sectionWise[sec] = { 
        total: 0, 
        correct: 0, 
        incorrect: 0, 
        unattempted: 0,
        marked: 0,
        marks: 0
      };
    }
    
    sectionWise[sec].total++;
    
    if (markedQuestions[i]) {
      marked++;
      sectionWise[sec].marked++;
    }
    
    if (userAnswers[i] === null) {
      unattempted++;
      sectionWise[sec].unattempted++;
    } else if (userAnswers[i] === q.answer) {
      correct++;
      sectionWise[sec].correct++;
      sectionWise[sec].marks += 1; // +1 for correct answer
    } else {
      incorrect++;
      sectionWise[sec].incorrect++;
      sectionWise[sec].marks -= 0.25; // -1/4 for wrong answer
    }
  });
  
  // Calculate total marks with negative marking
  const totalMarks = Object.values(sectionWise).reduce((sum, sec) => sum + sec.marks, 0);
  const roundedMarks = Math.max(0, totalMarks.toFixed(2)); // Ensure marks don't go below 0
  
  // Display results
  displayResults(correct, incorrect, unattempted, marked, sectionWise, roundedMarks);
  
  // Show result container and hide quiz
  document.getElementById('quiz').style.display = 'none';
  document.querySelector('.navigation').style.display = 'none';
  document.querySelector('.test-controls').style.display = 'none';
  document.querySelector('.progress-container').style.display = 'none';
  document.querySelector('.question-jump').style.display = 'none';
  document.getElementById('result-container').style.display = 'block';
}

// Results display
function displayResults(correct, incorrect, unattempted, marked, sectionWise, totalMarks) {
  const percentage = ((correct / totalQuestions) * 100).toFixed(1);
  const marksPercentage = ((totalMarks / totalQuestions) * 100).toFixed(1);
  
  // Add candidate info to results
  const candidateInfo = document.createElement('div');
  candidateInfo.className = 'candidate-info';
  candidateInfo.innerHTML = `
    <h3>Candidate Details</h3>
    <p><strong>Name:</strong> ${candidateName}</p>
    <p><strong>Roll No:</strong> ${rollNumber}</p>
    <p><strong>Test Date:</strong> ${new Date().toLocaleDateString()}</p>
  `;
  document.getElementById('result-container').prepend(candidateInfo);
  
  // Update summary
  document.getElementById('correct-answers').textContent = correct;
  document.getElementById('incorrect-answers').textContent = incorrect;
  document.getElementById('unattempted-answers').textContent = unattempted;
  document.getElementById('marked-answers').textContent = marked;
  document.getElementById('percentage').textContent = `${percentage}%`;
  document.getElementById('total-marks').textContent = totalMarks;
  document.getElementById('marks-percentage').textContent = `${marksPercentage}%`;

  const negativeNote = document.createElement('p');
  negativeNote.style.marginTop = '10px';
  negativeNote.style.color = '#e74c3c';
  negativeNote.innerHTML = "<strong>Note:</strong> Negative marking of <strong>0.25</strong> has been applied for each incorrect answer.";
  document.getElementById('result-container').appendChild(negativeNote);

  const negativeMarks = incorrect * 0.25;
  const deductionItem = document.createElement('div');
  deductionItem.className = 'summary-item';
  deductionItem.innerHTML = `
    <span class="label">Negative Marks:</span>
    <span class="value">-${negativeMarks.toFixed(2)}</span>
  `;
  document.querySelector('.result-summary').appendChild(deductionItem);

  
  // Render chart
  renderChart(sectionWise);
  
  // Render section analysis table with marks
  renderSectionTable(sectionWise);
  
  // Render detailed question analysis
  renderDetailedAnalysis();
}

function renderChart(sectionWise) {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  const sections = Object.keys(sectionWise);
  
  if (chartInstance) chartInstance.destroy();
  
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sections,
      datasets: [
        {
          label: 'Correct',
          data: sections.map(sec => sectionWise[sec].correct),
          backgroundColor: '#2ecc71',
          borderColor: '#27ae60',
          borderWidth: 1
        },
        {
          label: 'Incorrect',
          data: sections.map(sec => sectionWise[sec].incorrect),
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
          borderWidth: 1
        },
        {
          label: 'Unattempted',
          data: sections.map(sec => sectionWise[sec].unattempted),
          backgroundColor: '#95a5a6',
          borderColor: '#7f8c8d',
          borderWidth: 1
        },
        {
          label: 'Marked',
          data: sections.map(sec => sectionWise[sec].marked),
          backgroundColor: '#f39c12',
          borderColor: '#e67e22',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          beginAtZero: true,
          max: Math.max(...Object.values(sectionWise).map(s => s.total)) + 1,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            afterBody: function(context) {
              const section = context[0].label;
              const total = sectionWise[section].total;
              const correct = sectionWise[section].correct;
              const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : 0;
              return `Accuracy: ${accuracy}%`;
            }
          }
        }
      }
    }
  });
}

function renderSectionTable(sectionWise) {
  const tableBody = document.getElementById('section-table-body');
  tableBody.innerHTML = '';
  
  Object.entries(sectionWise).forEach(([section, stats]) => {
    const accuracy = (stats.correct / stats.total * 100).toFixed(1);
    const progressWidth = (stats.correct / stats.total * 100).toFixed(1);
    const sectionMarks = Math.max(0, stats.marks.toFixed(2)); // Ensure marks don't go below 0
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${section}</td>
      <td>${stats.total}</td>
      <td>${stats.correct}</td>
      <td>${stats.incorrect}</td>
      <td>${stats.unattempted}</td>
      <td>${sectionMarks}</td>
      <td>${accuracy}%</td>
      <td>
        <div class="progress-bar">
          <div class="progress" style="width: ${progressWidth}%"></div>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function renderDetailedAnalysis() {
  const analysisDiv = document.getElementById('detailed-analysis');
  analysisDiv.innerHTML = '';
  
  questions.forEach((q, i) => {
    const userAnswer = userAnswers[i];
    const isCorrect = userAnswer === q.answer;
    const isMarked = markedQuestions[i];
    
    let statusClass, statusText;
    if (isMarked) {
      statusClass = 'marked-answer';
      statusText = 'Marked';
    } else if (userAnswer === null) {
      statusClass = 'unattempted-answer';
      statusText = 'Not Attempted';
    } else if (isCorrect) {
      statusClass = 'correct-answer';
      statusText = 'Correct';
    } else {
      statusClass = 'incorrect-answer';
      statusText = 'Incorrect';
    }
    
    const qDiv = document.createElement('div');
    qDiv.className = 'question';
    qDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4>Q${i + 1} (${q.section})</h4>
        <span class="${statusClass}">${statusText}</span>
      </div>
      <p><strong>Question:</strong> ${q.question}</p>
      <p><strong>Your Answer:</strong> ${userAnswer !== null ? q.options[userAnswer] : 'Not Attempted'}</p>
      <p><strong>Correct Answer:</strong> ${q.options[q.answer]}</p>
      ${q.explanation ? `<button class="btn" style="margin: 10px 0; padding: 5px 10px; font-size: 0.9rem;" 
        onclick="toggleSolution(${i})">Show/Hide Solution</button>
      <div id="solution-${i}" class="analysis">
        <p><strong>Explanation:</strong></p>
        <p>${q.explanation}</p>
      </div>` : ''}
    `;
    analysisDiv.appendChild(qDiv);
  });
}

function toggleSolution(index) {
  const solutionDiv = document.getElementById(`solution-${index}`);
  solutionDiv.classList.toggle('show');
}

// PDF Export
async function exportPDF() {
  try {
    // Check if jsPDF is loaded
    if (typeof jsPDF === 'undefined') {
      alert("PDF generation library is still loading. Please try again in a moment.");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('RRB JE Electrical Engineering - Test Report', 40, 40);
    
    // Add candidate info
    doc.setFontSize(12);
    doc.text(`Candidate: ${candidateName}`, 40, 60);
    doc.text(`Roll Number: ${rollNumber}`, 40, 80);
    doc.text(`Test Date: ${new Date().toLocaleDateString()}`, 40, 100);
    
    // Add test summary
    doc.setFontSize(14);
    doc.text('Test Summary', 40, 130);
    
    const correct = document.getElementById('correct-answers').textContent;
    const incorrect = document.getElementById('incorrect-answers').textContent;
    const unattempted = document.getElementById('unattempted-answers').textContent;
    const marked = document.getElementById('marked-answers').textContent;
    const percentage = document.getElementById('percentage').textContent;
    const marks = document.getElementById('total-marks').textContent;
    const marksPercentage = document.getElementById('marks-percentage').textContent;
    
    doc.setFontSize(12);
    doc.text(`Correct Answers: ${correct}`, 40, 150);
    doc.text(`Incorrect Answers: ${incorrect}`, 40, 170);
    doc.text(`Unattempted Questions: ${unattempted}`, 40, 190);
    doc.text(`Marked Questions: ${marked}`, 40, 210);
    doc.text(`Marks Obtained (with -1/3): ${marks}/${totalQuestions}`, 40, 230);
    doc.text(`Percentage: ${percentage}`, 40, 250);
    doc.text(`Marks Percentage: ${marksPercentage}%`, 40, 270);
    
    // Add chart image
    try {
      const canvas = document.getElementById('scoreChart');
      const chartImage = await html2canvas(canvas);
      doc.addImage(chartImage, 'PNG', 40, 290, 500, 300);
    } catch (chartError) {
      console.error("Error generating chart image:", chartError);
    }
    
    // Add section analysis
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Section-wise Analysis', 40, 40);
    
    try {
      const sectionTable = document.getElementById('section-table');
      const tableImage = await html2canvas(sectionTable);
      doc.addImage(tableImage, 'PNG', 40, 60, 500, 200);
    } catch (tableError) {
      console.error("Error generating table image:", tableError);
    }
    
    // Generate filename with candidate name
    const filename = `RRB_JE_EE_Report_${candidateName.replace(/\s+/g, '_')}_${rollNumber}.pdf`;
    
    // Save PDF with customized name
    doc.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("An error occurred while generating the PDF. Please try again.");
  }
}