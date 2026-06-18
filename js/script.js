// ================================================================
// DATA LAYER
// ================================================================
const STORAGE_KEY = 'rewardRouletteData';
const MAX_DAILY_STUDY_SECONDS = 10 * 60 * 60;

function getLocalDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatClock(totalSeconds, showHours = true) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(safeSeconds % 60).padStart(2, '0');
  return showHours ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function formatDurationLabel(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours} giờ ${minutes} phút`;
  if (hours > 0) return `${hours} giờ`;
  if (minutes > 0) return `${minutes} phút`;
  return `${safeSeconds % 60} giây`;
}

function formatCompactDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}p`;
  return `${minutes}p`;
}

function ensureTodayStudyData() {
  const todayKey = getLocalDateKey();
  if (data.todayStudyDate !== todayKey) {
    data.todayStudyDate = todayKey;
    data.todayStudySeconds = 0;
  }
}

function awardStudyMilestones() {
  const totalHours = Math.floor((data.totalStudySeconds || 0) / 3600);
  const currentLifetimeHours = Number(data.lifetimeHours) || 0;
  if (totalHours > currentLifetimeHours) {
    const gained = totalHours - currentLifetimeHours;
    data.hours += gained;
    data.drawTickets += gained;
    data.lifetimeHours = totalHours;
    addHistory({ type: 'progress', text: `⏱️ +${gained}h học · +${gained} Vé quay` });
  } else {
    data.lifetimeHours = totalHours;
  }
}

function addStudyTimeRange(startMs, endMs) {
  if (!startMs || !endMs || endMs <= startMs) return 0;
  let cursor = startMs;
  let addedSeconds = 0;
  const todayKey = getLocalDateKey();

  while (cursor < endMs) {
    const cursorDate = new Date(cursor);
    const nextDay = new Date(cursorDate);
    nextDay.setHours(24, 0, 0, 0);
    const chunkEnd = Math.min(endMs, nextDay.getTime());
    const chunkSeconds = Math.floor((chunkEnd - cursor) / 1000);
    if (chunkSeconds <= 0) break;

    data.totalStudySeconds = (data.totalStudySeconds || 0) + chunkSeconds;
    if (getLocalDateKey(cursorDate) === todayKey) {
      if (data.todayStudyDate !== todayKey) {
        data.todayStudyDate = todayKey;
        data.todayStudySeconds = 0;
      }
      data.todayStudySeconds = (data.todayStudySeconds || 0) + chunkSeconds;
    }

    addedSeconds += chunkSeconds;
    cursor += chunkSeconds * 1000;
  }

  awardStudyMilestones();
  updateStreakDays();
  return addedSeconds;
}

function getDefaultData() {
  const defaultRewards = [
    'Coffee', 'Snack', 'Game 10m', 'Game 20m', 'YouTube',
    'Read Book', 'Walk', 'Movie Episode', 'Music',
    '+1 Star', '+2 Stars', '+3 Stars', '+5 Stars',
    'Random Stars', 'Double Next Star', 'Triple Next Star',
    'Star Chest', 'Star Rush', 'Lucky Day', 'Bonus Draw', 'Jackpot Stars',
    'Stretch', 'Chat', 'Journal', 'Plant', 'Bath',
    'Cake', 'Tea', 'Photo', 'Podcast', 'Puzzle',
    'Exercise', 'Brain Game', 'Doodle', 'Magazine',
    'Sunlight', 'Night Walk', 'Hydrate', 'Chocolate',
    'Cozy Socks', 'Candle', 'Piano', 'Notebook',
    'Pen', 'Letter', 'Comedy', 'Laundry', 'Clean'
  ];
  return {
    hours: 0,
    stars: 0,
    streak: 0,
    streakDays: 0,
    lastStudyDate: null,
    lifetimeStars: 0,
    lifetimeRewards: 0,
    lifetimeHours: 0,
    totalStudySeconds: 0,
    todayStudySeconds: 0,
    todayStudyDate: getLocalDateKey(),
    drawTickets: 0,
    rewards: defaultRewards.map(name => ({ id: 'r' + Date.now() + Math.random().toString(36).substr(2,4), name })),
    shopItems: [
      { id: 's1', name: 'Đồ uống yêu thích', cost: 10, lastRedeemed: null },
      { id: 's2', name: 'Đồ ăn vặt', cost: 15, lastRedeemed: null },
      { id: 's3', name: 'Ăn ngoài', cost: 25, lastRedeemed: null },
      { id: 's4', name: 'Mua sách', cost: 50, lastRedeemed: null },
      { id: 's5', name: 'Mua linh kiện robot', cost: 80, lastRedeemed: null },
      { id: 's6', name: 'Món đồ công nghệ nhỏ', cost: 150, lastRedeemed: null }
    ],
    history: [],
    purchaseHistory: [],
    luckyGateSpinsLeft: 0,
    timerSeconds: 0,
    timerRunning: false,
    timerPaused: false,
    sessionStart: null,
    elapsedSeconds: 0,
    timerMode: 'countup',
    pomodoroStudy: 25,
    pomodoroBreak: 5,
    pomodoroPhase: 'study',
    pomodoroRemaining: 25 * 60,
    pomodoroActive: false,
    pomodoroLastTick: null,
    doubleNextStar: false,
    tripleNextStar: false,
    starRushCount: 0,
    luckyDay: false,
    wheelItems: [],
    wheelRevealed: false,
    wheelPhase: 'idle',
    removedCount: 0,
    wheelResult: null,
  };
}

let data = loadData();
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = getDefaultData();
      for (let key in def) {
        if (!(key in parsed)) parsed[key] = def[key];
      }
      const migratedHours = Math.max(Number(parsed.lifetimeHours) || 0, Number(parsed.hours) || 0);
      parsed.totalStudySeconds = Math.max(Number(parsed.totalStudySeconds) || 0, migratedHours * 3600 + (Number(parsed.timerSeconds) || 0));
      if (!parsed.todayStudyDate) parsed.todayStudyDate = getLocalDateKey();
      if (parsed.todayStudyDate !== getLocalDateKey() && !parsed.timerRunning && !parsed.pomodoroActive) {
        parsed.todayStudyDate = getLocalDateKey();
        parsed.todayStudySeconds = 0;
      }
      return parsed;
    }
  } catch (e) { console.warn('load error', e); }
  return getDefaultData();
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() { return Date.now() + '-' + Math.random().toString(36).substr(2, 6); }
function addHistory(entry) {
  data.history.unshift({ time: new Date().toLocaleString('vi-VN'), ...entry });
  if (data.history.length > 300) data.history = data.history.slice(0, 300);
  saveData();
}
function addPurchaseHistory(itemName, cost) {
  data.purchaseHistory.unshift({
    time: new Date().toLocaleString('vi-VN'),
    name: itemName,
    cost: cost
  });
  if (data.purchaseHistory.length > 200) data.purchaseHistory = data.purchaseHistory.slice(0, 200);
  saveData();
}

// ================================================================
// TOAST
// ================================================================
function showToast(title, desc) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-desc">${desc}</div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ================================================================
// MOTIVATION QUOTES (Vietnamese)
// ================================================================
const quotes = [
  { text: "Hãy luôn khao khát, hãy cứ dại khờ.", author: "Steve Jobs", tag: "Bứt phá" },
  { text: "Cách tốt nhất để đoán trước tương lai là tự tay tạo ra nó.", author: "Alan Kay", tag: "Tầm nhìn" },
  { text: "Sự bền bỉ rất quan trọng. Đừng bỏ cuộc, trừ khi bạn thật sự không còn lựa chọn nào khác.", author: "Elon Musk", tag: "Kiên trì" },
  { text: "Thành công là người thầy khắt khe: nó dễ khiến ta lầm tưởng rằng mình không thể thất bại.", author: "Bill Gates", tag: "Tỉnh táo" },
  { text: "Hãy tiến thật nhanh, nhưng vẫn phải tạo ra thứ đáng để giữ lại.", author: "Mark Zuckerberg", tag: "Hành động" },
  { text: "Khách hàng khó tính nhất thường là người dạy bạn nhiều điều nhất.", author: "Bill Gates", tag: "Học hỏi" },
  { text: "Chính những người đủ khác biệt để nghĩ rằng họ có thể đổi thế giới mới là người làm được điều đó.", author: "Steve Jobs", tag: "Niềm tin" },
  { text: "Bạn không cần phải giỏi ngay từ đầu, nhưng phải bắt đầu thì mới có thể giỏi.", author: "Zig Ziglar", tag: "Bắt đầu" },
  { text: "Những việc nhỏ làm đều đặn mỗi ngày sẽ tạo nên khác biệt rất lớn sau một thời gian.", author: "Robin Sharma", tag: "Đều đặn" }
];

let lastQuoteIndex = -1;
function updateMotivation() {
  let idx = Math.floor(Math.random() * quotes.length);
  if (quotes.length > 1) {
    while (idx === lastQuoteIndex) {
      idx = Math.floor(Math.random() * quotes.length);
    }
  }
  lastQuoteIndex = idx;
  document.getElementById('quoteText').textContent = `"${quotes[idx].text}"`;
  document.getElementById('quoteAuthor').textContent = quotes[idx].author;
  document.getElementById('quoteCategory').textContent = quotes[idx].tag;
}

// ================================================================
// RANDOM STAR MODIFIER
// ================================================================
function applyRandomStarModifier(amount) {
  if (amount <= 0) return { amount, message: '' };
  const roll = Math.random();
  let newAmount = amount;
  let message = '';
  if (roll < 0.05) {
    newAmount = Math.max(0, amount - 1);
    message = `💧 Mất 1 sao (phạt nhẹ)`;
  } else if (roll < 0.15) {
    newAmount = Math.round(amount * 1.5);
    message = `⚡ Bùng nổ sao: x1.5!`;
  } else if (roll < 0.30) {
    newAmount = amount + 1;
    message = `✨ Thêm 1 sao thưởng!`;
  } else {
    message = '';
  }
  return { amount: newAmount, message };
}

// ================================================================
// RENDER HELPERS
// ================================================================
function updateDashboard() {
  ensureTodayStudyData();
  const pct = Math.min(100, (data.hours / 100) * 100);
  document.getElementById('hoursDisplay').textContent = `${data.hours} / 100 giờ`;
  const fill = document.getElementById('progressFill');
  fill.style.width = pct + '%';
  let color = 'linear-gradient(90deg, #ff7a59 0%, #ffb04c 100%)';
  if (pct >= 60) color = 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)';
  else if (pct >= 40) color = 'linear-gradient(90deg, #f59e0b 0%, #f97316 100%)';
  else if (pct >= 20) color = 'linear-gradient(90deg, #facc15 0%, #f59e0b 100%)';
  fill.style.background = color;
  document.getElementById('starDisplay').textContent = data.stars;
  document.getElementById('ticketDisplay').textContent = data.drawTickets;
  document.getElementById('todayStudyDisplay').textContent = formatCompactDuration(data.todayStudySeconds || 0);
  document.getElementById('streakDaysDisplay').textContent = data.streakDays;
  document.getElementById('lifetimeHoursDisplay').textContent = data.lifetimeHours;
  document.getElementById('vaultCount').textContent = `(${data.rewards.length})`;

  const todaySeconds = data.todayStudySeconds || 0;
  const todayCappedSeconds = Math.min(MAX_DAILY_STUDY_SECONDS, todaySeconds);
  const dailyPct = Math.min(100, (todayCappedSeconds / MAX_DAILY_STUDY_SECONDS) * 100);
  document.getElementById('dailyProgressFill').style.width = `${dailyPct}%`;
  document.getElementById('dailyProgressText').textContent = `${formatDurationLabel(todaySeconds)} / 10 giờ`;
  const dailyHint = dailyPct >= 100
    ? 'Bạn đã chạm mốc 10 giờ hôm nay. Thanh sẽ tự đặt lại khi sang ngày mới.'
    : `Hôm nay đã học ${formatDurationLabel(todaySeconds)}. Còn ${formatDurationLabel(MAX_DAILY_STUDY_SECONDS - todayCappedSeconds)} để đầy thanh.`;
  document.getElementById('dailyProgressHint').textContent = dailyHint;

  let displaySeconds = data.timerSeconds;
  if (data.timerRunning && data.sessionStart) {
    const now = Date.now();
    const elapsed = Math.floor((now - data.sessionStart) / 1000);
    displaySeconds = data.timerSeconds + elapsed;
  }
  document.getElementById('timerDisplay').textContent = formatClock(displaySeconds);
  const btn = document.getElementById('timerToggleBtn');
  if (data.timerRunning || data.pomodoroActive) btn.innerHTML = '<i class="ph ph-pause"></i> Tạm dừng';
  else btn.innerHTML = '<i class="ph ph-play"></i> Bắt đầu';

  const mode = document.querySelector('input[name="timerMode"]:checked').value;
  if (mode === 'pomodoro') {
    const remaining = data.pomodoroRemaining;
    document.getElementById('timerDisplay').textContent = formatClock(remaining, false);
    document.getElementById('phaseLabel').textContent = data.pomodoroPhase === 'study' ? 'Học' : 'Nghỉ';
    document.getElementById('sessionStatusText').textContent =
      data.pomodoroActive
        ? `Pomodoro đang chạy ở pha ${data.pomodoroPhase === 'study' ? 'học' : 'nghỉ'}.`
        : `Pomodoro sẵn sàng ở pha ${data.pomodoroPhase === 'study' ? 'học' : 'nghỉ'}.`;
  } else {
    document.getElementById('sessionStatusText').textContent =
      data.timerRunning
        ? `Đang ghi nhận phiên học hiện tại: ${formatDurationLabel(displaySeconds)}.`
        : (displaySeconds > 0
          ? `Phiên hiện tại đã tích lũy ${formatDurationLabel(displaySeconds)}.`
          : 'Thời gian học được ghi nhận theo thời gian thực.');
  }

  document.getElementById('pomodoroConfig').textContent = `${data.pomodoroStudy} / ${data.pomodoroBreak} phút`;
  renderActiveEffects();
}

function renderActiveEffects() {
  const container = document.getElementById('activeEffects');
  let buffs = [];
  if (data.doubleNextStar) buffs.push('×2 Sao tiếp theo');
  if (data.tripleNextStar) buffs.push('×3 Sao tiếp theo');
  if (data.starRushCount > 0) buffs.push(`Star Rush (còn ${data.starRushCount} lượt)`);
  if (data.luckyDay) buffs.push('Ngày may mắn');
  if (buffs.length === 0) {
    container.innerHTML = '<span style="color:#8a8a85; font-size:0.85rem;">Không có hiệu ứng đặc biệt</span>';
  } else {
    container.innerHTML = buffs.map(b => `<span class="buff-tag">${b}</span>`).join('');
  }
}

function renderShop() {
  const container = document.getElementById('shopList');
  if (!data.shopItems.length) { container.innerHTML = '<div style="color:#8a8a85;">Chưa có vật phẩm</div>'; return; }
  container.innerHTML = data.shopItems.map(item => {
    const last = item.lastRedeemed ? `Lần cuối: ${item.lastRedeemed}` : 'Chưa đổi';
    return `
    <div class="shop-item" style="display:flex; justify-content:space-between; margin:6px 0; background:#f6f6f2; padding:10px 16px; border-radius:40px; flex-wrap:wrap;">
      <span>${item.name} <span style="color:#5c5c57;">— ${item.cost} ⭐</span>
        <span style="font-size:0.7rem; color:#888; margin-left:8px;">${last}</span>
      </span>
      <span>
        <button class="icon-btn" data-shop-buy="${item.id}"><i class="ph ph-shopping-cart"></i></button>
        <button class="icon-btn" data-shop-edit="${item.id}"><i class="ph ph-pencil"></i></button>
        <button class="icon-btn" data-shop-del="${item.id}"><i class="ph ph-x"></i></button>
      </span>
    </div>
  `}).join('');
  container.querySelectorAll('[data-shop-buy]').forEach(el => {
    el.onclick = () => buyShopItem(el.dataset.shopBuy);
  });
  container.querySelectorAll('[data-shop-edit]').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.shopEdit;
      const item = data.shopItems.find(i => i.id === id);
      if (!item) return;
      const newName = prompt('Sửa tên vật phẩm', item.name);
      if (newName !== null) item.name = newName || item.name;
      const newCost = prompt('Sửa giá sao', item.cost);
      if (newCost !== null) { const c = parseInt(newCost); if (!isNaN(c)) item.cost = c; }
      saveData(); renderShop(); updateDashboard();
    };
  });
  container.querySelectorAll('[data-shop-del]').forEach(el => {
    el.onclick = () => {
      if (confirm('Xóa vật phẩm này?')) {
        data.shopItems = data.shopItems.filter(i => i.id !== el.dataset.shopDel);
        saveData(); renderShop(); updateDashboard();
      }
    };
  });
}

function renderHistory() {
  const container = document.getElementById('historyList');
  let html = '';
  if (data.purchaseHistory.length) {
    html += `<h3 style="margin:12px 0 8px; font-weight:500;">Lịch sử mua</h3>`;
    data.purchaseHistory.slice(0, 20).forEach(h => {
      html += `<div class="history-item"><span class="history-time">${h.time}</span><span>🛒 ${h.name} — ${h.cost} ⭐</span></div>`;
    });
  }
  if (data.history.length) {
    html += `<h3 style="margin:12px 0 8px; font-weight:500;">Hoạt động</h3>`;
    data.history.slice(0, 30).forEach(h => {
      html += `<div class="history-item"><span class="history-time">${h.time}</span><span>${h.text || h.type || 'sự kiện'}</span></div>`;
    });
  }
  if (!html) html = '<div style="color:#8a8a85;">Chưa có lịch sử</div>';
  container.innerHTML = html;
}

function renderRewardPool() {
  const container = document.getElementById('rewardPoolList');
  if (!data.rewards.length) { container.innerHTML = '<div style="color:#8a8a85;">Chưa có phần thưởng</div>'; return; }
  container.innerHTML = data.rewards.map(r => `
    <span class="reward-tag">
      ${r.name}
      <button class="icon-btn" data-reward-edit="${r.id}"><i class="ph ph-pencil"></i></button>
      <button class="icon-btn" data-reward-del="${r.id}"><i class="ph ph-x"></i></button>
    </span>
  `).join('');
  container.querySelectorAll('[data-reward-edit]').forEach(el => {
    el.onclick = () => {
      const id = el.dataset.rewardEdit;
      const r = data.rewards.find(i => i.id === id);
      if (!r) return;
      const newName = prompt('Sửa phần thưởng', r.name);
      if (newName !== null) r.name = newName || r.name;
      saveData(); renderRewardPool(); updateDashboard();
    };
  });
  container.querySelectorAll('[data-reward-del]').forEach(el => {
    el.onclick = () => {
      if (confirm('Xóa phần thưởng này?')) {
        data.rewards = data.rewards.filter(i => i.id !== el.dataset.rewardDel);
        saveData(); renderRewardPool(); updateDashboard();
      }
    };
  });
}

// ================================================================
// STREAK DAYS UPDATE
// ================================================================
function updateStreakDays() {
  ensureTodayStudyData();
  const today = getLocalDateKey();
  if ((data.todayStudySeconds || 0) < 3600 || data.lastStudyDate === today) return;

  if (data.lastStudyDate) {
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateKey(yesterday);
    if (data.lastStudyDate === yesterdayStr) {
      data.streakDays += 1;
    } else {
      data.streakDays = 1;
    }
  } else {
    data.streakDays = 1;
  }

  data.lastStudyDate = today;
}

// ================================================================
// WHEEL (5x3)
// ================================================================
function buildWheelGrid() {
  const grid = document.getElementById('wheelGrid');
  grid.innerHTML = '';
  const positions = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      positions.push({ row: r, col: c });
    }
  }
  positions.forEach((pos, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (pos.row === 1 && pos.col === 2) {
      cell.className = 'spin-center';
      cell.id = 'spinCenterBtn';
      cell.innerHTML = `<i class="ph ph-arrow-clockwise"></i> QUAY`;
      cell.disabled = true;
      cell.style.cursor = 'pointer';
      cell.onclick = () => spinWheel();
      grid.appendChild(cell);
      return;
    }
    if (pos.row === 1 && (pos.col === 1 || pos.col === 3)) {
      cell.className = 'cell empty';
      grid.appendChild(cell);
      return;
    }
    cell.dataset.idx = idx;
    cell.innerHTML = `<span class="placeholder"><i class="ph ph-question"></i></span>`;
    if (idx === 0) {
      cell.classList.add('jackpot');
      cell.title = 'Lucky Gate · 10%';
    }
    grid.appendChild(cell);
  });
}

let wheelItems = [];
let wheelPhase = 'idle';
let removedCount = 0;
let highlightInterval = null;

function prepareWheel() {
  if (data.rewards.length < 11) {
    alert('Cần ít nhất 11 phần thưởng trong kho.');
    return;
  }
  if (data.drawTickets < 1) {
    alert('Bạn cần 1 vé quay. Học 1 giờ để nhận vé.');
    return;
  }
  data.drawTickets -= 1;
  saveData();
  updateDashboard();

  wheelPhase = 'selecting';
  document.getElementById('wheelStatus').textContent = 'Đang chọn phần thưởng...';
  document.getElementById('confirmRevealBtn').disabled = true;

  const shuffled = [...data.rewards].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 11);
  wheelItems = ['Lucky Gate', ...picked.map(r => r.name)];

  const grid = document.getElementById('wheelGrid');
  const cells = grid.querySelectorAll('.cell:not(.spin-center):not(.empty)');
  cells.forEach((c, i) => {
    c.className = 'cell';
    if (i === 0) c.classList.add('jackpot');
    c.innerHTML = `<span class="placeholder"><i class="ph ph-question"></i></span>`;
    c.style.cursor = 'pointer';
    c.onclick = () => handleCellClick(i);
  });

  document.getElementById('wheelStatus').textContent = 'Chọn 2 phần thưởng để loại bỏ (Lucky Gate không thể xóa)';
  wheelPhase = 'remove';
  removedCount = 0;
  data.wheelRevealed = false;
  data.wheelResult = null;
  saveData();
  document.getElementById('confirmRevealBtn').disabled = true;
  const spinBtn = document.getElementById('spinCenterBtn');
  if (spinBtn) spinBtn.disabled = true;
}

function handleCellClick(idx) {
  if (wheelPhase !== 'remove') return;
  if (idx === 0) { alert('Lucky Gate không thể xóa.'); return; }
  const grid = document.getElementById('wheelGrid');
  const cells = grid.querySelectorAll('.cell:not(.spin-center):not(.empty)');
  const cell = cells[idx];
  if (cell.classList.contains('fade-out')) return;
  cell.classList.add('fade-out');
  removedCount++;
  if (removedCount >= 2) {
    wheelPhase = 'ready-reveal';
    document.getElementById('wheelStatus').textContent = 'Nhấn "Xác nhận" để lật các ô';
    document.getElementById('confirmRevealBtn').disabled = false;
  }
}

function confirmReveal() {
  if (wheelPhase !== 'ready-reveal') return;
  wheelPhase = 'revealing';
  document.getElementById('confirmRevealBtn').disabled = true;
  document.getElementById('wheelStatus').textContent = 'Đang lật...';
  const grid = document.getElementById('wheelGrid');
  const cells = grid.querySelectorAll('.cell:not(.spin-center):not(.empty)');
  let idx = 0;
  const interval = setInterval(() => {
    if (idx >= cells.length) {
      clearInterval(interval);
      wheelPhase = 'revealed';
      data.wheelRevealed = true;
      document.getElementById('wheelStatus').textContent = 'Sẵn sàng quay!';
      const spinBtn = document.getElementById('spinCenterBtn');
      if (spinBtn) spinBtn.disabled = false;
      return;
    }
    const cell = cells[idx];
    if (!cell.classList.contains('fade-out')) {
      cell.className = 'cell reveal';
      if (idx === 0) cell.classList.add('jackpot');
      const name = wheelItems[idx] || '?';
      const iconMap = getIconForReward(name);
      cell.innerHTML = `<i class="${iconMap}"></i><span class="cell-label">${name}</span>`;
      cell.style.transform = 'scale(0.8)';
      cell.style.opacity = '0';
      setTimeout(() => {
        cell.style.transform = 'scale(1)';
        cell.style.opacity = '1';
      }, 50);
    }
    idx++;
  }, 300);
}

function getIconForReward(name) {
  const lower = name.toLowerCase();
  if (lower.includes('coffee')) return 'ph ph-coffee';
  if (lower.includes('snack') || lower.includes('cake') || lower.includes('chocolate')) return 'ph ph-bowl-food';
  if (lower.includes('game')) return 'ph ph-game-controller';
  if (lower.includes('youtube')) return 'ph ph-youtube-logo';
  if (lower.includes('book') || lower.includes('read')) return 'ph ph-book';
  if (lower.includes('walk')) return 'ph ph-walking';
  if (lower.includes('movie') || lower.includes('episode')) return 'ph ph-film-slate';
  if (lower.includes('music') || lower.includes('piano')) return 'ph ph-music-notes';
  if (lower.includes('star')) return 'ph ph-star';
  if (lower.includes('stretch') || lower.includes('exercise')) return 'ph ph-dumbbell';
  if (lower.includes('chat') || lower.includes('letter')) return 'ph ph-chat';
  if (lower.includes('journal') || lower.includes('notebook') || lower.includes('pen')) return 'ph ph-notebook';
  if (lower.includes('plant')) return 'ph ph-plant';
  if (lower.includes('bath')) return 'ph ph-bathtub';
  if (lower.includes('tea')) return 'ph ph-tea-bag';
  if (lower.includes('photo')) return 'ph ph-camera';
  if (lower.includes('podcast')) return 'ph ph-microphone';
  if (lower.includes('puzzle')) return 'ph ph-puzzle-piece';
  if (lower.includes('doodle')) return 'ph ph-palette';
  if (lower.includes('magazine')) return 'ph ph-newspaper';
  if (lower.includes('sunlight')) return 'ph ph-sun';
  if (lower.includes('night')) return 'ph ph-moon';
  if (lower.includes('hydrate')) return 'ph ph-drop';
  if (lower.includes('socks')) return 'ph ph-sock';
  if (lower.includes('candle')) return 'ph ph-candle';
  if (lower.includes('comedy')) return 'ph ph-smiley';
  if (lower.includes('laundry') || lower.includes('clean')) return 'ph ph-broom';
  if (lower.includes('lucky gate')) return 'ph ph-gem';
  return 'ph ph-gift';
}

// ================================================================
// SPIN (highlight running)
// ================================================================
function spinWheel() {
  if (wheelPhase !== 'revealed' || data.wheelRevealed !== true) return;
  const grid = document.getElementById('wheelGrid');
  const cells = grid.querySelectorAll('.cell:not(.spin-center):not(.empty):not(.fade-out)');
  if (cells.length < 2) { alert('Không đủ phần thưởng.'); return; }

  const spinBtn = document.getElementById('spinCenterBtn');
  if (spinBtn) spinBtn.disabled = true;
  document.getElementById('wheelStatus').textContent = 'Đang quay...';
  wheelPhase = 'spinning';

  let currentIdx = 0;
  let speed = 50;
  let totalSteps = 0;
  const minRounds = 5;
  const stopIdx = Math.floor(Math.random() * cells.length);
  const extra = Math.floor(Math.random() * cells.length);
  const maxSteps = minRounds * cells.length + stopIdx + extra;

  function highlightStep() {
    cells.forEach(c => c.classList.remove('highlight'));
    const cell = cells[currentIdx % cells.length];
    cell.classList.add('highlight');
    totalSteps++;
    if (totalSteps >= maxSteps) {
      clearInterval(highlightInterval);
      wheelPhase = 'done';
      document.getElementById('wheelStatus').textContent = 'Hoàn tất!';
      if (spinBtn) spinBtn.disabled = false;
      const resultName = cell.querySelector('.cell-label')?.textContent || 'Reward';
      data.wheelResult = resultName;
      saveData();
      handleWheelResult(resultName);
      return;
    }
    if (totalSteps > minRounds * cells.length) {
      const progress = (totalSteps - minRounds * cells.length) / (maxSteps - minRounds * cells.length);
      speed = 50 + progress * 400;
    }
    currentIdx = (currentIdx + 1) % cells.length;
  }

  highlightInterval = setInterval(highlightStep, speed);
  highlightStep();
}

// ================================================================
// HANDLE WHEEL RESULT WITH BUFFS + RANDOM MODIFIER
// ================================================================
function handleWheelResult(resultName) {
  // Check for Lucky Gate (10% chance)
  if (resultName.includes('Lucky Gate')) {
    // Auto-enter Lucky Gate
    openLuckyGateModal();
    addHistory({ type: 'luckygate', text: '🍀 Trúng Lucky Gate! Vào vòng quay may mắn.' });
    saveData();
    updateDashboard();
    return;
  }

  // --- Special buff rewards ---
  let starsEarned = 0;
  let buffApplied = false;
  let toastTitle = '';
  let toastDesc = '';
  let randomEventMsg = '';

  // Helper to add stars with buffs and random modifier
  const addStars = (amount) => {
    let finalAmount = amount;
    // Apply buffs first
    if (data.doubleNextStar) {
      finalAmount *= 2;
      data.doubleNextStar = false;
      showToast('×2 Active', 'Nhân đôi sao!');
    }
    if (data.tripleNextStar) {
      finalAmount *= 3;
      data.tripleNextStar = false;
      showToast('×3 Active', 'Nhân ba sao!');
    }
    if (data.starRushCount > 0) {
      finalAmount += 1;
      data.starRushCount--;
      showToast('⭐ Star Rush', `+1 sao thưởng (còn ${data.starRushCount} lượt)`);
    }
    // Apply random modifier
    const modifier = applyRandomStarModifier(finalAmount);
    finalAmount = modifier.amount;
    randomEventMsg = modifier.message;
    if (randomEventMsg) {
      showToast('🎲 Sự kiện ngẫu nhiên', randomEventMsg);
    }
    // Finalize
    data.stars += finalAmount;
    data.lifetimeStars += finalAmount;
    data.streak += 1;
    addHistory({ type: 'reward', text: `⭐ +${finalAmount} sao từ "${resultName}"` });
    starsEarned = finalAmount;
    toastTitle = '⭐ Nhận sao';
    toastDesc = `+${finalAmount} sao từ ${resultName}`;
    if (randomEventMsg) toastDesc += ` (${randomEventMsg})`;
  };

  switch (resultName) {
    case 'Random Stars':
      const rand = Math.floor(Math.random() * 5) + 1;
      addStars(rand);
      break;
    case 'Double Next Star':
      data.doubleNextStar = true;
      buffApplied = true;
      toastTitle = '✨ Buff kích hoạt';
      toastDesc = '×2 Sao tiếp theo';
      addHistory({ type: 'buff', text: '×2 Sao tiếp theo được kích hoạt' });
      break;
    case 'Triple Next Star':
      data.tripleNextStar = true;
      buffApplied = true;
      toastTitle = '✨ Buff kích hoạt';
      toastDesc = '×3 Sao tiếp theo';
      addHistory({ type: 'buff', text: '×3 Sao tiếp theo được kích hoạt' });
      break;
    case 'Star Chest':
      const chestOptions = [2,3,5,8];
      const chestStars = chestOptions[Math.floor(Math.random() * chestOptions.length)];
      addStars(chestStars);
      toastTitle = '📦 Rương sao';
      toastDesc = `+${chestStars} sao!`;
      break;
    case 'Star Rush':
      data.starRushCount = 3;
      buffApplied = true;
      toastTitle = '⚡ Star Rush';
      toastDesc = '3 lượt tiếp theo mỗi lần +1 sao';
      addHistory({ type: 'buff', text: 'Star Rush kích hoạt (3 lượt)' });
      break;
    case 'Lucky Day':
      data.luckyDay = true;
      buffApplied = true;
      toastTitle = '🍀 Ngày may mắn';
      toastDesc = 'Tăng cơ hội sao lớn ở lượt tiếp theo';
      addHistory({ type: 'buff', text: 'Lucky Day kích hoạt' });
      break;
    case 'Bonus Draw':
      data.drawTickets += 1;
      toastTitle = '🎫 Vé quay thưởng';
      toastDesc = '+1 Vé quay';
      addHistory({ type: 'reward', text: '🎫 +1 Vé quay' });
      break;
    case 'Jackpot Stars':
      const jackpot = Math.floor(Math.random() * 11) + 10;
      addStars(jackpot);
      toastTitle = '💎 Jackpot sao';
      toastDesc = `+${jackpot} sao!`;
      break;
    default:
      // Normal star rewards
      let starMatch = resultName.match(/\+\s*(\d+)\s*Star/);
      if (starMatch) {
        const base = parseInt(starMatch[1]);
        addStars(base);
      } else {
        // Non-star reward
        data.streak += 1;
        addHistory({ type: 'reward', text: `🎁 Phần thưởng: ${resultName}` });
        toastTitle = '🎁 Phần thưởng';
        toastDesc = resultName;
      }
  }

  if (!buffApplied && starsEarned === 0 && !resultName.includes('Lucky Gate')) {
    // handled above
  } else if (starsEarned > 0) {
    showToast(toastTitle, toastDesc);
  } else if (buffApplied) {
    showToast(toastTitle, toastDesc);
  }

  // Clear Lucky Day after one spin
  if (data.luckyDay) {
    data.luckyDay = false;
  }

  data.lifetimeRewards += 1;
  saveData();
  updateDashboard();
  setTimeout(() => {
    document.querySelectorAll('.cell.highlight').forEach(c => c.classList.remove('highlight'));
  }, 1500);
}

// ================================================================
// LUCKY GATE MODAL (auto-open, new outcomes, 3 spins max)
// ================================================================
let luckyModalOpen = false;
let luckySpinsUsed = 0;
const LUCKY_OUTCOMES = ['+45', '+10', '+5', '+1', '0', '-2', '-6', '-12', '-20', '-30'];

function openLuckyGateModal() {
  if (luckyModalOpen) return;
  luckyModalOpen = true;
  luckySpinsUsed = 0;

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.id = 'luckyPopup';
  overlay.innerHTML = `
    <div class="popup-box">
      <h3>🍀 Lucky Gate</h3>
      <p style="color:#6b6b67; margin-bottom:8px;">Mỗi lượt tốn 2 sao (có thể âm). Tối đa 3 lượt.</p>
      <p id="luckySpinInfo" style="font-size:0.9rem; margin-bottom:12px;">Lượt còn lại: 3</p>
      <div class="lucky-wheel-container">
        <div class="lucky-grid" id="luckyGrid">
          ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => `<div class="lucky-cell" data-idx="${i}">?</div>`).join('')}
          <div class="lucky-center" id="luckySpinBtn">
            <i class="ph ph-arrow-clockwise"></i> QUAY
          </div>
        </div>
      </div>
      <div style="text-align:center; margin-top:12px;">
        <button class="btn" id="closeLuckyBtn">Đóng</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Setup cells: first 10 cells get outcomes, last 2 are empty
  const cells = overlay.querySelectorAll('.lucky-cell');
  cells.forEach((c, i) => {
    if (i < 10) {
      c.textContent = LUCKY_OUTCOMES[i];
    } else {
      c.className = 'lucky-cell empty-cell';
      c.textContent = '';
    }
  });

  let spinning = false;
  let luckyInterval = null;

  function updateSpinInfo() {
    const remaining = 3 - luckySpinsUsed;
    document.getElementById('luckySpinInfo').textContent = `Lượt còn lại: ${remaining}`;
    if (remaining <= 0) {
      document.getElementById('luckySpinBtn').disabled = true;
    }
  }

  document.getElementById('luckySpinBtn').onclick = function() {
    if (spinning) return;
    if (luckySpinsUsed >= 3) {
      alert('Bạn đã dùng hết 3 lượt.');
      return;
    }
    // Allow negative stars, so no check
    spinning = true;
    this.disabled = true;
    data.stars -= 2; // may go negative
    luckySpinsUsed++;
    saveData();
    updateDashboard();

    const luckyCells = overlay.querySelectorAll('.lucky-cell:not(.empty-cell)');
    let idx = 0;
    let steps = 0;
    const totalSteps = 5 * luckyCells.length + Math.floor(Math.random() * luckyCells.length);
    let speed = 60;

    function spinStep() {
      luckyCells.forEach(c => c.classList.remove('highlight'));
      const cell = luckyCells[idx % luckyCells.length];
      cell.classList.add('highlight');
      steps++;
      if (steps >= totalSteps) {
        clearInterval(luckyInterval);
        const resultText = luckyCells[idx % luckyCells.length].textContent;
        const value = parseInt(resultText);
        data.stars += value;
        if (value > 0) data.lifetimeStars += value;
        addHistory({ type: 'luckygate', text: `🍀 Lucky Gate: ${resultText} sao` });
        saveData();
        updateDashboard();
        showToast('🍀 Lucky Gate', `Kết quả: ${resultText} sao`);
        spinning = false;
        document.getElementById('luckySpinBtn').disabled = false;
        updateSpinInfo();
        // Check if still have spins left
        if (luckySpinsUsed >= 3) {
          document.getElementById('luckySpinBtn').disabled = true;
          showToast('⏹️ Hết lượt', 'Bạn đã dùng hết 3 lượt quay.');
          setTimeout(() => {
            // close modal after a moment
            if (overlay) overlay.remove();
            luckyModalOpen = false;
          }, 1500);
        }
        setTimeout(() => luckyCells.forEach(c => c.classList.remove('highlight')), 1000);
        return;
      }
      if (steps > 5 * luckyCells.length) {
        const progress = (steps - 5 * luckyCells.length) / (totalSteps - 5 * luckyCells.length);
        speed = 60 + progress * 400;
      }
      idx = (idx + 1) % luckyCells.length;
    }

    luckyInterval = setInterval(spinStep, speed);
    spinStep();
    updateSpinInfo();
  };

  document.getElementById('closeLuckyBtn').onclick = () => {
    if (luckyInterval) clearInterval(luckyInterval);
    overlay.remove();
    luckyModalOpen = false;
    // Reset spin count if closed early
    luckySpinsUsed = 0;
  };

  updateSpinInfo();
}

// ================================================================
// SHOP BUY
// ================================================================
function buyShopItem(id) {
  const item = data.shopItems.find(i => i.id === id);
  if (!item) return;
  if (data.stars < item.cost) { alert('Không đủ sao!'); return; }
  data.stars -= item.cost;
  item.lastRedeemed = new Date().toLocaleString('vi-VN');
  addHistory({ type: 'shop', text: `🛒 Mua "${item.name}" (${item.cost}⭐)` });
  addPurchaseHistory(item.name, item.cost);
  saveData();
  updateDashboard();
  renderShop();
  showToast('✓ Mua thành công', `${item.name} — -${item.cost} sao`);
}

// ================================================================
// TIMER - COUNT UP & POMODORO (no anti-cheat, real elapsed)
// ================================================================
let timerInterval = null;
let pomodoroInterval = null;

function startTimer() {
  const mode = document.querySelector('input[name="timerMode"]:checked').value;
  if (mode === 'countup') {
    startCountUp();
  } else {
    startPomodoro();
  }
}

function syncCountUpTimer() {
  if (!data.timerRunning || !data.sessionStart) return false;
  const now = Date.now();
  const deltaSeconds = Math.floor((now - data.sessionStart) / 1000);
  if (deltaSeconds <= 0) return false;
  const syncedUntil = data.sessionStart + deltaSeconds * 1000;
  addStudyTimeRange(data.sessionStart, syncedUntil);
  data.timerSeconds += deltaSeconds;
  data.elapsedSeconds = data.timerSeconds;
  data.sessionStart = syncedUntil;
  saveData();
  return true;
}

function ensureCountUpInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    syncCountUpTimer();
    updateDashboard();
  }, 1000);
}

function startCountUp() {
  if (data.timerRunning) return;
  data.timerRunning = true;
  data.timerPaused = false;
  data.sessionStart = Date.now();
  data.timerMode = 'countup';
  saveData();
  ensureCountUpInterval();
  updateDashboard();
}

function syncPomodoroTimer() {
  if (!data.pomodoroActive) return false;
  if (!data.pomodoroLastTick) {
    data.pomodoroLastTick = Date.now();
    saveData();
    return false;
  }

  const now = Date.now();
  let deltaSeconds = Math.floor((now - data.pomodoroLastTick) / 1000);
  if (deltaSeconds <= 0) return false;

  let cursor = data.pomodoroLastTick;
  let completedStudySessions = 0;
  let completedBreaks = 0;

  while (deltaSeconds > 0) {
    const step = Math.min(deltaSeconds, data.pomodoroRemaining);
    if (data.pomodoroPhase === 'study') {
      addStudyTimeRange(cursor, cursor + step * 1000);
    }
    data.pomodoroRemaining -= step;
    cursor += step * 1000;
    deltaSeconds -= step;

    if (data.pomodoroRemaining <= 0) {
      if (data.pomodoroPhase === 'study') {
        data.pomodoroPhase = 'break';
        data.pomodoroRemaining = data.pomodoroBreak * 60;
        completedStudySessions += 1;
        addHistory({ type: 'pomodoro', text: '✅ Hoàn thành phiên học' });
      } else {
        data.pomodoroPhase = 'study';
        data.pomodoroRemaining = data.pomodoroStudy * 60;
        completedBreaks += 1;
        addHistory({ type: 'pomodoro', text: '✅ Hoàn thành giải lao' });
      }
    }
  }

  if (completedStudySessions === 1) showToast('🍅 Nghỉ giải lao', 'Hoàn thành phiên học!');
  else if (completedStudySessions > 1) showToast('🍅 Pomodoro', `Đã hoàn thành ${completedStudySessions} phiên học.`);
  if (completedBreaks === 1) showToast('📚 Học tiếp', 'Kết thúc giải lao, quay lại học!');
  else if (completedBreaks > 1) showToast('📚 Pomodoro', `Đã kết thúc ${completedBreaks} lần nghỉ.`);

  data.pomodoroLastTick = cursor;
  saveData();
  return true;
}

function ensurePomodoroInterval() {
  if (pomodoroInterval) clearInterval(pomodoroInterval);
  pomodoroInterval = setInterval(() => {
    syncPomodoroTimer();
    updateDashboard();
  }, 1000);
}

function startPomodoro() {
  if (data.pomodoroActive) return;
  data.pomodoroActive = true;
  data.timerMode = 'pomodoro';
  if (!data.pomodoroRemaining || data.pomodoroRemaining <= 0) {
    data.pomodoroPhase = 'study';
    data.pomodoroRemaining = data.pomodoroStudy * 60;
  }
  data.pomodoroLastTick = Date.now();
  saveData();
  updateDashboard();
  ensurePomodoroInterval();
}

function pauseTimer() {
  const mode = document.querySelector('input[name="timerMode"]:checked').value;
  if (mode === 'countup') {
    if (data.timerRunning) {
      syncCountUpTimer();
      data.timerRunning = false;
      data.timerPaused = true;
      data.sessionStart = null;
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      saveData();
      updateDashboard();
    }
  } else {
    if (data.pomodoroActive) {
      syncPomodoroTimer();
      data.pomodoroActive = false;
      data.pomodoroLastTick = null;
      if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null; }
      saveData();
      updateDashboard();
    }
  }
}

function resetTimer() {
  const mode = document.querySelector('input[name="timerMode"]:checked').value;
  if (mode === 'countup') {
    pauseTimer();
    data.timerSeconds = 0;
    data.elapsedSeconds = 0;
    data.sessionStart = null;
    data.timerRunning = false;
    data.timerPaused = false;
    saveData();
    updateDashboard();
  } else {
    pauseTimer();
    data.pomodoroActive = false;
    data.pomodoroPhase = 'study';
    data.pomodoroRemaining = data.pomodoroStudy * 60;
    data.pomodoroLastTick = null;
    saveData();
    updateDashboard();
  }
}

// ================================================================
// TIMER MODE SWITCH
// ================================================================
document.querySelectorAll('input[name="timerMode"]').forEach(radio => {
  radio.addEventListener('change', function() {
    const mode = this.value;
    data.timerMode = mode;
    if (mode === 'pomodoro') {
      document.getElementById('pomodoroSettings').style.display = 'flex';
      pauseTimer();
      if (!data.pomodoroRemaining) data.pomodoroRemaining = data.pomodoroStudy * 60;
      updateDashboard();
    } else {
      document.getElementById('pomodoroSettings').style.display = 'none';
      pauseTimer();
      updateDashboard();
    }
    saveData();
  });
});

// ================================================================
// SETTINGS
// ================================================================
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'reward_hub_backup.json';
  a.click();
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (typeof imported === 'object' && imported !== null) {
        data = imported;
        saveData();
        refreshAll();
        alert('Import thành công!');
      }
    } catch (err) { alert('File không hợp lệ'); }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('Xóa toàn bộ dữ liệu?')) return;
  data = getDefaultData();
  saveData();
  refreshAll();
}

// ================================================================
// REFRESH ALL
// ================================================================
function refreshAll() {
  updateDashboard();
  renderShop();
  renderHistory();
  renderRewardPool();
  buildWheelGrid();
  wheelPhase = 'idle';
  removedCount = 0;
  wheelItems = [];
  data.wheelRevealed = false;
  data.wheelResult = null;
  document.getElementById('wheelStatus').textContent = 'Sẵn sàng';
  document.getElementById('confirmRevealBtn').disabled = true;
  const spinBtn = document.getElementById('spinCenterBtn');
  if (spinBtn) spinBtn.disabled = true;
  if (highlightInterval) { clearInterval(highlightInterval); highlightInterval = null; }
  if (data.timerMode === 'pomodoro' && !data.pomodoroRemaining) {
    data.pomodoroRemaining = data.pomodoroStudy * 60;
    data.pomodoroPhase = 'study';
  }
  // Nếu chưa có lastStudyDate, set về null
  if (!data.lastStudyDate) {
    data.lastStudyDate = null;
  }
  ensureTodayStudyData();
  saveData();
}

// ================================================================
// NAVIGATION
// ================================================================
document.querySelectorAll('.sidebar-item').forEach(el => {
  el.addEventListener('click', function() {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
    const page = this.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
  });
});

// ================================================================
// DOM READY
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
  const activeModeInput = document.querySelector(`input[name="timerMode"][value="${data.timerMode || 'countup'}"]`);
  if (activeModeInput) activeModeInput.checked = true;
  document.getElementById('pomodoroSettings').style.display = (data.timerMode === 'pomodoro') ? 'flex' : 'none';
  document.getElementById('pomodoroStudy').value = data.pomodoroStudy;
  document.getElementById('pomodoroBreak').value = data.pomodoroBreak;

  updateMotivation();
  refreshAll();

  if (data.timerRunning) {
    if (!data.sessionStart) data.sessionStart = Date.now();
    syncCountUpTimer();
    ensureCountUpInterval();
  }
  if (data.pomodoroActive) {
    if (!data.pomodoroLastTick) data.pomodoroLastTick = Date.now();
    syncPomodoroTimer();
    ensurePomodoroInterval();
  }
  updateDashboard();

  // Timer controls
  document.getElementById('timerToggleBtn').onclick = () => {
    const mode = document.querySelector('input[name="timerMode"]:checked').value;
    if (mode === 'countup') {
      if (data.timerRunning) pauseTimer();
      else startTimer();
    } else {
      if (data.pomodoroActive) pauseTimer();
      else startTimer();
    }
  };
  document.getElementById('timerResetBtn').onclick = resetTimer;
  document.getElementById('refreshQuoteBtn').onclick = updateMotivation;

  // Pomodoro apply
  document.getElementById('applyPomodoroBtn').onclick = function() {
    const study = parseInt(document.getElementById('pomodoroStudy').value) || 25;
    const bre = parseInt(document.getElementById('pomodoroBreak').value) || 5;
    data.pomodoroStudy = study;
    data.pomodoroBreak = bre;
    if (document.querySelector('input[name="timerMode"]:checked').value === 'pomodoro') {
      data.pomodoroRemaining = study * 60;
      data.pomodoroPhase = 'study';
      data.pomodoroLastTick = data.pomodoroActive ? Date.now() : null;
    }
    saveData();
    updateDashboard();
    document.getElementById('pomodoroConfig').textContent = `${study} / ${bre} phút`;
    showToast('⚙️ Đã cập nhật', `Pomodoro: ${study}/${bre} phút`);
  };

  // Vault toggle
  document.getElementById('vaultToggle').onclick = function() {
    const content = document.getElementById('vaultContent');
    content.classList.toggle('open');
    this.classList.toggle('open');
  };

  // Info button
  document.getElementById('vaultInfoBtn').onclick = function() {
    document.getElementById('infoModal').style.display = 'flex';
  };
  document.getElementById('closeInfoBtn').onclick = function() {
    document.getElementById('infoModal').style.display = 'none';
  };
  document.getElementById('infoModal').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
  });

  // Add reward
  document.getElementById('addRewardBtn').onclick = function() {
    const name = document.getElementById('newRewardName').value.trim();
    if (!name) return;
    data.rewards.push({ id: genId(), name });
    saveData();
    renderRewardPool();
    updateDashboard();
    document.getElementById('newRewardName').value = '';
  };

  // Wheel buttons
  document.getElementById('prepareWheelBtn').onclick = prepareWheel;
  document.getElementById('confirmRevealBtn').onclick = confirmReveal;
  document.getElementById('resetWheelBtn').onclick = function() {
    if (highlightInterval) { clearInterval(highlightInterval); highlightInterval = null; }
    refreshAll();
    buildWheelGrid();
    wheelPhase = 'idle';
    removedCount = 0;
    document.getElementById('wheelStatus').textContent = 'Sẵn sàng';
    document.getElementById('confirmRevealBtn').disabled = true;
    const spinBtn = document.getElementById('spinCenterBtn');
    if (spinBtn) spinBtn.disabled = true;
  };

  // Shop
  document.getElementById('addShopItemBtn').onclick = function() {
    const name = document.getElementById('shopItemName').value.trim();
    const cost = parseInt(document.getElementById('shopItemCost').value);
    if (!name || isNaN(cost) || cost < 0) { alert('Nhập tên và giá hợp lệ'); return; }
    data.shopItems.push({ id: genId(), name, cost, lastRedeemed: null });
    saveData();
    renderShop();
    document.getElementById('shopItemName').value = '';
    document.getElementById('shopItemCost').value = '';
  };

  // Settings
  document.getElementById('exportBtn').onclick = exportData;
  document.getElementById('importBtn').onclick = () => document.getElementById('importFileInput').click();
  document.getElementById('importFileInput').onchange = function(e) {
    if (this.files.length) importData(this.files[0]);
    this.value = '';
  };
  document.getElementById('resetBtn').onclick = resetData;

  buildWheelGrid();
});
window.addEventListener('beforeunload', () => {
  if (data.timerRunning) syncCountUpTimer();
  if (data.pomodoroActive) syncPomodoroTimer();
  saveData();
});

// ================================================================
// SERVICE WORKER REGISTRATION
// ================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}
