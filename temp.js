
    // ─── TÜRK RESMİ TATİLLERİ ─────────────────────────────────────────
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

    let calYear = new Date().getFullYear(), calMonth = new Date().getMonth(), currentPostTab = 'ileti', currentUser, attachedFile = null;
    let assignmentsCache = [], notificationCache = [];

    async function initStudentPanel() {
      const user = requireAuth();
      if (!user) return;
      if (user.role !== 'ogrenci') { logout(); return; }
      currentUser = user;

      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('profile-school').textContent = user.school;

      if (user.profilePic) {
        document.getElementById('default-avatar-icon').style.display = 'none';
        document.getElementById('post-avatar-icon').style.display = 'none';
        let img = document.getElementById('profile-img-display');
        img.src = user.profilePic; img.style.display = 'block';
        img = document.getElementById('post-avatar');
        img.src = user.profilePic; img.style.display = 'block';
      }

      document.getElementById('logoutBtn').addEventListener('click', logout);

      document.getElementById('profilePicInput').addEventListener('change', function () {
        if (!this.files || !this.files[0]) return;
        const reader = new FileReader();
        reader.onload = async e => {
          try {
            await fetch('/api/update-profile', {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tc: user.tc, name: user.name, school: user.school, class: user.classNum || user.class || '', profilePic: e.target.result })
            });
          } catch (err) { }
          const cu = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '{}');
          cu.profilePic = e.target.result;
          sessionStorage.setItem('currentUser', JSON.stringify(cu));
          localStorage.setItem('currentUser', JSON.stringify(cu));
          location.reload();
        };
        reader.readAsDataURL(this.files[0]);
      });

      await loadStats(user);
      await loadPendingTasks(user);
      await loadGrades(user);
      await loadFeed(user);
      await loadNotifs();

      // YENİ ÖZELLİKLER
      await loadGamification(user);
      await renderPerformanceChart(user);
      await loadLeaderboard();

      // Günlük bonus bildirimi (localStorage'de dailyBonus varsa göster)
      const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (storedUser.dailyBonus) {
        setTimeout(() => {
          showToast('🎉 Günaydın! Günlük giriş puanı: +5 puan kazandınız!', 'success');
        }, 1500);
        storedUser.dailyBonus = false;
        localStorage.setItem('currentUser', JSON.stringify(storedUser));
      }

      const now = new Date();
      calYear = now.getFullYear();
      calMonth = now.getMonth();
      renderCalendar();
    }

    // ─── TOAST BİLDİRİMİ ──────────────────────────────────────────────
    function showToast(msg, type = 'info') {
      let toast = document.getElementById('toast-notif');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notif';
        toast.style.cssText = `
          position:fixed; bottom:24px; right:24px; z-index:9999;
          padding:14px 22px; border-radius:12px; font-size:14px; font-weight:600;
          color:white; box-shadow:0 4px 20px rgba(0,0,0,0.2);
          transition:all 0.4s; opacity:0; transform:translateY(20px);
          max-width:320px; line-height:1.4;
        `;
        document.body.appendChild(toast);
      }
      toast.style.background = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#4A748F';
      toast.textContent = msg;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
      }, 4000);
    }

    // ─── OYUNLAŞTIRMA VE ROZETLER ────────────────────────────────────
    async function loadGamification(user) {
      try {
        // Puanı direkt /api/my-points'ten çek (hafif endpoint)
        const rPts = await fetch(`/api/my-points?tc=${user.tc}`);
        const dPts = await rPts.json();
        const points = dPts.points || 0;
        const el = document.getElementById('user-points');
        if (el) {
          el.textContent = points;
          // Puan animasyonu
          el.style.transition = 'transform 0.3s, color 0.3s';
          el.style.transform = 'scale(1.2)';
          el.style.color = '#f39200';
          setTimeout(() => { el.style.transform = 'scale(1)'; el.style.color = ''; }, 500);
        }
        if (points >= 100) {
           const btnContainer = document.getElementById('cert-btn-container');
           if(btnContainer) btnContainer.style.display = 'block';
        }

        // Rozet verisini çek
        const rBadge = await ebaFetch(`/api/user-badges?tc=${user.tc}`);
        if (!rBadge) return;
        const dBadge = await rBadge.json();
        const container = document.getElementById('user-badges-container');
        if (dBadge.success && dBadge.badges.length) {
          container.innerHTML = dBadge.badges.map(b => `
        <div title="${b.name}: ${b.description}" style="width:28px; height:28px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,0.1); cursor:help;">
          <i class="fa ${b.icon}" style="color:#f39200; font-size:12px;"></i>
        </div>
      `).join('');
        } else {
          container.innerHTML = '<span style="font-size:10px; color:rgba(255,255,255,0.4);">Henüz rozet yok</span>';
        }
      } catch (e) { console.error("Oyunlaştırma hatası:", e); }
    }

    async function downloadCertificate() {
       const { jsPDF } = window.jspdf;
       const certDiv = document.createElement('div');
       certDiv.style.cssText = \`
         width: 800px; height: 600px; background: linear-gradient(135deg, #1e2d3d, #4A748F);
         position: fixed; top: -9999px; left: -9999px; display: flex; flex-direction: column; align-items: center; justify-content: center;
         color: white; font-family: 'Arial', sans-serif; border: 20px solid #f39200; box-sizing: border-box; text-align: center;
       \`;
       const name = currentUser.name || 'Öğrenci';
       const points = document.getElementById('user-points').innerText;
       
       certDiv.innerHTML = \`
         <i class="fa-solid fa-award" style="font-size: 80px; color: #f39200; margin-bottom: 20px;"></i>
         <h1 style="font-size: 50px; margin: 0; text-transform: uppercase; letter-spacing: 4px; color: #f39200;">Üstün Başarı Belgesi</h1>
         <p style="font-size: 24px; margin: 20px 0; color: #e0e0e0;">Bu belge, platformumuzdaki üstün gayreti ve başarısı sonucunda</p>
         <h2 style="font-size: 60px; margin: 10px 0; color: white; border-bottom: 2px solid #f39200; padding-bottom: 10px;">\${name}</h2>
         <p style="font-size: 24px; margin: 20px 0; color: #e0e0e0;">isimli öğrenciye <strong>\${points} Puan</strong> barajını aştığı için verilmiştir.</p>
         <div style="margin-top: 40px; display: flex; justify-content: space-between; width: 80%; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
            <div><p style="margin:0; font-size:18px;">\${new Date().toLocaleDateString('tr-TR')}</p><p style="margin:0; font-size:14px; opacity:0.7;">Tarih</p></div>
            <div><p style="margin:0; font-size:18px; font-weight:bold; color:#f39200;">EBA Dijital Sistem</p><p style="margin:0; font-size:14px; opacity:0.7;">Onay</p></div>
         </div>
       \`;
       document.body.appendChild(certDiv);
       
       showToast('Sertifikanız hazırlanıyor, lütfen bekleyin...', 'info');
       
       try {
         const canvas = await html2canvas(certDiv, { scale: 2 });
         const imgData = canvas.toDataURL('image/png');
         const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [800, 600] });
         pdf.addImage(imgData, 'PNG', 0, 0, 800, 600);
         pdf.save('Basari_Sertifikasi_' + name.replace(/\\s+/g, '_') + '.pdf');
         showToast('Sertifikanız başarıyla indirildi!', 'success');
       } catch(e) {
         showToast('Sertifika oluşturulurken bir hata oluştu.', 'error');
       }
       document.body.removeChild(certDiv);
    }

    // ─── PERFORMANS GRAFİĞİ (Chart.js) ───────────────────────────────
    async function renderPerformanceChart(user) {
      try {
        const r = await ebaFetch(`/api/analytics/student-performance?tc=${user.tc}`);
        const d = await r.json();
        const canvas = document.getElementById('performanceChart');
        if (!d.success || !d.performance?.length) {
          canvas.parentElement.innerHTML = '<div style="text-align:center; color:#ccc; font-size:12px; padding-top:30px;">Henüz performans verisi yok</div>';
          return;
        }

        const labels = d.performance.map(p => new Date(p.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
        const data = d.performance.map(p => p.value);

        new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Puan',
              data: data,
              borderColor: '#4FC3F7',
              backgroundColor: 'rgba(79, 195, 247, 0.1)',
              fill: true, tension: 0.4, borderWidth: 2, pointRadius: 3
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { beginAtZero: true, max: 100, ticks: { font: { size: 9 }, color: '#aaa' }, grid: { display: false } },
              x: { ticks: { font: { size: 9 }, color: '#aaa' }, grid: { display: false } }
            }
          }
        });
      } catch (e) { console.error("Grafik hatası:", e); }
    }

    // ─── LİDERLİK TABLOSU ───────────────────────────────────────────
    async function loadLeaderboard() {
      try {
        const r = await ebaFetch('/api/leaderboard');
        const d = await r.json();
        const el = document.getElementById('leaderboardList');
        if(d.success && d.leaderboard.length) {
          el.innerHTML = d.leaderboard.map((u, i) => {
            let medal = '';
            if(i === 0) medal = '<i class="fa fa-medal" style="color:#f1c40f;"></i>';
            else if(i === 1) medal = '<i class="fa fa-medal" style="color:#bdc3c7;"></i>';
            else if(i === 2) medal = '<i class="fa fa-medal" style="color:#cd7f32;"></i>';
            else medal = \`<span style="color:#aaa; font-size:11px; width:14px; display:inline-block; text-align:center;">\${i+1}</span>\`;
            
            const isMe = currentUser.name === u.name;
            const bg = isMe ? 'background:#f0f8ff; border-radius:6px; padding:2px 4px;' : 'padding:2px 4px;';
            const fw = isMe ? 'font-weight:bold; color:#1C98C3;' : 'color:#555;';
            
            return \`
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; \${bg}">
                <div style="display:flex; gap:8px; align-items:center;">
                  \${medal}
                  <span style="\${fw} font-size:12px;">\${u.name.split(' ')[0]} \${u.name.split(' ').slice(1).map(n=>n[0]+'.').join('')}</span>
                </div>
                <div style="font-weight:bold; color:#f39200; font-size:11px;">\${u.points}</div>
              </div>
            \`;
          }).join('');
        } else {
          el.innerHTML = '<div style="text-align:center;color:#aaa;font-size:11px;">Kimse yok</div>';
        }
      } catch(e) {}
    }

    // ─── İSTATİSTİKLER (MSSQL) ───────────────────────────────────────
    async function loadStats(user) {
      const r = await ebaFetch(`/api/student-stats?student_tc=${user.tc}`);
      const d = await r.json();
      if (d.success && d.stats) {
        const s = d.stats;
        document.getElementById('stat-content-count').textContent = s.content_count || 0;
        document.getElementById('stat-exam-count').textContent = s.exam_count || 0;
        document.getElementById('stat-social-count').textContent = s.social_count || 0;
        document.getElementById('stat-video-time').textContent = s.video_minutes || 0;

        if (s.week_start) {
          const resetDate = new Date(new Date(s.week_start).getTime() + 7 * 24 * 60 * 60 * 1000);
          document.getElementById('stats-week-info').textContent =
            `Haftalık sayaç sıfırlanma: ${resetDate.toLocaleDateString('tr-TR')}`;
        }
      }
    }

    // ─── BEKLEYEN ÇALIŞMALAR (MSSQL) ──────────────────────────────────
    async function loadPendingTasks(user) {
      const r = await ebaFetch(`/api/assignments?school=${encodeURIComponent(user.school)}&userClass=${encodeURIComponent(user.classNum || user.class || '')}&student_tc=${user.tc}`);
      if (!r) return;
      const d = await r.json();
      if (d.success) assignmentsCache = d.assignments;

      const el = document.getElementById('pending-tasks-list');
      if (!assignmentsCache.length) return;
      el.innerHTML = assignmentsCache.slice(0, 5).map(a => `
    <div class="pending-item" onclick="openAssignmentModal(${a.id})" style="cursor:pointer;">
      <div style="font-size:12px;color:#5C8EAD;font-weight:700;">${a.subject || 'Genel'} · ${a.assignment_type || 'Metin'}</div>
      <strong>${a.title}</strong>
      ${a.file_name ? `<div style="font-size:11px;color:#4A748F;margin-top:2px;"><i class="fa fa-paperclip"></i> ${a.file_name}</div>` : ''}
      ${a.due_date ? `<div style="font-size:10px;color:#e74c3c;margin-top:2px;"><i class="fa fa-clock"></i> Son: ${a.due_date}</div>` : ''}
    </div>
  `).join('');
    }

    let activeAssignmentId = null;
    function openAssignmentModal(id) {
      const a = assignmentsCache.find(x => x.id === id);
      if (!a) return;
      activeAssignmentId = id;
      document.getElementById('asmTitle').textContent = a.title;
      document.getElementById('asmDesc').textContent = a.description || '';
      document.getElementById('asmAnswer').value = '';
      document.getElementById('assignmentModal').style.display = 'flex';
    }

    async function submitAssignment() {
      const ans = document.getElementById('asmAnswer').value.trim();
      if (!ans) { alert('Cevap boş olamaz.'); return; }

      const btn = event?.target || document.querySelector('#assignmentModal button:last-child');
      if (btn) { btn.disabled = true; btn.textContent = 'Gönderiliyor...'; }

      const payload = {
        assignment_id: activeAssignmentId,
        student_tc: currentUser.tc,
        student_name: currentUser.name,
        answer_text: ans
      };

      try {
        const r = await ebaFetch('/api/assignment-submit', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (!r) { if (btn) { btn.disabled = false; btn.textContent = 'Gönder'; } return; }
        const d = await r.json();
        if (d.success) {
          showToast('✅ Cevabınız gönderildi! +20 puan kazandınız! 🎉', 'success');
          document.getElementById('assignmentModal').style.display = 'none';
          loadPendingTasks(currentUser);
          loadStats(currentUser);
          loadGamification(currentUser); // Puanı güncelle
        } else {
          alert('Hata: ' + d.message);
        }
      } catch (e) {
        alert('Bir hata oluştu.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Gönder'; }
      }
    }

    async function loadGrades(user) {
      try {
        const r = await ebaFetch(`/api/student-grades?student_tc=${user.tc}`);
        if (!r) return;
        const d = await r.json();
        if (d.success) {
          const gList = document.getElementById('studentGradesList');
          if (!d.grades.length) {
            gList.innerHTML = '<div style="text-align:center;color:#ccc;font-size:12px;padding:10px;">Henüz not bulunamadı</div>';
            return;
          }
          gList.innerHTML = d.grades.map(g => `
        <div style="padding:8px 0; border-bottom:1px solid #f5f5f5;">
          <div style="font-size:12px; font-weight:600; color:#284B63;">${g.title}</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; color:#888;">${g.type}</span>
            <span style="font-size:13px; font-weight:bold; color:#f39200;">${g.score}</span>
          </div>
        </div>
      `).join('');
        }
      } catch (e) { }
    }

    // ─── FEED (MSSQL) ─────────────────────────────────────────────────
    async function loadFeed(user) {
      const r = await ebaFetch(`/api/posts?school=${encodeURIComponent(user.school)}&group=all&userClass=${encodeURIComponent(user.classNum || user.class || '')}`);
      if (!r) return;
      const d = await r.json();
      const posts = d.success ? d.posts : [];

      const el = document.getElementById('feedContainer');
      if (!posts.length) {
        el.innerHTML = `<div style="background:white;border-radius:12px;padding:40px;text-align:center;color:#ccc;box-shadow:0 2px 10px rgba(0,0,0,0.05);border:1px dashed #eee;">
      <i class="fa-regular fa-comments" style="font-size:40px;margin-bottom:15px;display:block;"></i>
      <p style="margin:0;">Henüz burada paylaşılan ileti yok.</p></div>`;
        return;
      }

      el.innerHTML = posts.map(p => {
        const initials = (p.author_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const badgeClass = p.type === 'Tartışma' ? 'badge-tartisma' : p.type === 'Oylama' ? 'badge-oylama' : p.type === 'Etkinlik' ? 'badge-oylama' : 'badge-ileti';
        const timeAgo = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '';

        // Oylama seçenekleri string ise parse et
        const opts = p.poll_options ? (typeof p.poll_options === 'string' ? JSON.parse(p.poll_options) : p.poll_options) : [];

        let extraHtml = '';
        if (p.type === 'Etkinlik') {
          extraHtml = `
        <div class="feed-event-box">
          <div class="event-title">📅 ${p.event_title || 'Etkinlik'}</div>
          <div class="event-details">
            <div><strong>Başlangıç:</strong> ${p.event_start ? p.event_start.replace('T', ' ') : '-'}</div>
            <div><strong>Bitiş:</strong> ${p.event_end ? p.event_end.replace('T', ' ') : '-'}</div>
          </div>
        </div>
      `;
        }

        return `
      <div class="feed-item">
        <div class="feed-author">
          <div class="feed-avatar">${initials}</div>
          <div>
            <div class="feed-name">${p.author_name || 'Öğretmen'}</div>
            <div class="feed-time">${timeAgo}</div>
          </div>
        </div>
        <span class="feed-type-badge ${badgeClass}">${p.type || 'İleti'}</span>
        ${extraHtml}
        <div class="feed-content">${p.content || ''}</div>
        ${p.file_name ? `<div class="feed-file"><i class="fa fa-paperclip"></i> ${p.file_name}</div>` : ''}
        ${opts.length ? `<div style="margin-top:10px;">${opts.map(opt => `<div class="poll-option" onclick="votePoll(this)"><i class="fa fa-circle" style="color:#4A748F;"></i> ${opt}</div>`).join('')}</div>` : ''}
      </div>
    `;
      }).join('');
    }

    // ─── PAYLAŞIM ─────────────────────────────────────────────────────
    function switchPostTab(tab, btn) {
      currentPostTab = tab;
      document.querySelectorAll('.post-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    }

    function handleFileSelect(input) {
      const file = input.files[0];
      if (file) { attachedFile = file; document.getElementById('fileNameDisplay').textContent = file.name; }
    }

    function addPollOpt() {
      const count = document.querySelectorAll('.poll-opt').length + 1;
      const div = document.getElementById('poll-options-student');
      const inp = document.createElement('input');
      inp.className = 'poll-opt'; inp.placeholder = `Seçenek ${count}`;
      inp.style.cssText = 'width:100%;padding:8px;border:1.5px solid #DDE7EC;border-radius:8px;margin-bottom:6px;box-sizing:border-box;';
      div.appendChild(inp);
    }

    async function handleShare() {
      const textareaId = 'textarea-' + currentPostTab;
      const content = document.getElementById(textareaId)?.value?.trim();
      if (!content) { alert('Lütfen içerik girin.'); return; }

      const user = currentUser;
      let fileData = null, fileName = null;
      if (attachedFile) {
        fileName = attachedFile.name;
        fileData = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(attachedFile); });
      }

      const pollOpts = currentPostTab === 'oylama' ? [...document.querySelectorAll('.poll-opt')].map(i => i.value).filter(v => v) : [];
      const post = {
        author_tc: user.tc,
        author_name: user.name,
        type: currentPostTab === 'ileti' ? 'İleti' : currentPostTab === 'tartisma' ? 'Tartışma' : 'Oylama',
        content, 
        file_name: fileName, 
        file_data: fileData,
        target_group: user.classNum || user.class || 'all',
        school: user.school,
        poll_options: pollOpts,
      };

      const r = await ebaFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(post)
      });
      if (!r) return; // ebaFetch null döndürdü (401 vs)
      const d = await r.json();
      if (!d.success) { alert('Paylaşım hatası: ' + d.message); return; }

      document.getElementById(textareaId).value = '';
      attachedFile = null;
      document.getElementById('fileNameDisplay').textContent = '';
      document.getElementById('fileAttach').value = '';
      showToast('🎉 Paylaşım yapıldı! +10 puan kazandınız!', 'success');
      await loadFeed(user);
      await loadStats(user);
      await loadGamification(user); // Puanı güncelle
    }

    function votePoll(el) {
      el.style.background = '#4A748F'; el.style.color = 'white';
      el.style.borderColor = '#4A748F';
      document.querySelectorAll('.poll-option').forEach(o => { if (o !== el) { o.style.opacity = '0.6'; o.style.cursor = 'default'; } });
    }

    // ─── BİLDİRİMLER (MSSQL) ─────────────────────────────────────────
    function parseNotifText(originalText) {
      let txt = originalText;
      let btn = '';
      const match = txt.match(/===EXAM_DET:(.*?)===/);
      if(match) {
         const parts = match[1].split('|');
         const title = parts[0];
         const cor = parts[1];
         const wro = parts[2];
         const bla = parts[3];
         const json = parts[4] || '[]';
         const jsonEscaped = json.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
         btn = `<br><button onclick="showExamDetails('${title}','${cor}','${wro}','${bla}','${jsonEscaped}')" style="margin-top:5px;background:#4A748F;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Hatalı Soruları Gör</button>`;
         txt = txt.replace(match[0], '');
      }
      return txt + btn;
    }

    function showExamDetails(t,c,w,b,sJson) {
      document.getElementById('examTitleSpan').textContent=t;
      document.getElementById('exCor').textContent=c;
      document.getElementById('exWro').textContent=w;
      document.getElementById('exBla').textContent=b;
      const el = document.getElementById('wrongQuestionsList');
      if(!sJson || sJson==='[]' || sJson==='null') {
        el.innerHTML='<div style="text-align:center;color:#aaa;padding:10px;">Yanlış soru detayı yok.</div>';
      } else {
        try {
          const arr = JSON.parse(sJson);
          el.innerHTML = arr.map(q => `<div style="border:1px solid #ffcccc;background:#fff5f5;padding:10px;border-radius:6px;margin-top:10px;"><b>Soru:</b> ${q.q}<br><span style="color:#e74c3c">Cevabınız: ${q.ans||'Boş'}</span><br><span style="color:#2ecc71">Doğru: ${q.corr}</span></div>`).join('');
        } catch(e){ el.innerHTML='Hata: '+e.message; }
      }
      document.getElementById('examDetailModal').style.display='flex';
    }


    // ─── TAKVİM ───────────────────────────────────────────────────────
    function renderCalendar() {
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      document.getElementById('cal-header').textContent = `${months[calMonth]} ${calYear}`;

      const today = new Date();
      const firstDay = new Date(calYear, calMonth, 1);
      let startDow = firstDay.getDay();
      if (startDow === 0) startDow = 7;
      startDow--;

      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const daysInPrev = new Date(calYear, calMonth, 0).getDate();

      const taskDates = {};
      assignmentsCache.forEach(a => {
        if (a.due_date) taskDates[a.due_date] = (taskDates[a.due_date] || []).concat(a.title);
      });

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
      document.getElementById('calGrid').innerHTML = html;
    }

    function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }
    function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }

    initStudentPanel();
  