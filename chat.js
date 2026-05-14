// chat.js — Grup Özellikleri Aktif (Orijinal Tasarım Uyumlu)

const state = {
  activeConversationId: null,
  conversations: [], 
  users: [],         
  socket: null,
};

const elements = {
  individualList:     document.getElementById('individualList'),
  groupList:          document.getElementById('groupList'),
  chatMessages:       document.getElementById('chatMessages'),
  chatTitle:          document.getElementById('chatTitle'),
  chatSubtitle:       document.getElementById('chatSubtitle'),
  chatForm:           document.getElementById('chatForm'),
  messageInput:       document.getElementById('messageInput'),
  conversationSearch: document.getElementById('conversationSearch'),
  groupModal:         document.getElementById('groupModal'),
  openGroupModal:     document.getElementById('openGroupModal'),
  createGroupBtn:     document.getElementById('createGroupBtn'),
  saveGroup:          document.getElementById('saveGroup'),
  groupName:          document.getElementById('groupName'),
  userList:           document.getElementById('userList'),
  chatTop:            document.getElementById('chatTop'),
  groupDetailsModal:  document.getElementById('groupDetailsModal'),
  groupDetailsName:   document.getElementById('groupDetailsName'),
  groupDetailsMemberCount: document.getElementById('groupDetailsMemberCount'),
  groupMembersList:   document.getElementById('groupMembersList'),
  leaveGroupBtn:      document.getElementById('leaveGroupBtn'),
  voiceBtn:           document.getElementById('voiceBtn'),
};

function formatTime(date = new Date()) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function getAuthHeader() {
  return { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` };
}

function goToPanel() {
  const user = getCurrentUser();
  if (user) window.location.href = redirectByRole(user.role);
}

// ─── BAŞLATMA ────────────────────────────────────────────────────────

async function initChat() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Bireysel konuşmaları (son mesajlarla birlikte) getir
    const cRes = await fetch(`/api/chat-conversations?school=${encodeURIComponent(user.school || '')}`, { headers: getAuthHeader() });
    const cData = await cRes.json();
    if (cData.success) {
      state.users = cData.conversations; // Modalda seçim için
      state.conversations = cData.conversations.map(c => ({
        id: c.tc, 
        type: 'individual', 
        name: c.name, 
        messages: [], 
        lastMessage: c.lastMessage || 'Sohbeti başlatın...',
        lastActivity: Date.now()
      }));
    }
    
    await loadGroups();
    renderConversationLists();
    initSocket(user);
  } catch (e) { console.error(e); }
}

async function loadGroups() {
  try {
    const res = await fetch('/api/chat-groups', { headers: getAuthHeader() });
    const data = await res.json();
    if (data.success) {
      data.groups.forEach(g => {
        let members = [];
        try { members = JSON.parse(g.members); } catch(e) {}
        state.conversations.push({
          id: g.id, type: 'group', name: g.name, members: members, lastMessage: 'Grup Sohbeti', messages: [], lastActivity: Date.now()
        });
      });
    }
  } catch (e) { console.error(e); }
}

// ─── SOCKET ──────────────────────────────────────────────────────────

function initSocket(user) {
  if (state.socket) return;
  state.socket = io();

  function joinAllGroups() {
    state.conversations.filter(c => c.type === 'group').forEach(g => {
      state.socket.emit('join_group', g.id);
    });
  }

  state.socket.on('connect', () => {
    state.socket.emit('login', user.tc);
    joinAllGroups();
    console.log('✅ Socket bağlandı:', state.socket.id);
  });

  state.socket.on('reconnect', () => {
    state.socket.emit('login', user.tc);
    joinAllGroups();
  });

  state.socket.on('new_message', (data) => {
    let conv = getConversationById(data.sender_tc);
    if (!conv) {
      // Konuşma listede yoksa oluştur
      conv = { id: String(data.sender_tc), type: 'individual', name: data.sender_name || data.sender_tc, messages: [], lastMessage: '', hasNewMessage: true, lastActivity: Date.now() };
      state.conversations.push(conv);
    }
    conv.messages.push({ from: 'them', text: data.content, time: formatTime(data.sentAt), isNew: true });
    conv.lastMessage = data.content;
    conv.hasNewMessage = true;
    conv.lastActivity = Date.now();
    if (state.activeConversationId === String(data.sender_tc)) renderMessages(conv.messages, 'individual');
    renderConversationLists();
  });

  state.socket.on('group_message', (data) => {
    let conv = getConversationById(data.group_id);
    if (!conv) return; // Grubumuz değilse yoksay
    const myTc = getCurrentUser()?.tc;
    if (String(data.sender_tc) === String(myTc)) return; // Kendi mesajımızı çift gösterme
    conv.messages.push({ from: 'them', text: data.content, senderName: data.sender_name, time: formatTime(data.sentAt), isNew: true });
    conv.lastMessage = `${data.sender_name}: ${data.content}`;
    conv.hasNewMessage = true;
    conv.lastActivity = Date.now();
    if (state.activeConversationId === String(data.group_id)) renderMessages(conv.messages, 'group');
    renderConversationLists();
  });
}

// ─── UI ──────────────────────────────────────────────────────────────

function renderConversationLists() {
  elements.individualList.innerHTML = '';
  elements.groupList.innerHTML = '';

  // Sort conversations: last activity first, then new messages
  const individual = state.conversations.filter(c => c.type === 'individual').sort((a, b) => {
    // Önce yeni mesajlar üste gelsin
    if (a.hasNewMessage && !b.hasNewMessage) return -1;
    if (!a.hasNewMessage && b.hasNewMessage) return 1;
    // Sonra en son aktif olana göre sırala
    return (b.lastActivity || 0) - (a.lastActivity || 0);
  });
  const groups = state.conversations.filter(c => c.type === 'group').sort((a, b) => {
    // Önce yeni mesajlar üste gelsin
    if (a.hasNewMessage && !b.hasNewMessage) return -1;
    if (!a.hasNewMessage && b.hasNewMessage) return 1;
    // Sonra en son aktif olana göre sırala
    return (b.lastActivity || 0) - (a.lastActivity || 0);
  });

  individual.forEach(conv => {
    const item = document.createElement('div');
    item.className = `conversation-item ${state.activeConversationId === String(conv.id) ? 'active' : ''} ${conv.hasNewMessage ? 'has-new-message' : ''}`;
    
    item.innerHTML = `
      <div class="conversation-avatar" style="background: ${conv.type === 'group' ? '#284B63' : '#5C8EAD'}">
        ${conv.name.charAt(0).toUpperCase()}
      </div>
      <div class="conversation-info">
        <div class="conversation-name">${conv.name}</div>
        <div class="conversation-meta">
          <div class="conversation-last" style="${conv.hasNewMessage ? 'font-weight:bold;' : ''}">${conv.lastMessage}</div>
        </div>
      </div>
    `;
    
    item.onclick = () => {
      conv.hasNewMessage = false;
      setActiveConversation(conv.id);
      renderConversationLists();
    };
    elements.individualList.appendChild(item);
  });

  groups.forEach(conv => {
    const item = document.createElement('div');
    item.className = `conversation-item ${state.activeConversationId === String(conv.id) ? 'active' : ''} ${conv.hasNewMessage ? 'has-new-message' : ''}`;
    
    item.innerHTML = `
      <div class="conversation-avatar" style="background: ${conv.type === 'group' ? '#284B63' : '#5C8EAD'}">
        ${conv.name.charAt(0).toUpperCase()}
      </div>
      <div class="conversation-info">
        <div class="conversation-name">${conv.name}</div>
        <div class="conversation-meta">
          <div class="conversation-last" style="${conv.hasNewMessage ? 'font-weight:bold;' : ''}">${conv.lastMessage}</div>
        </div>
      </div>
    `;
    
    item.onclick = () => {
      conv.hasNewMessage = false;
      setActiveConversation(conv.id);
      renderConversationLists();
    };
    elements.groupList.appendChild(item);
  });
}

function setActiveConversation(id) {
  state.activeConversationId = String(id);
  const conv = getConversationById(id);
  conv.lastActivity = Date.now();
  elements.chatTitle.textContent = conv.name;
  elements.chatSubtitle.textContent = conv.type === 'group' ? `${conv.members.length} Üye (Detay için tıkla)` : 'Bireysel Sohbet';
  
  if (conv.type === 'group') fetchGroupMessages(id);
  else fetchIndividualMessages(id);
  renderConversationLists();
}

async function fetchIndividualMessages(withTc) {
  const res = await fetch(`/api/messages?with_tc=${withTc}`, { headers: getAuthHeader() });
  const data = await res.json();
  if (data.success) {
    const myTc = getCurrentUser()?.tc;
    const conv = getConversationById(withTc);
    conv.messages = data.messages.map(m => ({ from: String(m.sender_tc) === String(myTc) ? 'me' : 'them', text: m.content, time: formatTime(m.sentAt) }));
    renderMessages(conv.messages, 'individual');
  }
}

async function fetchGroupMessages(groupId) {
  const res = await fetch(`/api/chat-groups/${groupId}/messages`, { headers: getAuthHeader() });
  const data = await res.json();
  if (data.success) {
    const myTc = getCurrentUser()?.tc;
    const conv = getConversationById(groupId);
    conv.messages = data.messages.map(m => ({ from: String(m.sender_tc) === String(myTc) ? 'me' : 'them', text: m.content, senderName: m.sender_name, time: formatTime(m.sentAt) }));
    renderMessages(conv.messages, 'group');
  }
}

function renderMessages(messages, type) {
  elements.chatMessages.innerHTML = '';
  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = `message ${m.from === 'me' ? 'me' : 'them'} ${m.isNew ? 'new-message' : ''}`;
    const sender = (type === 'group' && m.from === 'them') ? `<small><b>${m.senderName}</b></small><br>` : '';
    
    if (m.text && m.text.startsWith('DATA:AUDIO/')) {
      const audioUrl = m.text.split('|')[1] || m.text;
      div.innerHTML = `${sender}<audio controls src="${audioUrl}" style="max-width:200px; height:30px;"></audio> <small style="display:block; opacity:0.6;">${m.time}</small>`;
    } else {
      div.innerHTML = `${sender}${m.text} <small style="display:block; opacity:0.6;">${m.time}</small>`;
      if (m.isNew) {
        div.onclick = () => {
          m.isNew = false;
          div.classList.remove('new-message');
          div.onclick = null;
        };
      }
    }
    
    elements.chatMessages.appendChild(div);
  });
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// ─── GRUP İŞLEMLERİ ──────────────────────────────────────────────────

function openGroupModal() {
  elements.groupName.value = '';
  elements.groupModal.classList.add('open');
  
  const availableUsers = state.users.filter(u => u.tc);
  if (availableUsers.length === 0) {
    elements.userList.innerHTML = '<div style="color:#e74c3c; font-size:13px; text-align:center; padding:20px;">Okulunuzda gruba eklenebilecek başka kullanıcı bulunamadı.</div>';
  } else {
    elements.userList.innerHTML = availableUsers.map(u => `
      <div class="user-card" onclick="this.classList.toggle('selected')" data-tc="${u.tc}">
        <div class="conversation-avatar" style="width:30px; height:30px; font-size:12px; background:#5C8EAD;">${u.name.charAt(0).toUpperCase()}</div>
        <div class="conversation-info">
          <div class="conversation-name" style="font-size:13px;">${u.name}</div>
        </div>
      </div>
    `).join('');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('open');
  el.style.display = 'none'; // Hem class hem inline style'ı temizle
}
window.closeModal = closeModal;

async function createGroup() {
  const name = elements.groupName.value.trim();
  const selected = [...elements.userList.querySelectorAll('.user-card.selected')].map(el => el.dataset.tc);
  
  if (!name) return alert('Lütfen bir grup adı girin.');
  if (selected.length === 0) return alert('Lütfen en az bir üye seçin.');
  
  try {
    const res = await fetch('/api/chat-groups', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, 
      body: JSON.stringify({ name, members: selected }) 
    });
    const data = await res.json();
    if (data.success) {
      closeModal('groupModal');
      // Sayfayı yenilemeden grubu listeye ekle ve socket'e katıl
      await loadGroups();
      renderConversationLists();
      // Yeni gruplara da katıl
      if (state.socket) {
        state.conversations.filter(c => c.type === 'group').forEach(g => state.socket.emit('join_group', g.id));
      }
      alert('Grup başarıyla oluşturuldu!');
    } else {
      alert('Hata: ' + (data.message || 'Grup oluşturulamadı.'));
    }
  } catch(e) {
    console.error('Grup oluşturma hatası:', e);
    alert('Sunucu hatası oluştu!');
  }
}

async function openGroupDetails() {
  const conv = getConversationById(state.activeConversationId);
  if (!conv || conv.type !== 'group') return;
  
  elements.groupDetailsName.textContent = conv.name;
  elements.groupDetailsMemberCount.textContent = 'Yükleniyor...';
  elements.groupMembersList.innerHTML = '';
  elements.groupDetailsModal.classList.add('open');

  try {
    const res = await fetch(`/api/chat-groups/${conv.id}/members`, { headers: getAuthHeader() });
    const data = await res.json();
    if (data.success) {
      elements.groupDetailsMemberCount.textContent = `${data.members.length} Üye`;
      elements.groupMembersList.innerHTML = data.members.map(m => `
        <div class="user-card" onclick="startPrivateChatFromGroup('${m.tc}', '${m.name}')" style="background:#f8fafc; border:1px solid #eee;">
          <div class="conversation-avatar" style="width:30px; height:30px; font-size:12px; background:#5C8EAD;">${m.name.charAt(0).toUpperCase()}</div>
          <div class="conversation-info">
            <div class="conversation-name" style="font-size:14px;">${m.name}</div>
          </div>
        </div>
      `).join('');
    } else {
      elements.groupDetailsMemberCount.textContent = 'Üyeler yüklenemedi';
    }
  } catch(e) {
    console.error('Üye listesi hatası:', e);
    elements.groupDetailsMemberCount.textContent = 'Hata oluştu';
  }
}

window.startPrivateChatFromGroup = function(tc, name) {
  const me = getCurrentUser();
  if (!me || String(tc) === String(me.tc)) return;
  closeModal('groupDetailsModal');
  setActiveConversation(tc);
};

// ─── EVENTLER ────────────────────────────────────────────────────────

// ─── SESLİ MESAJ LOGİC ────────────────────────────────────────────────
let mediaRecorder;
let audioChunks = [];

elements.voiceBtn.onclick = async () => {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          const voiceMsg = `DATA:AUDIO/WEBM|${base64Audio}`;
          sendDirectMessage(voiceMsg);
        };
      };
      
      mediaRecorder.start();
      elements.voiceBtn.classList.add('recording');
      elements.voiceBtn.innerHTML = '<i class="fa-solid fa-stop" style="color:#e53e3e;"></i>';
      console.log("Kayıt başladı...");
    } catch (err) {
      alert("Mikrofon erişimi engellendi!");
    }
  } else {
    mediaRecorder.stop();
    elements.voiceBtn.classList.remove('recording');
    elements.voiceBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    console.log("Kayıt durduruldu.");
  }
};

async function sendDirectMessage(text) {
  if (!text || !state.activeConversationId) return;
  const conv = getConversationById(state.activeConversationId);
  
  conv.messages.push({ from: 'me', text, time: formatTime() });
  conv.lastMessage = text.startsWith('DATA:AUDIO/') ? '🎤 Sesli Mesaj' : text;
  conv.lastActivity = Date.now();
  
  renderMessages(conv.messages, conv.type);
  renderConversationLists();
  
  const url = conv.type === 'group' ? `/api/chat-groups/${conv.id}/messages` : '/api/messages';
  const body = conv.type === 'group' ? { content: text } : { receiver_tc: conv.id, content: text };
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, body: JSON.stringify(body) });
}

elements.chatForm.onsubmit = async (e) => {
  e.preventDefault();
  const text = elements.messageInput.value.trim();
  if (!text) return;
  elements.messageInput.value = '';
  sendDirectMessage(text);
};


elements.openGroupModal.onclick = openGroupModal;
elements.createGroupBtn.onclick = openGroupModal;
elements.saveGroup.onclick = createGroup;
elements.chatTop.onclick = () => {
    const conv = getConversationById(state.activeConversationId);
    if(conv && conv.type === 'group') openGroupDetails();
};
elements.leaveGroupBtn.onclick = async () => {
    const res = await fetch(`/api/chat-groups/${state.activeConversationId}/leave`, { method: 'DELETE', headers: getAuthHeader() });
    if ((await res.json()).success) location.reload();
};

function getConversationById(id) { return state.conversations.find(c => String(c.id) === String(id)); }
initChat();
