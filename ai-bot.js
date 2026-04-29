// ai-bot.js
(function() {
  // Sadece öğrenci yetkisi olanlarda veya aktif bir oturumda bot yüklensin.
  // Öğretmenlerde de görünsün ki onlar da deneyebilsin. (Kullanıcı panel ayarı vb eklenebilir)
  // Şimdilik sadece ogrenci panelinde aktifleşecek veya herkes için aktif bırakabiliriz.
  // "Öğrencilerin soruları" demişti ama öğretmen de "Sınavı nasıl değerlendiririm" sorabilir.
  // Öğretmen için de benzer mantık olabilir, ama spesifik "Öğrenci Asistanı" olarak kalsın:
  const cu = typeof currentUser !== 'undefined' ? currentUser : JSON.parse(localStorage.getItem('currentUser') || '{}');
  if(!cu || !cu.role) return;
  
  const botDiv = document.createElement('div');
  botDiv.id = 'ai-tutor-bot';
  botDiv.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 30px;
    z-index: 100000;
    font-family: inherit;
  `;
  
  botDiv.innerHTML = `
    <!-- Floating Button -->
    <div id="ai-bot-btn" style="
      width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #00C9FF, #92FE9D);
      color: #1e2d3d; display: flex; align-items: center; justify-content: center; font-size: 28px;
      box-shadow: 0 4px 15px rgba(0, 201, 255, 0.4); cursor: pointer; transition: transform 0.3s;
    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      <i class="fa-solid fa-robot"></i>
      <span style="position:absolute; top:-5px; right:-5px; background:#e74c3c; color:white; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:bold; display:flex; align-items:center; justify-content:center; display:none;" id="ai-bot-badge">1</span>
    </div>
    
    <!-- Chat Panel -->
    <div id="ai-bot-panel" style="
      display: none; position: absolute; bottom: 75px; right: 0; width: 340px; height: 480px;
      background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      flex-direction: column; overflow: hidden; border: 1px solid #e0e0e0;
    ">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #00C9FF, #92FE9D); padding: 16px; color: #1e2d3d; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; color:#1e2d3d;">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div>
            <div style="font-weight: 800; font-size: 16px;">EBA Asistan</div>
            <div style="font-size: 11px; opacity: 0.8; font-weight:600;">Yapay Zeka Destekli</div>
          </div>
        </div>
        <i class="fa-solid fa-xmark" id="ai-bot-close" style="cursor: pointer; font-size: 20px; opacity:0.7;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"></i>
      </div>
      
      <!-- Messages -->
      <div id="ai-bot-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: #f4f7fa; display: flex; flex-direction: column; gap: 14px; font-size: 13.5px; line-height:1.5;">
        <div style="align-self: flex-start; max-width: 85%; background: white; padding: 12px 16px; border-radius: 14px; border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); color: #333;">
          ${
            cu.role === 'ogretmen' 
              ? 'Merhaba Hocam! 👋 Size nasıl yardımcı olabilirim? Öğrencilerinizin durumunu veya sistemdeki araçları bana sorabilirsiniz.'
              : cu.role === 'veli'
                ? 'Merhaba! 👋 Öğrencinizin gelişimi ve sistem hakkında size nasıl yardımcı olabilirim?'
                : 'Merhaba! 👋 Ben EBA Yapay Zeka Asistanı. <br><br>Derslerinde sana yardımcı olmak için buradayım. Anlamadığın bir soruyu, ders konularını veya sınav hatalarını bana sorabilirsin!'
          }
        </div>
      </div>
      
      <!-- Input -->
      <div style="padding: 12px 16px; background: white; border-top: 1px solid #eee; display: flex; gap: 10px; align-items: center;">
        <input type="text" id="ai-bot-input" placeholder="Bir şeyler sor..." style="
          flex: 1; padding: 12px 16px; border: 1.5px solid #eaeaea; border-radius: 24px; font-size: 13.5px; outline: none; transition: border-color 0.2s; background:#f9f9f9;
        " onfocus="this.style.borderColor='#00C9FF'; this.style.background='white';" onblur="this.style.borderColor='#eaeaea'; this.style.background='#f9f9f9';">
        <button id="ai-bot-send" style="
          width: 42px; height: 42px; border-radius: 50%; background: #00C9FF; color: white; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; font-size: 16px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 10px rgba(0,201,255,0.3);
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(botDiv);

  const btn = document.getElementById('ai-bot-btn');
  const panel = document.getElementById('ai-bot-panel');
  const closeBtn = document.getElementById('ai-bot-close');
  const input = document.getElementById('ai-bot-input');
  const sendBtn = document.getElementById('ai-bot-send');
  const messages = document.getElementById('ai-bot-messages');
  
  let isOpen = false;

  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    panel.style.display = isOpen ? 'flex' : 'none';
    if(isOpen) {
       input.focus();
       document.getElementById('ai-bot-badge').style.display = 'none';
    }
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    panel.style.display = 'none';
  });
  
  function addMessage(text, isUser = false) {
    const msg = document.createElement('div');
    msg.style.cssText = isUser 
      ? `align-self: flex-end; max-width: 85%; background: #00C9FF; color: white; padding: 12px 16px; border-radius: 14px; border-bottom-right-radius: 4px; box-shadow: 0 4px 10px rgba(0,201,255,0.2); word-wrap: break-word;`
      : `align-self: flex-start; max-width: 85%; background: white; padding: 12px 16px; border-radius: 14px; border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); color: #333; word-wrap: break-word;`;
    
    // Basit Markdown Desteği (kalın yazılar için)
    let formattedText = text.replace(/\\n/g, '<br>');
    formattedText = formattedText.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    
    msg.innerHTML = formattedText;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }
  
  function getAIResponse(query) {
    const q = query.toLowerCase();
    
    if(query.startsWith('AI_EXAM_EXPLAIN:')) {
       const parts = query.split('|');
       const question = parts[1] || '';
       const corr = parts[2] || '';
       const userAns = parts[3] || 'Boş';
       return `📝 **Yapay Zeka Sınav Analizi:**<br><br>Soru: "*\${question}*"\n\nSenin cevabın **"\${userAns}"** idi ama doğru cevap **"\${corr}"** olmalıydı.\n\n💡 **İpucu:** Bu soruyu çözerken konunun temel kavramlarını veya mantıksal sıralamasını atlamış olabilirsin. Cevabı "\${corr}" bulmak için soruyu adım adım parçalara ayırarak okumalı ve doğru mantığı kurmalısın. Eğer bu konuda sürekli hata yapıyorsan, kütüphane bölümünden konu anlatım videolarına tekrar göz atmanı öneririm!`;
    }
    
    if (q.includes('merhaba') || q.includes('selam')) return 'Merhaba! Sana bugün hangi derste yardımcı olabilirim? (Matematik, Fizik, Türkçe vb.)';
    if (q.includes('nasılsın')) return 'Teşekkür ederim, ben bir yapay zeka olduğum için hep harikayım! 🚀 Sen nasılsın, derslerin nasıl gidiyor?';
    if (q.includes('teşekkür') || q.includes('sağol')) return 'Rica ederim! Ne zaman yardıma ihtiyacın olursa buradayım.';
    if (q.includes('matematik') || q.includes('geometri')) return 'Matematik bir bulmaca gibidir! Formülleri ezberlemek yerine "neden böyle?" diye sormalısın. Takıldığın spesifik bir denklem varsa bana yazabilirsin.';
    if (q.includes('fizik') || q.includes('kimya') || q.includes('biyoloji')) return 'Fen bilimleri hayatın kurallarını anlatır. Anlamadığın formül veya terim nedir? İstersen kütüphane bölümünden deney videolarını izleyebilirsin.';
    if (q.includes('puan') || q.includes('nasıl') && q.includes('kazan')) return 'Puan kazanmak için ödevlerini zamanında teslim etmeli, sınavları başarıyla tamamlamalı ve günlük giriş yapmalısın. Liderlik tablosunda yerini almak için bol şans! 🏆';
    if (q.includes('tarih') || q.includes('coğrafya')) return 'Tarih ve coğrafya çalışırken zihin haritaları (mind maps) oluşturmak çok işe yarar. Önemli olayları birbirine bağlayarak hikaye gibi aklında tutabilirsin.';
    if (q.includes('sınav') && (q.includes('stres') || q.includes('heyecan') || q.includes('kötü'))) return 'Sınav stresi normaldir. Derin nefes alıp sakinleşmeyi dene. Unutma, başarısızlık sadece öğrenmenin bir parçasıdır. Yapman gereken tek şey hatalarından ders çıkarmak!';
    if (q.includes('ödev') || q.includes('görev')) return 'Ödevlerini "Bekleyen Ödevler" sekmesinden takip edebilirsin. Zamanı iyi yönetmek için ödevlerini son güne bırakmamaya özen göster!';
    
    return "Şu an bu sorduğun konuyu sistemimde bulamadım, çünkü gelişim aşamasında olan bir asistanım. 🤖 Ama istersen bu sorunu **Okul Forumu**'nda paylaşarak öğretmenlerine veya diğer öğrencilere sorabilirsin!";
  }

  function handleSend() {
    let text = input.value.trim();
    if(!text) return;
    
    let isHiddenCommand = text.startsWith('AI_EXAM_EXPLAIN:');
    
    if(!isHiddenCommand) {
      addMessage(text, true);
    }
    input.value = '';
    
    const typingMsg = document.createElement('div');
    typingMsg.style.cssText = `align-self: flex-start; max-width: 85%; background: white; padding: 12px 16px; border-radius: 14px; border-bottom-left-radius: 4px; border: 1px solid #eee; color: #888; font-style: italic; font-size: 13px;`;
    typingMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Asistan düşünüyor...';
    messages.appendChild(typingMsg);
    messages.scrollTop = messages.scrollHeight;
    
    setTimeout(() => {
      typingMsg.remove();
      addMessage(getAIResponse(text), false);
      if(!isOpen) {
         document.getElementById('ai-bot-badge').style.display = 'flex';
      }
      try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
    }, 1000 + Math.random() * 800);
  }

  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSend(); });
  
  // Sınavdan yanlışı analiz et butonu fonksiyonu
  window.askAIBot = function(question, correctAnswer, userAnswer) {
     if(!isOpen) btn.click();
     setTimeout(() => {
       input.value = `AI_EXAM_EXPLAIN:|\${question}|\${correctAnswer}|\${userAnswer}`;
       handleSend();
     }, 400);
  }
})();
