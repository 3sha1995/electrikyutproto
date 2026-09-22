/* ======================================================
     NOTIFICATION PANEL — open/close
     ====================================================== */
function toggleNotifications() {
  document.getElementById("notifOverlay").classList.toggle("open");
}
// Clicking the dimmed backdrop (not the panel itself) closes the panel
function closeNotificationsOnOverlay(e) {
  if (e.target.id === "notifOverlay") {
    e.currentTarget.classList.remove("open");
  }
}

/* ======================================================
     APPLIANCE ON/OFF TOGGLE
     Flips the switch's visual state and dims the whole row
     when an appliance is switched off, so the list reflects
     which devices are actually drawing power right now.
     ====================================================== */
function toggleAppliance(btn) {
  btn.classList.toggle("on");
  const card = btn.closest(".appliance-card");
  card.classList.toggle("off");
  updateActiveApplianceCount();
}

// Recomputes "Active appliances" stat chip in the hero card
function updateActiveApplianceCount() {
  const cards = document.querySelectorAll(".appliance-card");
  const total = cards.length;
  const active = document.querySelectorAll(".appliance-card:not(.off)").length;
  const statValues = document.querySelectorAll(".stat-chip .stat-value");
  // "Active appliances" is the 3rd stat chip in the hero grid
  if (statValues[2]) statValues[2].textContent = `${active} / ${total}`;
}

/* ======================================================
     BOTTOM NAV — highlight the tab that matches the current page
     Nav items are real links (<a data-page="...">), so the active
     state is set on load by comparing data-page to this page's
     <body data-page="..."> instead of relying on a click handler.
     ====================================================== */
function initNav() {
  const currentPage = document.body.dataset.page;
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === currentPage);
  });
}

/* ======================================================
     ANALYTICS — Daily energy consumption chart
     Bars + a dashed average-baseline line, redrawn whenever
     the Week / Month / Year period control is tapped.
     Each dataset is { labels, values (kWh), baseline (kWh) }.
     ====================================================== */
const dailyChartData = {
  week: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [12.4, 14.1, 10.8, 15.9, 18.2, 16.5, 14.7],
    baseline: 14.6,
  },
  month: {
    labels: ["W1", "W2", "W3", "W4"],
    values: [88.4, 95.1, 79.6, 102.3],
    baseline: 91.3,
  },
  year: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    values: [340, 318, 362, 355, 401, 428, 450, 439, 395],
    baseline: 387,
  },
};

function renderDailyChart(period) {
  const svg = document.getElementById("dailyChartSvg");
  if (!svg) return;

  // Keep the segmented control in sync with the chart
  document.querySelectorAll(".segmented-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.period === period);
  });

  const data = dailyChartData[period];
  const W = 320,
    H = 150,
    padTop = 10,
    padBottom = 22,
    padSide = 6;
  const chartH = H - padTop - padBottom;
  const maxVal = Math.max(...data.values) * 1.15;
  const barSlot = (W - padSide * 2) / data.values.length;
  const barWidth = Math.min(28, barSlot * 0.55);

  // Bars, each colored red if it exceeds the baseline
  let bars = "";
  let valueLabels = "";
  let labels = "";
  data.values.forEach((v, i) => {
    const x = padSide + i * barSlot + (barSlot - barWidth) / 2;
    const barH = (v / maxVal) * chartH;
    const y = padTop + (chartH - barH);
    const over = v > data.baseline;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${barH.toFixed(1)}" rx="3" fill="${over ? "var(--red)" : "var(--sky-500)"}"/>`;
    valueLabels += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${Math.max(8, y - 4).toFixed(1)}" text-anchor="middle" class="chart-value-label">${v}</text>`;
    labels += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="chart-axis-label">${data.labels[i]}</text>`;
  });

  // Dashed baseline (average) line
  const baseY = padTop + (chartH - (data.baseline / maxVal) * chartH);
  const baseline = `<line x1="${padSide}" y1="${baseY.toFixed(1)}" x2="${W - padSide}" y2="${baseY.toFixed(1)}" stroke="var(--navy-500)" stroke-width="1.5" stroke-dasharray="4 4"/>`;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = bars + baseline + valueLabels + labels;
}

/* ======================================================
     ANALYTICS — Appliance breakdown donut chart
     Built from concentric SVG circles using stroke-dasharray,
     one arc per appliance, driven by the same percentages
     shown in the legend list markup.
     ====================================================== */
function renderDonutChart() {
  const svg = document.getElementById("donutSvg");
  if (!svg) return;

  const segments = Array.from(document.querySelectorAll(".legend-row")).map(
    (row) => ({
      pct: parseFloat(row.dataset.pct),
      color: row.dataset.color,
    }),
  );

  const r = 60,
    cx = 80,
    cy = 80,
    circumference = 2 * Math.PI * r;
  let offset = 0;
  let arcs = "";
  segments.forEach((seg) => {
    const len = (seg.pct / 100) * circumference;
    arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="22"
                 stroke-dasharray="${len.toFixed(2)} ${(circumference - len).toFixed(2)}"
                 stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len;
  });

  svg.setAttribute("viewBox", "0 0 160 160");
  svg.innerHTML = arcs;
}

/* ======================================================
     ANALYTICS — Hourly load pattern (smooth area chart)
     Plots average kW for each of the 24 hours in the day.
     ====================================================== */
function renderHourlyAreaChart() {
  const svg = document.getElementById("hourlyAreaSvg");
  if (!svg) return;

  const values = [
    0.6, 0.5, 0.4, 0.4, 0.5, 0.7, 1.0, 1.3, 1.1, 1.0, 1.1, 1.3, 1.4, 1.2, 1.1,
    1.2, 1.4, 1.8, 2.4, 2.6, 2.2, 1.6, 1.0, 0.7,
  ];
  const W = 320,
    H = 130,
    padTop = 12,
    padBottom = 18,
    padSide = 4;
  const chartH = H - padTop - padBottom;
  const maxVal = Math.max(...values) * 1.1;
  const stepX = (W - padSide * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = padSide + i * stepX;
    const y = padTop + (chartH - (v / maxVal) * chartH);
    return [x, y];
  });

  // Simple smoothed path using quadratic mid-points between each pair
  let path = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} `;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const mx = (x0 + x1) / 2;
    path += `Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${((y0 + y1) / 2).toFixed(1)} `;
  }
  path += `L ${points[points.length - 1][0].toFixed(1)} ${points[points.length - 1][1].toFixed(1)}`;

  const areaPath = `${path} L ${points[points.length - 1][0].toFixed(1)} ${H - padBottom} L ${points[0][0].toFixed(1)} ${H - padBottom} Z`;

  // Highlight the 7–9 PM peak window (indices 19–20 approx)
  const peakX = padSide + 19 * stepX;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = `
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--sky-500)" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="var(--sky-500)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#areaFill)"/>
      <path d="${path}" fill="none" stroke="var(--sky-600)" stroke-width="2"/>
      <circle cx="${peakX.toFixed(1)}" cy="${points[19][1].toFixed(1)}" r="3.5" fill="var(--red)"/>
      <text x="${peakX.toFixed(1)}" y="${(points[19][1] - 8).toFixed(1)}" text-anchor="middle" class="chart-axis-label" fill="var(--red)">Peak</text>
    `;
}

/* ======================================================
     DEVICES PAGE — on/off toggle for a device card
     Mirrors toggleAppliance() but also zeroes out the live
     current/power readout when a device is switched off,
     since a de-energized channel draws nothing.
     ====================================================== */
function toggleDevice(btn) {
  const card = btn.closest(".device-card");
  btn.classList.toggle("on");
  const isOn = btn.classList.contains("on");
  card.classList.toggle("off", !isOn);

  const currentEl = card.querySelector(".metric-current");
  const powerEl = card.querySelector(".metric-power");
  if (currentEl && powerEl) {
    if (!isOn) {
      // Stash the live values so they can be restored if switched back on
      currentEl.dataset.live = currentEl.textContent;
      powerEl.dataset.live = powerEl.textContent;
      currentEl.textContent = "0.0 A";
      powerEl.textContent = "0 W";
    } else if (currentEl.dataset.live) {
      currentEl.textContent = currentEl.dataset.live;
      powerEl.textContent = powerEl.dataset.live;
    }
  }
  updateFilterCounts();
  applyDeviceFilter(getActiveFilter());
}

/* ======================================================
     DEVICES PAGE — Schedule button
     Expands an inline panel with start/end time fields.
     In a full build this would write a schedule back to the
     ESP32; here it just confirms the times to the button label.
     ====================================================== */
function toggleSchedulePanel(btn) {
  const card = btn.closest(".device-card");
  const panel = card.querySelector(".schedule-panel");
  if (panel) panel.classList.toggle("open");
}

function saveSchedule(btn) {
  const card = btn.closest(".device-card");
  const on = card.querySelector(".schedule-on").value;
  const off = card.querySelector(".schedule-off").value;
  const scheduleBtn = card.querySelector(".schedule-btn span");
  if (on && off && scheduleBtn) {
    scheduleBtn.textContent = `${on}–${off}`;
  }
  card.querySelector(".schedule-panel").classList.remove("open");
}

/* ======================================================
     DEVICES PAGE — filter bar (All / On / Off / Anomaly)
     Reads each card's data-status (space-separated tags) and
     shows/hides accordingly; also keeps the chip counts live.
     ====================================================== */
function getActiveFilter() {
  const active = document.querySelector(".filter-chip.active");
  return active ? active.dataset.filter : "all";
}

function applyDeviceFilter(filter) {
  document.querySelectorAll(".device-card").forEach((card) => {
    const tags = (card.dataset.status || "").split(" ");
    const show = filter === "all" || tags.includes(filter);
    card.style.display = show ? "" : "none";
  });
}

function updateFilterCounts() {
  const cards = document.querySelectorAll(".device-card");
  const counts = { all: cards.length, on: 0, off: 0, anomaly: 0 };
  cards.forEach((card) => {
    (card.dataset.status || "").split(" ").forEach((tag) => {
      if (counts[tag] !== undefined) counts[tag]++;
    });
  });
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    const countEl = chip.querySelector(".count");
    if (countEl) countEl.textContent = `(${counts[chip.dataset.filter] ?? 0})`;
  });
}

function initDeviceFilters() {
  const chips = document.querySelectorAll(".filter-chip");
  if (!chips.length) return;
  updateFilterCounts();
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      applyDeviceFilter(chip.dataset.filter);
    });
  });
}

/* ======================================================
     SMART PLUG PAIRING MODAL — 5-step flow
     One overlay, five .pairing-step panels; only the current
     step is shown. State lives in pairingState so validation
     (enabling/disabling Continue) can check it at any point.
     ====================================================== */
const pairingState = {
  step: 1,
  selectedDevice: null, // { name, mac } of the chosen found plug
  label: "",
  room: "",
  connecting: false,
  connectDone: false,
};

function openPairingModal() {
  // Reset to a clean state every time the flow is opened
  pairingState.step = 1;
  pairingState.selectedDevice = null;
  pairingState.label = "";
  pairingState.room = "";
  pairingState.connecting = false;
  pairingState.connectDone = false;

  document.getElementById("pairingLabelInput").value = "";
  document.getElementById("pairingRoomSelect").value = "";
  document.getElementById("pairingPasswordInput").value = "";
  document
    .querySelectorAll(".found-device-row")
    .forEach((r) => r.classList.remove("selected"));
  resetConnectChecklist();

  document.getElementById("pairingOverlay").classList.add("open");
  goToPairingStep(1);
}

function closePairingModal() {
  document.getElementById("pairingOverlay").classList.remove("open");
}

// Clicking the dimmed backdrop closes the modal, same pattern as the notification panel
function closePairingOnOverlay(e) {
  if (e.target.id === "pairingOverlay") closePairingModal();
}

function goToPairingStep(n) {
  pairingState.step = n;

  document.querySelectorAll(".pairing-step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === n);
  });

  document.getElementById("pairingStepCount").textContent = `Step ${n} of 5`;
  document.getElementById("pairingProgressFill").style.width =
    `${(n / 5) * 100}%`;

  const backBtn = document.getElementById("pairingBackBtn");
  const continueBtn = document.getElementById("pairingContinueBtn");

  if (n === 5) {
    // Final step: single "Go to Appliances" action, no Back
    backBtn.style.display = "none";
    continueBtn.textContent = "Go to Appliances";
    continueBtn.disabled = false;
    continueBtn.onclick = closePairingModal;
    fillPairingSummary();
    return;
  }

  backBtn.style.display = n === 1 ? "none" : "block";
  continueBtn.onclick = () => advancePairingStep();

  if (n === 1) {
    continueBtn.textContent = "I've plugged it in";
    continueBtn.disabled = false;
  } else if (n === 2) {
    continueBtn.textContent = "Continue";
    continueBtn.disabled = true; // enabled once a device is picked + labeled
  } else if (n === 3) {
    continueBtn.textContent = "Continue";
    continueBtn.disabled = true; // enabled once a password is entered
  } else if (n === 4) {
    continueBtn.textContent = "Continue";
    continueBtn.disabled = true; // enabled only when startConnecting() finishes
    startConnecting();
  }
}

function advancePairingStep() {
  if (pairingState.step < 5) goToPairingStep(pairingState.step + 1);
}
function retreatPairingStep() {
  if (pairingState.step > 1) goToPairingStep(pairingState.step - 1);
}

/* ---------- Step 2: device discovery ---------- */
function selectFoundDevice(row) {
  document
    .querySelectorAll(".found-device-row")
    .forEach((r) => r.classList.remove("selected"));
  row.classList.add("selected");
  pairingState.selectedDevice = {
    name: row.dataset.name,
    mac: row.dataset.mac,
  };
  document.getElementById("deviceLabelFields").style.display = "flex";
  validateStep2();
}

function validateStep2() {
  const label = document.getElementById("pairingLabelInput").value.trim();
  const room = document.getElementById("pairingRoomSelect").value;
  pairingState.label = label;
  pairingState.room = room;
  const ready = !!pairingState.selectedDevice && !!label && !!room;
  document.getElementById("pairingContinueBtn").disabled = !ready;
}

/* ---------- Step 3: Wi-Fi credentials ---------- */
function validateStep3() {
  const pw = document.getElementById("pairingPasswordInput").value;
  document.getElementById("pairingContinueBtn").disabled = pw.length === 0;
}

function togglePasswordVisibility(btn) {
  const input = document.getElementById("pairingPasswordInput");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  btn.textContent = showing ? "Show" : "Hide";
}

/* ---------- Step 4: connecting ---------- */
function resetConnectChecklist() {
  document
    .querySelectorAll(".connect-item")
    .forEach((el) => el.classList.remove("done", "active"));
  const fill = document.getElementById("connectSubFill");
  if (fill) fill.style.width = "0%";
}

function startConnecting() {
  if (pairingState.connectDone) {
    // Already finished in a previous visit to this step
    document
      .querySelectorAll(".connect-item")
      .forEach((el) => el.classList.add("done"));
    document.getElementById("pairingContinueBtn").disabled = false;
    return;
  }
  resetConnectChecklist();
  const items = Array.from(document.querySelectorAll(".connect-item"));
  let i = 0;

  function runNext() {
    if (i > 0) items[i - 1].classList.remove("active");
    if (i >= items.length) {
      pairingState.connectDone = true;
      document.getElementById("pairingContinueBtn").disabled = false;
      return;
    }
    items[i].classList.add("active");

    // The "Joining Wi-Fi" stage shows its own progress bar filling up
    if (items[i].dataset.stage === "joining") {
      const fill = document.getElementById("connectSubFill");
      let pct = 0;
      const tick = setInterval(() => {
        pct += 10;
        if (fill) fill.style.width = pct + "%";
        if (pct >= 100) {
          clearInterval(tick);
          items[i].classList.add("done");
          i++;
          setTimeout(runNext, 300);
        }
      }, 90);
    } else {
      setTimeout(() => {
        items[i].classList.add("done");
        i++;
        runNext();
      }, 700);
    }
  }
  runNext();
}

/* ---------- Step 5: fill in the summary card once pairing completes ---------- */
function fillPairingSummary() {
  const dev = pairingState.selectedDevice || { name: "—", mac: "—" };
  document.getElementById("summaryDeviceName").textContent =
    pairingState.label || dev.name;
  document.getElementById("summaryMac").textContent = dev.mac;
}

/* ======================================================
     APPLIANCE DETAIL MODAL — per-appliance data + charts
     Same dataset and modal markup are reused on both
     index.html (appliance-card) and devices.html (device-card);
     each card's onclick passes its key into openApplianceModal().
     ====================================================== */
const applianceDetails = {
  ac: {
    name: "Air conditioner",
    meta: "Living Room · Channel CT1",
    status: "on",
    icon: '<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    power: "2062 W",
    current: "9.1 A",
    today: "6.17 kWh",
    monthly: "132.4 kWh",
    hourly: [
      3, 2, 2, 2, 3, 4, 6, 7, 6, 6, 7, 8, 8, 7, 7, 8, 9, 12, 20, 22, 18, 12, 7,
      4,
    ],
    weekly: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [5.1, 5.8, 4.6, 6.9, 7.4, 7.0, 6.17],
      baseline: 6.1,
    },
    anomalies: [
      {
        title: "Power spike detected",
        time: "Today, 6:40 PM",
        model: "LSTM · 94% confidence",
        severity: "critical",
      },
    ],
  },
  fridge: {
    name: "Refrigerator",
    meta: "Kitchen · Channel CT2",
    status: "on",
    icon: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 11h14"/>',
    power: "295 W",
    current: "1.3 A",
    today: "2.94 kWh",
    monthly: "88.1 kWh",
    hourly: [
      4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 4, 4, 4, 5, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4,
    ],
    weekly: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [2.8, 2.9, 2.8, 3.0, 2.9, 3.1, 2.94],
      baseline: 2.9,
    },
    anomalies: [
      {
        title: "Current surge on last 3 cycles",
        time: "Today, 5:12 PM",
        model: "GRU · 81% confidence",
        severity: "warning",
      },
    ],
  },
  washer: {
    name: "Washing machine",
    meta: "Laundry Area · Channel CT3",
    status: "off",
    icon: '<path d="M4 10h16M4 10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2M4 10v8h16v-8"/><path d="M8 18v2M16 18v2"/>',
    power: "0 W",
    current: "0.0 A",
    today: "2.35 kWh",
    monthly: "41.6 kWh",
    hourly: [
      0, 0, 0, 0, 0, 0, 0, 0, 14, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
    weekly: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [0, 2.1, 0, 0, 2.6, 0, 2.35],
      baseline: 1.9,
    },
    anomalies: [],
  },
  fan: {
    name: "Electric fan",
    meta: "Bedroom · Channel CT4",
    status: "on",
    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    power: "158 W",
    current: "0.7 A",
    today: "1.62 kWh",
    monthly: "38.9 kWh",
    hourly: [
      0, 0, 0, 0, 0, 0, 2, 3, 3, 3, 4, 4, 5, 6, 6, 7, 8, 9, 10, 9, 7, 5, 3, 1,
    ],
    weekly: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [1.4, 1.5, 1.3, 1.6, 1.7, 1.8, 1.62],
      baseline: 1.55,
    },
    anomalies: [],
  },
  lights: {
    name: "Living room lights",
    meta: "Living Room · Channel CT5",
    status: "on",
    icon: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.5 1 1.3 1 2.5h6c0-1.2.4-2 1-2.5A6 6 0 0 0 12 3z"/>',
    power: "110 W",
    current: "0.5 A",
    today: "1.03 kWh",
    monthly: "26.4 kWh",
    hourly: [
      0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 6, 8, 9, 8, 5, 2, 1,
    ],
    weekly: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [0.9, 1.0, 0.9, 1.1, 1.2, 1.3, 1.03],
      baseline: 1.06,
    },
    anomalies: [],
  },
  cooker: {
    name: "Rice cooker",
    meta: "Kitchen · Channel CT6",
    status: "off",
    icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M11 10v4M15 10v4"/>',
    power: "0 W",
    current: "0.0 A",
    today: "0.59 kWh",
    monthly: "14.2 kWh",
    hourly: [
      0, 0, 0, 0, 0, 0, 10, 14, 0, 0, 0, 0, 6, 4, 0, 0, 0, 0, 8, 3, 0, 0, 0, 0,
    ],
    weekly: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      values: [0.5, 0.6, 0.5, 0.6, 0.5, 0.7, 0.59],
      baseline: 0.57,
    },
    anomalies: [],
  },
};

// Shared bar+dashed-baseline SVG renderer, used by the daily consumption
// chart on Analytics and the weekly trend chart in this modal
function drawBarBaselineChart(svg, labels, values, baseline) {
  const W = 320,
    H = 150,
    padTop = 10,
    padBottom = 22,
    padSide = 6;
  const chartH = H - padTop - padBottom;
  const maxVal = Math.max(...values, baseline) * 1.15;
  const barSlot = (W - padSide * 2) / values.length;
  const barWidth = Math.min(28, barSlot * 0.55);

  let bars = "",
    valueLabels = "",
    labelsSvg = "";
  values.forEach((v, i) => {
    const x = padSide + i * barSlot + (barSlot - barWidth) / 2;
    const barH = (v / maxVal) * chartH;
    const y = padTop + (chartH - barH);
    const over = v > baseline;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth}" height="${barH.toFixed(1)}" rx="3" fill="${over ? "var(--red)" : "var(--sky-500)"}"/>`;
    valueLabels += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${Math.max(8, y - 4).toFixed(1)}" text-anchor="middle" class="chart-value-label">${v}</text>`;
    labelsSvg += `<text x="${(x + barWidth / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" class="chart-axis-label">${labels[i]}</text>`;
  });
  const baseY = padTop + (chartH - (baseline / maxVal) * chartH);
  const baselineSvg = `<line x1="${padSide}" y1="${baseY.toFixed(1)}" x2="${W - padSide}" y2="${baseY.toFixed(1)}" stroke="var(--navy-500)" stroke-width="1.5" stroke-dasharray="4 4"/>`;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = bars + baselineSvg + valueLabels + labelsSvg;
}

// Plain hourly bar chart (no baseline) — bars past a "high usage" cutoff turn red
function drawHourlyBars(svg, values) {
  const W = 320,
    H = 90,
    padTop = 6,
    padBottom = 4,
    padSide = 4;
  const chartH = H - padTop - padBottom;
  const maxVal = Math.max(...values, 1) * 1.15;
  const barSlot = (W - padSide * 2) / values.length;
  const barWidth = Math.max(4, barSlot * 0.6);
  const cutoff = Math.max(...values) * 0.75;

  let bars = "";
  values.forEach((v, i) => {
    const x = padSide + i * barSlot + (barSlot - barWidth) / 2;
    const barH = Math.max(1.5, (v / maxVal) * chartH);
    const y = padTop + (chartH - barH);
    const high = v >= cutoff && v > 0;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="${high ? "var(--red)" : "var(--sky-500)"}"/>`;
  });

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = bars;
}

function openApplianceModal(id) {
  const data = applianceDetails[id];
  if (!data) return;

  document.getElementById("detailName").textContent = data.name;
  document.getElementById("detailMeta").textContent = data.meta;
  document.getElementById("detailIcon").innerHTML = data.icon;

  const statusPill = document.getElementById("detailStatus");
  statusPill.textContent = data.status === "on" ? "On" : "Off";
  statusPill.classList.toggle("off", data.status !== "on");

  document.getElementById("detailPower").textContent = data.power;
  document.getElementById("detailCurrent").textContent = data.current;
  document.getElementById("detailToday").textContent = data.today;
  document.getElementById("detailMonthly").textContent = data.monthly;

  drawHourlyBars(document.getElementById("detailHourlySvg"), data.hourly);
  drawBarBaselineChart(
    document.getElementById("detailWeeklySvg"),
    data.weekly.labels,
    data.weekly.values,
    data.weekly.baseline,
  );

  const anomalyList = document.getElementById("detailAnomalyList");
  if (data.anomalies.length) {
    anomalyList.innerHTML = data.anomalies
      .map(
        (a) => `
        <div class="anomaly-card ${a.severity}">
          <div class="anomaly-top">
            <span class="anomaly-name">${a.title}</span>
            <span class="severity-tag ${a.severity}">${a.severity === "critical" ? "Critical" : "Warning"}</span>
          </div>
          <div class="anomaly-desc">${a.time}</div>
          <span class="anomaly-model">${a.model}</span>
        </div>
      `,
      )
      .join("");
  } else {
    anomalyList.innerHTML =
      '<div class="detail-anomaly-empty">No anomalies recorded for this device.</div>';
  }

  document.getElementById("applianceDetailOverlay").classList.add("open");
}

function closeApplianceModal() {
  document.getElementById("applianceDetailOverlay").classList.remove("open");
}
function closeApplianceModalOnOverlay(e) {
  if (e.target.id === "applianceDetailOverlay") closeApplianceModal();
}

/* ======================================================
     PAGE INIT — feature-detects which elements exist so the
     same script.js works across index.html, analytics.html
     and devices.html
     ====================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  if (document.getElementById("dailyChartSvg")) renderDailyChart("week");
  if (document.getElementById("donutSvg")) renderDonutChart();
  if (document.getElementById("hourlyAreaSvg")) renderHourlyAreaChart();
  initDeviceFilters();

  // Wire up the Week / Month / Year segmented control
  document.querySelectorAll(".segmented-btn").forEach((btn) => {
    btn.addEventListener("click", () => renderDailyChart(btn.dataset.period));
  });

  // Pairing modal live-validation listeners (only present on devices.html)
  const labelInput = document.getElementById("pairingLabelInput");
  const roomSelect = document.getElementById("pairingRoomSelect");
  const pwInput = document.getElementById("pairingPasswordInput");
  if (labelInput) labelInput.addEventListener("input", validateStep2);
  if (roomSelect) roomSelect.addEventListener("change", validateStep2);
  if (pwInput) pwInput.addEventListener("input", validateStep3);
});
