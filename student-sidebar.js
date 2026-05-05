/**
 * student-sidebar.js
 * Sağ taraftaki Takvim, Notlar ve Liderlik tablosu mantığını ortaklaştırır.
 */

const officialHolidays = {
  '01-01': 'Yılbaşı',
  '04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
  '05-01': 'Emek ve Dayanışma Günü',
  '05-19': "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
  '07-15': 'Demokrasi ve Millî Birlik Günü',
  '08-30': 'Zafer Bayramı',
  '10-29': 'Cumhuriyet Bayramı',
  '03-21': 'Nevruz',
};

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let assignmentsCache = [];

async function initRightSidebar(user) {
  if (!user) return;
  
  // Eğer container'lar yoksa oluşturma (HTML'de olmalı)
  renderCalendar();
  loadLeaderboard(user);
  loadGrades(user);
}

// ─── TAKVİM ───────────────────────────────────────────────────────
function renderCalendar() {
  const calHeader = document.getElementById('cal-header');
  const calGrid = document.getElementById('calGrid');
  if (!calHeader || !calGrid) return;

  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  calHeader.textContent = `${months[calMonth]} ${calYear}`;

  const today = new Date();
  const firstDay = new Date(calYear, calMonth, 1);
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  startDow--;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();

  const taskDates = {};
  if (window.assignmentsCache) {
    window.assignmentsCache.forEach(a => {
      if (a.due_date) taskDates[a.due_date] = (taskDates[a.due_date] || []).concat(a.title);
    });
  }

  let html = `<table class="cal-table"><thead><tr>`;
  ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'].forEach(d => html += `<th>${d}</th>`);
  html += '</tr></thead><tbody><tr>';

  let col = 0;
  for (let i = startDow - 1; i >= 0; i--) {
    html += `<td><span class="cal-day other-month">${daysInPrev - i}</span></td>`; col++;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    if (col === 7) { html += '</tr><tr>'; col = 0; }
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const mmdd = `${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === d;
    const holiday = officialHolidays[mmdd];
    const tasks = taskDates[dateStr] || [];
    const classes = ['cal-day'];
    if (isToday) classes.push('today');
    else if (holiday) classes.push('has-holiday');
    else if (tasks.length) classes.push('has-task');
    const tooltip = holiday ? holiday : tasks.length ? tasks.join(', ') : '';
    html += `<td><span class="${classes.join(' ')}">${d}${tooltip ? `<div class="cal-tooltip">${tooltip}</div>` : ''}</span></td>`;
    col++;
  }
  let next = 1;
  while (col < 7 && col > 0) { html += `<td><span class="cal-day other-month">${next++}</span></td>`; col++; }
  html += '</tr></tbody></table>';
  calGrid.innerHTML = html;
}

function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }
function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }

// ─── LİDERLİK TABLOSU ───────────────────────────────────────────
async function loadLeaderboard(currentUser) {
  const el = document.getElementById('leaderboardList');
  if (!el) return;
  try {
    const r = await ebaFetch('/api/leaderboard');
    if (!r) return;
    const d = await r.json();
    if(d.success && d.leaderboard && d.leaderboard.length) {
      el.innerHTML = d.leaderboard.map((u, i) => {
        if (!u || !u.name) return '';
        let medal = '';
        if(i === 0) medal = '<i class="fa fa-medal" style="color:#f1c40f;"></i>';
        else if(i === 1) medal = '<i class="fa fa-medal" style="color:#bdc3c7;"></i>';
        else if(i === 2) medal = '<i class="fa fa-medal" style="color:#cd7f32;"></i>';
        else medal = `<span style="color:#aaa; font-size:11px; width:14px; display:inline-block; text-align:center;">${i+1}</span>`;
        
        const isMe = currentUser && currentUser.name === u.name;
        const bg = isMe ? 'background:#f0f8ff; border-radius:6px; padding:2px 4px;' : 'padding:2px 4px;';
        const fw = isMe ? 'font-weight:bold; color:#1C98C3;' : 'color:#555;';
        
        const points = u.points || 0;
        const displayName = u.name.split(' ')[0] + (u.name.split(' ').length > 1 ? ' ' + u.name.split(' ').slice(1).map(n=>n[0]+'.').join('') : '');
        
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; ${bg}">
            <div style="display:flex; gap:8px; align-items:center;">
              ${medal}
              <span style="${fw} font-size:12px;">${displayName}</span>
            </div>
            <div style="font-weight:bold; color:#f39200; font-size:11px;">${points}</div>
          </div>
        `;
      }).join('');
    } else {
      el.innerHTML = '<div style="text-align:center;color:#aaa;font-size:11px;">Veri yok veya sunucu hatası.</div>';
    }
  } catch(e) { 
    el.innerHTML = `<div style="text-align:center;color:#e74c3c;font-size:11px;">Hata: ${e.message}</div>`;
  }
}

// ─── ALDIĞIM NOTLAR ───────────────────────────────────────────
async function loadGrades(user) {
  const gList = document.getElementById('studentGradesList');
  if (!gList) return;
  try {
    const r = await ebaFetch(`/api/student-grades?student_tc=${user.tc}`);
    if (!r) return;
    const d = await r.json();
    if (d.success && d.grades) {
      if (!d.grades.length) {
        gList.innerHTML = '<div style="text-align:center;color:#ccc;font-size:12px;padding:10px;">Henüz not bulunamadı</div>';
        return;
      }
      gList.innerHTML = d.grades.map(g => `
        <div style="padding:8px 0; border-bottom:1px solid #f5f5f5;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div style="font-size:12px; font-weight:600; color:#284B63;">${g.title}</div>
            <span style="font-size:13px; font-weight:bold; color:#f39200;">${g.score}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:2px;">
            <span style="font-size:10px; color:#888;">${g.type} · ${g.teacher || ''}</span>
            <span style="font-size:9px; color:#bbb;">${new Date(g.date).toLocaleDateString('tr-TR')}</span>
          </div>
        </div>
      `).join('');
    } else {
       gList.innerHTML = '<div style="text-align:center;color:#e74c3c;font-size:11px;">Veri çekilemedi.</div>';
    }
  } catch (e) { 
    gList.innerHTML = '<div style="text-align:center;color:#e74c3c;font-size:11px;">Bağlantı hatası.</div>';
  }
}
