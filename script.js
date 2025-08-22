// --- Shuffle Functions ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function shuffleQuestionsAndOptions(questions) {
  questions.forEach((q) => {
    // Store the correct option value
    const correctOption = q.options[q.correct_option_id];
    // Shuffle options
    shuffleArray(q.options);
    // Update correct_option_id to new index
    q.correct_option_id = q.options.indexOf(correctOption);
  });
  shuffleArray(questions);
  return questions;
}

// --- TestApp class ---
class TestApp {
  constructor(questions) {
    this.qs = questions || [];
    this.curQ = 0;
    this.ans = new Array(this.qs.length).fill(null);
    this.reviewed = new Array(this.qs.length).fill(false);
    this.sub = false;
    this.overallTimerInterval = null;
    this.qnsTimerInterval = null;
    this.startT = null;
    this.timeSpent = new Array(this.qs.length).fill(0);
    this.lastQTime = null;

    // Pause logic
    this.paused = false;
    this.pauseStart = null;
    this.totalPausedTime = 0;

    this.initEls();
    this.setupWelcomeScreen();
  }

  initEls() {
    this.els = {
      qInfo: document.getElementById("qInfo"),
      progTxt: document.getElementById("progTxt"),
      ansCnt: document.getElementById("ansCnt"),
      timer: document.getElementById("timer"),
      qnsTimer: document.getElementById("qnsTimer"),
      qTxt: document.getElementById("qTxt"),
      compSec: document.getElementById("compSec"),
      compCont: document.getElementById("compCont"),
      opts: document.getElementById("opts"),
      sol: document.getElementById("sol"),
      solCont: document.getElementById("solCont"),
      solInfo: document.getElementById("solInfo"),
      qGrid: document.getElementById("qGrid"),
      desktopQGrid: document.getElementById("desktopQGrid"),
      panel: document.getElementById("panel"),
      modalOver: document.getElementById("modalOver"),
      scoreDisp: document.getElementById("scoreDisp"),
      corrStat: document.getElementById("corrStat"),
      incStat: document.getElementById("incStat"),
      unaStat: document.getElementById("unaStat"),
      timeStat: document.getElementById("timeStat"),
      printBtn: document.getElementById("printBtn"),
      reviewBtn: document.getElementById("reviewBtn"),
      pauseBtn: document.getElementById("pauseBtn"),
      restartBtn: document.getElementById("restartBtn"),
      pausedOverlay: document.getElementById("pausedOverlay"),
    };
  }

  setupWelcomeScreen() {
    document.getElementById("startTestBtn").addEventListener("click", () => {
      document.getElementById("welcomeScreen").classList.add("hidden");
      document.getElementById("mainTestInterface").style.display = "";
      setTimeout(() => this.init(), 300);
    });
  }

  init() {
    this.startT = Date.now();
    this.lastQTime = this.startT;
    this.createGrid();
    this.startTimers();
    this.loadQ(0);
    this.setupEvents();
  }

  setupEvents() {
    document.getElementById("subBtn").style.display = "none";
    document.getElementById("menuBtn").onclick = () => this.togglePanel();
    document.getElementById("prevBtn").onclick = () => this.nav(-1);

    document.getElementById("nextBtn").onclick = () => {
      if (this.paused) return;
      if (this.curQ === this.qs.length - 1 && !this.sub) {
        this.confirmSub();
      } else {
        this.nav(1);
      }
    };

    this.els.reviewBtn.onclick = () => this.toggleReview();
    document.getElementById("panelClose").onclick = () => this.closePanel();
    document.getElementById("closeModal").onclick = () => this.closeModal();
    document.getElementById("revBtn").onclick = () => this.review();
    this.els.printBtn.onclick = () => this.printTest();
    this.els.pauseBtn.onclick = () => this.togglePause();
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  startTimers() {
    this.overallTimerInterval = setInterval(() => {
      if (this.paused) return;
      const elapsedSeconds = Math.floor(
        (Date.now() - this.startT - this.totalPausedTime) / 1000
      );
      this.els.timer.textContent = this.formatTime(elapsedSeconds);
    }, 1000);
  }

  loadQ(idx) {
    const now = Date.now();
    if (this.lastQTime !== null && this.curQ !== idx && !this.paused) {
      this.timeSpent[this.curQ] += now - this.lastQTime;
    }
    this.lastQTime = now;

    if (this.qnsTimerInterval) clearInterval(this.qnsTimerInterval);

    this.qnsTimerInterval = setInterval(() => {
      if (this.paused) return;
      const currentSessionTime = Date.now() - this.lastQTime;
      const totalQuestionTime = this.timeSpent[idx] + currentSessionTime;
      const totalSeconds = Math.floor(totalQuestionTime / 1000);
      this.els.qnsTimer.textContent = this.formatTime(totalSeconds);
    }, 1000);

    this.curQ = idx;
    const q = this.qs[idx];

    this.els.qInfo.textContent = `Q${idx + 1}/${this.qs.length}`;
    this.els.progTxt.textContent = `${idx + 1} of ${this.qs.length}`;
    this.updateUi();

    if (this.els.compSec && this.els.compCont) {
      this.els.compSec.style.display = q.comp ? "block" : "none";
      this.els.compCont.innerHTML = q.comp ? q.comp : "";
    }

    this.els.qTxt.innerHTML = q.question;
    this.loadOpts(q, idx);

    this.els.sol.classList.remove("show");
    if (this.sub && q.solution) {
      const timeInSeconds = Math.round(this.timeSpent[idx] / 1000);
      const timeStr = this.formatTime(timeInSeconds);

      this.els.solInfo.innerHTML = `<span><i class="fas fa-clock"></i> Time spent: ${timeStr}</span><span><i class="fas fa-check-circle"></i> Correct: ${String.fromCharCode(
        65 + q.correct_option_id
      )}</span>`;
      this.els.solCont.innerHTML = q.solution;
      this.els.sol.classList.add("show");
    }
  }

  createGrid() {
    const createButton = (i) => {
      const div = document.createElement("div");
      div.className = "q-num";
      div.textContent = i + 1;
      div.onclick = () => this.goToQ(i);
      return div;
    };
    this.els.qGrid.innerHTML = "";
    this.els.desktopQGrid.innerHTML = "";
    this.qs.forEach((_, i) => {
      this.els.qGrid.appendChild(createButton(i));
      this.els.desktopQGrid.appendChild(createButton(i));
    });
  }

  loadOpts(q, qIdx) {
    this.els.opts.innerHTML = "";
    q.options.forEach((opt, i) => {
      const div = document.createElement("div");
      let cls = "opt";
      if (this.sub) cls += " submitted";
      if (this.ans[qIdx] === i) cls += " sel";
      if (this.sub && q.correct_option_id !== undefined) {
        if (i === q.correct_option_id) cls += " correct";
        else if (this.ans[qIdx] === i) cls += " wrong";
      }
      div.className = cls;
      div.innerHTML = `<div class="opt-radio"></div><div class="opt-txt">${opt}</div>`;
      if (!this.sub && !this.paused) div.onclick = () => this.selOpt(i, qIdx);
      this.els.opts.appendChild(div);
    });
  }

  selOpt(optIdx, qIdx) {
    if (this.sub || this.paused) return;
    this.ans[qIdx] = this.ans[qIdx] === optIdx ? null : optIdx;
    this.loadOpts(this.qs[qIdx], qIdx);
    this.updateUi();
  }

  toggleReview() {
    if (this.sub || this.paused) return;
    this.reviewed[this.curQ] = !this.reviewed[this.curQ];
    this.updateUi();
  }

  nav(dir) {
    if (this.paused) return;
    const newIdx = this.curQ + dir;
    if (newIdx >= 0 && newIdx < this.qs.length) this.loadQ(newIdx);
  }

  goToQ(idx) {
    if (this.paused) return;
    this.loadQ(idx);
    this.closePanel();
  }

  updateUi() {
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    prevBtn.disabled = this.curQ === 0 || this.paused;

    if (this.curQ === this.qs.length - 1 && !this.sub) {
      nextBtn.innerHTML = 'Submit Test <i class="fas fa-check-circle"></i>';
      nextBtn.disabled = this.paused;
    } else {
      nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
      nextBtn.disabled = this.curQ === this.qs.length - 1 || this.paused;
    }

    this.els.reviewBtn.classList.toggle("active", this.reviewed[this.curQ]);
    this.els.ansCnt.textContent = this.ans.filter((a) => a !== null).length;

    const updateNum = (el, i) => {
      el.className = "q-num";
      if (i === this.curQ) el.classList.add("cur");
      else if (this.sub) {
        if (this.ans[i] !== null) {
          el.classList.add(
            this.ans[i] === this.qs[i].correct_option_id ? "ans" : "wrong"
          );
        } else {
          el.classList.add("unattempted");
        }
      } else {
        if (this.reviewed[i]) el.classList.add("review");
        else if (this.ans[i] !== null) el.classList.add("ans");
      }
    };
    this.els.qGrid.querySelectorAll(".q-num").forEach(updateNum);
    this.els.desktopQGrid.querySelectorAll(".q-num").forEach(updateNum);

    if (this.paused) {
      this.els.opts
        .querySelectorAll(".opt")
        .forEach((opt) => (opt.style.pointerEvents = "none"));
      this.els.reviewBtn.disabled = true;
    } else {
      this.els.opts
        .querySelectorAll(".opt")
        .forEach((opt) => (opt.style.pointerEvents = ""));
      this.els.reviewBtn.disabled = this.sub;
    }
  }

  confirmSub() {
    if (this.paused) return;
    if (confirm(`Are you sure you want to submit the test?`)) this.subTest();
  }

  subTest() {
    if (this.sub) return;
    this.sub = true;

    clearInterval(this.overallTimerInterval);
    clearInterval(this.qnsTimerInterval);

    if (this.lastQTime) {
      this.timeSpent[this.curQ] += Date.now() - this.lastQTime;
    }
    this.lastQTime = null;

    this.els.timer.style.display = "none";
    this.els.qnsTimer.style.display = "none";
    this.els.reviewBtn.style.display = "none";
    this.els.pauseBtn.style.display = "none";
    this.els.printBtn.style.display = "flex";
    this.els.restartBtn.style.display = "block";

    this.els.restartBtn.onclick = () => this.restartTest();

    const results = this.calcResults();
    this.showResults(results);
    this.loadQ(this.curQ);
    this.updateUi();
  }

  restartTest() {
    location.reload();
  }

  calcResults() {
    let correct = 0,
      incorrect = 0;
    this.qs.forEach((q, i) => {
      if (this.ans[i] !== null) {
        if (this.ans[i] === q.correct_option_id) correct++;
        else incorrect++;
      }
    });
    const score = correct * 1 - incorrect * 0.25;
    const totalTimeTaken = Math.floor(
      (this.startT ? Date.now() - this.startT : 0 - this.totalPausedTime) / 1000
    );

    return {
      score: Math.max(0, score).toFixed(2),
      correct,
      incorrect,
      unattempted: this.qs.length - (correct + incorrect),
      timeTaken: Math.floor(totalTimeTaken / 60),
    };
  }

  showResults(r) {
    this.els.scoreDisp.textContent = `${r.score}/${this.qs.length}`;
    this.els.corrStat.textContent = r.correct;
    this.els.incStat.textContent = r.incorrect;
    this.els.unaStat.textContent = r.unattempted;
    this.els.timeStat.textContent = r.timeTaken;
    this.els.modalOver.classList.add("show");
  }

  review() {
    this.closeModal();
    this.loadQ(0);
  }
  togglePanel() {
    this.els.panel.classList.toggle("open");
  }
  closePanel() {
    this.els.panel.classList.remove("open");
  }
  closeModal() {
    this.els.modalOver.classList.remove("show");
  }

  printTest() {
    const printWindow = window.open("", "_blank");
    const questionsHtml = this.qs
      .map((q, i) => {
        const userAns = this.ans[i];
        const correctAns = q.correct_option_id;
        const isCorrect = userAns === correctAns;

        return `
                <div style="page-break-inside:avoid; margin-bottom:2rem; border-bottom:1px solid #ccc; padding-bottom:1rem;">
                    <h3>Question ${i + 1}</h3>
                    <div>${q.question}</div>
                    <div style="margin-top:1rem;">
                        ${q.options
                          .map(
                            (opt, j) => `
                            <div style="padding:0.5rem; border-left: 4px solid ${
                              j === correctAns
                                ? "#10B981"
                                : j === userAns
                                ? "#EF4444"
                                : "#E5E7EB"
                            }; margin: 0.25rem 0;">
                                ${String.fromCharCode(65 + j)}. ${opt}
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div style="margin-top:1rem; font-size:0.9rem;">
                        <strong>Your answer:</strong> ${
                          userAns !== null
                            ? String.fromCharCode(65 + userAns)
                            : "Not attempted"
                        }
                        (${
                          isCorrect
                            ? '<span style="color:#10B981;">Correct</span>'
                            : '<span style="color:#EF4444;">Incorrect</span>'
                        })
                        <br>
                        <strong>Time spent:</strong> ${this.formatTime(
                          Math.round(this.timeSpent[i] / 1000)
                        )}
                    </div>
                    ${
                      q.solution
                        ? `
                        <div style="margin-top:1rem; background:#f0fdf4; padding:1rem; border-radius:8px;">
                            <h4 style="color:#10B981; margin-top:0;">Solution</h4>
                            ${q.solution}
                        </div>`
                        : ""
                    }
                </div>`;
      })
      .join("");

    printWindow.document.write(`
            <html>
                <head><title>Test Results</title><style>body{font-family:sans-serif;}</style></head>
                <body>
                    <h1>Test Analysis</h1>
                    <p><strong>Score:</strong> ${this.els.scoreDisp.textContent}</p>
                    <hr>
                    ${questionsHtml}
                    <script>setTimeout(() => window.print(), 500);</script>
                </body>
            </html>`);
    printWindow.document.close();
  }

  resumeFromOverlay = () => {
    if (this.paused) this.togglePause();
  };

  showPausedOverlay() {
    this.els.pausedOverlay.style.display = "flex";
    this.els.pausedOverlay.addEventListener("click", this.resumeFromOverlay);
  }

  hidePausedOverlay() {
    this.els.pausedOverlay.style.display = "none";
    this.els.pausedOverlay.removeEventListener("click", this.resumeFromOverlay);
  }

  togglePause() {
    if (this.sub) return;
    const pauseBtn = this.els.pauseBtn;
    this.paused = !this.paused;

    if (this.paused) {
      this.pauseStart = Date.now();
      this.timeSpent[this.curQ] += Date.now() - this.lastQTime;
      pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
      this.showPausedOverlay();
    } else {
      this.totalPausedTime += Date.now() - this.pauseStart;
      this.lastQTime = Date.now();
      pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
      this.hidePausedOverlay();
    }
    this.updateUi();
  }
}

// --- Start the quiz app when DOM is ready ---
document.addEventListener("DOMContentLoaded", () => {
  if (typeof quizData !== "undefined") {
    // Check the config to decide whether to shuffle
    if (typeof quizConfig !== 'undefined' && quizConfig.shuffle === true) {
        shuffleQuestionsAndOptions(quizData);
    }
    new TestApp(quizData);
  } else {
    console.error("Quiz data is not defined in the HTML file.");
  }
});