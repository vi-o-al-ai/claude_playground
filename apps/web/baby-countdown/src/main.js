import { computeCountdown, pregnancyWeek, DUE_DATE_ISO } from "./countdown.js";

const due = Date.parse(DUE_DATE_ISO);
// Reference start = 9 months before due, used purely for the journey progress bar.
const REFERENCE_MS = 9 * 30 * 24 * 60 * 60 * 1000;
const referenceStart = due - REFERENCE_MS;

const els = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  walker: document.getElementById("walker"),
  progressText: document.getElementById("progress-text"),
  milestoneIcon: document.getElementById("milestone-icon"),
  milestoneText: document.getElementById("milestone-text"),
  countdownSection: document.getElementById("countdown-section"),
  arrivalSection: document.getElementById("arrival-section"),
  leaves: document.getElementById("leaves"),
  confetti: document.getElementById("confetti"),
  weekNumber: document.getElementById("week-number"),
};

const last = { days: null, hours: null, minutes: null, seconds: null };

function setNumber(key, value) {
  const text = String(value).padStart(2, "0");
  if (els[key].textContent !== text) {
    els[key].textContent = text;
    if (last[key] !== null) {
      els[key].classList.remove("tick");
      void els[key].offsetWidth;
      els[key].classList.add("tick");
    }
    last[key] = value;
  }
}

function chooseMilestone(days) {
  if (days > 180) return ["🫘", "Tiny bean is curled up cozy in the chamber of secrets."];
  if (days > 90) return ["🌱", "Our little bean is sprouting roots and magic."];
  if (days > 60) return ["🍃", "Two months until our bean apparates into the world!"];
  if (days > 30) return ["🐍", "One month to go — the Slytherin scarf is being knit."];
  if (days > 14) return ["🪄", "Two weeks! Hogwarts is preparing the welcome owl."];
  if (days > 7) return ["⚡", "One week left — the Sorting Hat is warming up."];
  if (days > 1) return ["🦋", "Just a few sleeps until our little bean arrives!"];
  if (days >= 1) return ["✨", "Tomorrow! Tomorrow! Tomorrow!"];
  return ["🌟", "Any moment now…"];
}

let arrived = false;

function showArrival() {
  if (arrived) return;
  arrived = true;
  els.countdownSection.hidden = true;
  els.arrivalSection.hidden = false;
  spawnConfetti();
}

function tick() {
  const r = computeCountdown(Date.now(), due);

  if (r.arrived) {
    showArrival();
    return;
  }

  setNumber("days", r.days);
  setNumber("hours", r.hours);
  setNumber("minutes", r.minutes);
  setNumber("seconds", r.seconds);

  els.weekNumber.textContent = pregnancyWeek(Date.now(), due);

  const elapsed = Math.max(0, Date.now() - referenceStart);
  const pct = Math.max(0, Math.min(100, (elapsed / REFERENCE_MS) * 100));
  els.walker.style.left = `${pct}%`;
  els.progressText.textContent = `${Math.floor(pct)}% of the way through the woods 🐾`;

  const [icon, text] = chooseMilestone(r.days);
  els.milestoneIcon.textContent = icon;
  els.milestoneText.textContent = text;
}

function spawnConfetti() {
  const pieces = ["🌸", "🍃", "🌿", "✨", "🌼", "🦋", "🐍", "⚡", "🪄"];
  for (let i = 0; i < 60; i++) {
    const s = document.createElement("span");
    s.textContent = pieces[i % pieces.length];
    s.style.left = Math.random() * 100 + "%";
    s.style.animationDuration = 4 + Math.random() * 4 + "s";
    s.style.animationDelay = Math.random() * 3 + "s";
    els.confetti.appendChild(s);
  }
}

function spawnLeaves() {
  const kinds = ["🍃", "🌿", "🍂", "🍃", "🌿", "✨", "🐍"];
  for (let i = 0; i < 16; i++) {
    const l = document.createElement("div");
    l.className = "leaf";
    l.textContent = kinds[i % kinds.length];
    l.style.left = Math.random() * 100 + "%";
    l.style.animationDuration = 8 + Math.random() * 8 + "s";
    l.style.animationDelay = -Math.random() * 10 + "s";
    els.leaves.appendChild(l);
  }
}

spawnLeaves();
tick();
setInterval(tick, 1000);
