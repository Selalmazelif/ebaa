
  <script src="auth-utils.js"></script>
  <script src="student-sidebar.js"></script>
  <script>
    let currentPostTab = 'ileti', currentUser, attachedFile = null;
    let assignmentsCache = [], notificationCache = [];

    async function initStudentPanel() {
      currentUser = requireAuth();
      if (!currentUser) return;

      const user = currentUser;
      initRightSidebar(user);
      if (user.role !== 'ogrenci') { logout(); return; }

      document.getElementById('profile-name').textContent = user.name;
      document.getElementById('profile-school').textContent = user.school;

      if (user.profilePic) {
        const sbIcon = document.getElementById('sb-av-icon');
        const sbImg = document.getElementById('sb-av-img');
        if (sbIcon) sbIcon.style.display = 'none';
        if (sbImg) {
          sbImg.src = user.profilePic;
          sbImg.style.display = 'block';
        }
      }

      document.getElementById('logoutBtn').addEventListener('click', logout);
      
      const urlParams = new URLSearchParams(window.location.search);
      const modalTarget = urlParams.get('modal');
      if (modalTarget === 'shop') setTimeout(openShopModal, 600);
      else if (modalTarget === 'avatar') setTimeout(openAvatarModal, 600);

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

      await loadGrades(user);
      await loadStats(user);
      await loadPendingTasks(user);
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
       certDiv.style.cssText = `
         width: 800px; height: 600px; background: linear-gradient(135deg, #1e2d3d, #4A748F);
         position: fixed; top: -9999px; left: -9999px; display: flex; flex-direction: column; align-items: center; justify-content: center;
         color: white; font-family: 'Arial', sans-serif; border: 20px solid #f39200; box-sizing: border-box; text-align: center;
       `;
       const name = currentUser.name || 'Öğrenci';
       const points = document.getElementById('user-points').innerText;
       
       certDiv.innerHTML = `
         <i class="fa-solid fa-award" style="font-size: 80px; color: #f39200; margin-bottom: 20px;"></i>
         <h1 style="font-size: 50px; margin: 0; text-transform: uppercase; letter-spacing: 4px; color: #f39200;">Üstün Başarı Belgesi</h1>
         <p style="font-size: 24px; margin: 20px 0; color: #e0e0e0;">Bu belge, platformumuzdaki üstün gayreti ve başarısı sonucunda</p>
         <h2 style="font-size: 60px; margin: 10px 0; color: white; border-bottom: 2px solid #f39200; padding-bottom: 10px;">${name}</h2>
         <p style="font-size: 24px; margin: 20px 0; color: #e0e0e0;">isimli öğrenciye <strong>${points} Puan</strong> barajını aştığı için verilmiştir.</p>
         <div style="margin-top: 40px; display: flex; justify-content: space-between; width: 80%; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
            <div><p style="margin:0; font-size:18px;">${new Date().toLocaleDateString('tr-TR')}</p><p style="margin:0; font-size:14px; opacity:0.7;">Tarih</p></div>
            <div><p style="margin:0; font-size:18px; font-weight:bold; color:#f39200;">EBA Dijital Sistem</p><p style="margin:0; font-size:14px; opacity:0.7;">Onay</p></div>
         </div>
       `;
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

    initStudentPanel();
  </script>

  <!-- Sınav Yanlışları Modalı -->
  <div id="examDetailModal"
    style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;">
    <div
      style="background:white; width:450px; max-width:90%; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
      <h3 style="margin-top:0; color:#284B63; border-bottom:1px solid #eee; padding-bottom:10px;">Sınav Detayı: <span
          id="examTitleSpan"></span></h3>
      <div style="display:flex; justify-content:space-around; margin-bottom:15px; text-align:center;">
        <div style="color:#2ecc71; font-weight:bold; font-size:18px;"><span id="exCor">0</span><br><span
            style="font-size:12px; font-weight:normal;">Doğru</span></div>
        <div style="color:#e74c3c; font-weight:bold; font-size:18px;"><span id="exWro">0</span><br><span
            style="font-size:12px; font-weight:normal;">Yanlış</span></div>
        <div style="color:#f39200; font-weight:bold; font-size:18px;"><span id="exBla">0</span><br><span
            style="font-size:12px; font-weight:normal;">Boş</span></div>
      </div>
      <div id="wrongQuestionsList" style="max-height:200px; overflow-y:auto; font-size:13px; color:#444;"></div>
      <div style="text-align:right; margin-top:20px;">
        <button onclick="document.getElementById('examDetailModal').style.display='none'"
          style="padding:8px 16px; background:#4A748F; color:white; border:none; border-radius:6px; cursor:pointer;">Kapat</button>
      </div>
    </div>
  </div>

  <!-- Çalışma Cevap Gönderme Modalı -->
  <div id="assignmentModal"
    style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;">
    <div
      style="background:white; width:450px; max-width:90%; border-radius:12px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
      <h3 style="margin-top:0; color:#284B63; border-bottom:1px solid #eee; padding-bottom:10px;">Çalışma Cevap Ekranı
      </h3>
      <p id="asmTitle" style="font-weight:bold; color:#444; margin-bottom:5px;"></p>
      <p id="asmDesc" style="font-size:12px; color:#888; margin-bottom:15px;"></p>
      <textarea id="asmAnswer" placeholder="Cevabınızı buraya yazın..."
        style="width:100%; height:120px; box-sizing:border-box; border:1px solid #ccc; border-radius:6px; padding:10px; font-family:inherit; resize:none;"></textarea>
      <div style="text-align:right; margin-top:15px;">
        <button onclick="document.getElementById('assignmentModal').style.display='none'"
          style="padding:8px 16px; background:#eee; color:#444; border:none; border-radius:6px; cursor:pointer; margin-right:8px;">İptal</button>
        <button onclick="submitAssignment()"
          style="padding:8px 16px; background:#2ecc71; color:white; border:none; border-radius:6px; cursor:pointer;">Gönder</button>
      </div>
    </div>
  </div>

  <!-- SHOP MODAL -->
  <div id="shopModal" class="modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:2000; align-items:center; justify-content:center;">
    <div style="background:white; width:90%; max-width:600px; border-radius:16px; padding:24px; max-height:80vh; overflow-y:auto; position:relative;">
      <h2 style="color:#284B63; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
        <span><i class="fa fa-store"></i> EBA Market</span>
        <i class="fa fa-times" style="cursor:pointer; font-size:20px; color:#ccc;" onclick="closeShopModal()"></i>
      </h2>
      <div id="shop-items-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:15px;"></div>
    </div>
  </div>

  <!-- AVATAR MODAL -->
  <div id="avatarModal" class="modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:2000; align-items:center; justify-content:center;">
    <div style="background:white; width:90%; max-width:500px; border-radius:16px; padding:24px; position:relative; text-align:center;">
      <h2 style="color:#284B63; margin-bottom:20px;">
        <span><i class="fa fa-user-ninja"></i> Avatarımı Özelleştir</span>
        <i class="fa fa-times" style="cursor:pointer; font-size:20px; color:#ccc; float:right;" onclick="closeAvatarModal()"></i>
      </h2>
      <div id="avatar-preview-container" style="width:150px; height:150px; margin:0 auto 20px; background:#f4f7fa; border-radius:50%; position:relative; overflow:hidden; border:4px solid #4A748F;">
        <i class="fa fa-user" style="font-size:80px; color:#ccc; margin-top:30px;"></i>
        <img id="avatar-preview-bg" style="position:absolute; inset:0; z-index:1; opacity:0.3; width:100%; height:100%; object-fit:cover;">
        <img id="avatar-preview-hat" style="position:absolute; top:10px; left:50%; transform:translateX(-50%); width:60px; z-index:3;">
        <img id="avatar-preview-glasses" style="position:absolute; top:55px; left:50%; transform:translateX(-50%); width:50px; z-index:4;">
        <img id="avatar-preview-pet" style="position:absolute; bottom:10px; right:10px; width:40px; z-index:5; display:none;">
      </div>
      <div id="inventory-list" style="display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-bottom:20px;"></div>
      <button onclick="saveAvatar()" style="background:#2ecc71; color:white; border:none; padding:10px 30px; border-radius:24px; font-weight:700; cursor:pointer;">Değişiklikleri Kaydet</button>
    </div>
  </div>

  <script>
    async function loadGamification(user) {
      try {
        const res = await fetch('/api/user/gamification-status', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const data = await res.json();
        if(data.success) {
          document.getElementById('user-points').textContent = data.points || 0;
          document.getElementById('user-coins').textContent = data.coins || 0;
          document.getElementById('user-streak').textContent = data.streak || 0;
          window.userInventory = data.avatar_items || [];
          window.selectedAvatar = data.selected_avatar || {};
          applyAvatar(window.selectedAvatar);
        }
      } catch(e) {}
    }

    function toggleDarkMode() {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

    async function openShopModal() {
      const res = await fetch('/api/shop/items');
      const data = await res.json();
      const grid = document.getElementById('shop-items-grid');
      grid.innerHTML = data.items.map(item => `
        <div style="background:#f8fafc; border:1px solid #eee; border-radius:12px; padding:12px; text-align:center;">
          <img src="${item.img}" style="width:50px; height:50px; margin-bottom:8px;">
          <div style="font-weight:700; font-size:13px; color:#284B63;">${item.name}</div>
          <div style="font-size:12px; color:#f39200; margin-bottom:8px;"><i class="fa fa-coins"></i> ${item.price}</div>
          <button onclick="buyItem('${item.id}', ${item.price})" style="background:${window.userInventory.includes(item.id)?'#ccc':'#5C8EAD'}; color:white; border:none; padding:5px 10px; border-radius:6px; font-size:11px; cursor:pointer;" ${window.userInventory.includes(item.id)?'disabled':''}>
            ${window.userInventory.includes(item.id)?'Sahipsin':'Satın Al'}
          </button>
        </div>
      `).join('');
      document.getElementById('shopModal').style.display = 'flex';
    }

    async function buyItem(id, price) {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ itemId: id, price })
      });
      const data = await res.json();
      if(data.success) {
        showToast(data.message, 'success');
        loadGamification(currentUser);
        closeShopModal();
      } else {
        showToast(data.message, 'error');
      }
    }

    function closeShopModal() { document.getElementById('shopModal').style.display = 'none'; }

    function openAvatarModal() {
      const list = document.getElementById('inventory-list');
      if(!window.userInventory || window.userInventory.length === 0) {
        list.innerHTML = '<p style="color:#aaa; font-size:12px;">Henüz hiç eşyan yok. Marketten alışveriş yapabilirsin!</p>';
      } else {
        fetch('/api/shop/items').then(r => r.json()).then(data => {
          const myItems = data.items.filter(it => window.userInventory.includes(it.id));
          list.innerHTML = myItems.map(it => `
            <div onclick="previewAvatarItem('${it.category}', '${it.img}')" style="width:50px; height:50px; border:2px solid #eee; border-radius:8px; cursor:pointer; padding:5px;">
              <img src="${it.img}" style="width:100%; height:100%; object-fit:contain;">
            </div>
          `).join('');
        });
      }
      document.getElementById('avatarModal').style.display = 'flex';
    }

    function previewAvatarItem(cat, img) {
      if(!window.tempAvatar) window.tempAvatar = {...window.selectedAvatar};
      window.tempAvatar[cat] = img;
      const previewImg = document.getElementById('avatar-preview-' + cat);
      if(previewImg) {
        previewImg.src = img;
        previewImg.style.display = 'block';
      }
    }

    async function saveAvatar() {
      const res = await fetch('/api/user/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ avatar: window.tempAvatar || window.selectedAvatar })
      });
      if((await res.json()).success) {
        showToast('Avatarın güncellendi!', 'success');
        window.selectedAvatar = {...(window.tempAvatar || window.selectedAvatar)};
        applyAvatar(window.selectedAvatar);
        closeAvatarModal();
      }
    }

    function applyAvatar(av) {
      if(!av) return;
      
      // Sidebar elements
      const sHat = document.getElementById('sidebar-hat');
      const sGlasses = document.getElementById('sidebar-glasses');
      const sPet = document.getElementById('sidebar-pet');
      const sBg = document.getElementById('sidebar-bg');
      
      if(av.hat) { sHat.src = av.hat; sHat.style.display = 'block'; }
      if(av.glasses) { sGlasses.src = av.glasses; sGlasses.style.display = 'block'; }
      if(av.pet) { sPet.src = av.pet; sPet.style.display = 'block'; }
      if(av.background) { sBg.style.background = `url(${av.background}) center/cover`; }
      
      // Preview elements (Modal)
      const pHat = document.getElementById('avatar-preview-hat');
      const pGlasses = document.getElementById('avatar-preview-glasses');
      const pBg = document.getElementById('avatar-preview-bg');
      
      if(pHat && av.hat) { pHat.src = av.hat; pHat.style.display = 'block'; }
      if(pGlasses && av.glasses) { pGlasses.src = av.glasses; pGlasses.style.display = 'block'; }
      if(pBg && av.background) { pBg.src = av.background; pBg.style.display = 'block'; }
    }

