// Chat sayfası için temel statik veri ve UI yönetimi

const state = {
  activeConversationId: null,
  conversations: [],
  users: [],
  socket: null, // Socket bağlantısı için
};

const elements = {
  individualList: document.getElementById('individualList'),
  groupList: document.getElementById('groupList'),
  chatMessages: document.getElementById('chatMessages'),
  chatTitle: document.getElementById('chatTitle'),
  chatSubtitle: document.getElementById('chatSubtitle'),
  chatForm: document.getElementById('chatForm'),
  messageInput: document.getElementById('messageInput'),
  conversationSearch: document.getElementById('conversationSearch'),
  toggleSidebar: document.getElementById('toggleSidebar'),
  chatSidebar: document.getElementById('chatSidebar'),
  groupModal: document.getElementById('groupModal'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  openGroupModal: document.getElementById('openGroupModal'),
  closeModal: document.getElementById('closeModal'),
  cancelGroup: document.getElementById('cancelGroup'),
  saveGroup: document.getElementById('saveGroup'),
  groupName: document.getElementById('groupName'),
  userList: document.getElementById('userList'),
  createGroupBtn: document.getElementById('createGroupBtn'),
  contactsModal: document.getElementById('contactsModal'),
  openContactsBtn: document.getElementById('openContactsBtn'),
  closeContacts: document.getElementById('closeContacts'),
  contactsBackdrop: document.getElementById('contactsBackdrop'),
  contactsList: document.getElementById('contactsList'),
};

function formatTime(date = new Date()) {
  const d = new Date(date);
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function randomId() {
  return `id_${Math.random().toString(16).slice(2)}`;
}

async function createDummyData() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Sabit localhost:3000 yerine göreceli yol kullanıyoruz
    const res = await fetch(`/api/users?school=${encodeURIComponent(user.school || '')}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    
    // Kendisini listeden çıkar (Hem TC hem ID kontrolü ile daha güvenli)
    const peers = data.users.filter(u => String(u.tc) !== String(user.tc));
    state.users = peers;

    const individualConvs = peers.map((p) => ({
      id: p.tc,
      type: 'individual',
      name: p.name,
      members: [p.tc],
      isOnline: p.isOnline,
      lastMessage: 'Henüz mesaj yok',
      lastTime: '',
      messages: [],
    }));

    state.conversations = [...individualConvs];

    const allGroups = JSON.parse(localStorage.getItem('chatGroups') || '[]');
    // Kullanıcının üye olduğu grupları getir (ID veya TC eşleşmesi)
    const myGroups = allGroups.filter(g => g.members.includes(String(user.id)) || g.members.includes(String(user.tc)));
    myGroups.forEach(g => {
      // Eğer grup zaten listede yoksa ekle
      if(!state.conversations.find(c => c.id === g.id)) {
        state.conversations.unshift(g);
      }
    });

    renderConversationLists(elements.conversationSearch.value);
    if (state.conversations.length > 0 && !state.activeConversationId) {
      setActiveConversation(state.conversations[0].id);
    }
    
    // Geçmiş mesajları çekerek sol menüdeki "Son mesaj" bilgisini eksiksiz güncelle
    individualConvs.forEach(conv => fetchMessages(conv.id));

    // Socket Bağlantısını Kur (Sadece 1 kez)
    if(!state.socket) {
      state.socket = io();
      state.socket.on('connect', () => {
        state.socket.emit('login', user.tc);
        console.log('✅ Real-time bağlantısı kuruldu.');
      });

      state.socket.on('new_message', (data) => {
        const conv = getConversationById(data.sender_tc);
        if(conv) {
          const msg = {
            from: 'them',
            text: data.content,
            time: formatTime(data.sentAt),
            rawTime: data.sentAt
          };
          conv.messages.push(msg);
          conv.lastMessage = msg.text;
          conv.lastTime = msg.time;
          conv.lastTimestamp = new Date(msg.rawTime).getTime();
          
          if(state.activeConversationId === data.sender_tc) {
            renderMessages(conv.messages);
          }
          renderConversationLists(elements.conversationSearch.value);
        }
      });
    }
  } catch(e) {
    console.error("User fetch failed:", e);
    // Hata durumunda boş liste göster veya kullanıcıya bildir
    elements.individualList.innerHTML = '<div style="padding:10px;color:#aaa;font-size:12px;text-align:center;">Kullanıcılar yüklenemedi.</div>';
  }
}

function renderConversationItem(conversation) {
  const item = document.createElement('button');
  item.className = 'conversation-item';
  item.type = 'button';
  item.dataset.id = conversation.id;

  const initials = conversation.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  item.innerHTML = `
    <span class="conversation-avatar">
      ${initials}
      ${conversation.type === 'individual' ? `<span class="online-indicator ${conversation.isOnline ? 'online' : ''}"></span>` : ''}
    </span>
    <div class="conversation-info">
      <div class="conversation-name">${conversation.name}</div>
      <div class="conversation-meta">
        <span class="conversation-last">${conversation.lastMessage}</span>
        <span class="conversation-time">${conversation.lastTime}</span>
      </div>
    </div>
  `;

  item.addEventListener('click', () => {
    setActiveConversation(conversation.id);
    if (window.innerWidth < 980) {
      elements.chatSidebar.classList.add('hidden');
    }
  });

  return item;
}

function renderConversationLists(filterValue = '') {
  const normalized = filterValue.trim().toLowerCase();
  
  // En son mesaja göre sıralama (en yeni en üstte)
  state.conversations.sort((a, b) => {
    const timeA = a.lastTimestamp || 0;
    const timeB = b.lastTimestamp || 0;
    return timeB - timeA;
  });

  const filtered = state.conversations.filter((c) => c.name.toLowerCase().includes(normalized));

  elements.individualList.innerHTML = '';
  elements.groupList.innerHTML = '';

  if (filtered.length === 0) {
    elements.individualList.innerHTML = '<div style="text-align:center;color:#aaa;font-size:11px;padding:10px;">Sonuç bulunamadı.</div>';
    return;
  }

  filtered.forEach((conv) => {
    const item = renderConversationItem(conv);

    if (conv.type === 'individual') {
      elements.individualList.appendChild(item);
    } else {
      elements.groupList.appendChild(item);
    }

    if (state.activeConversationId === conv.id) {
      item.classList.add('active');
    }
  });
}

function getConversationById(id) {
  return state.conversations.find((c) => c.id === id) || null;
}

function setActiveConversation(id) {
  const conversation = getConversationById(id);
  if (!conversation) return;

  state.activeConversationId = conversation.id;
  document.querySelectorAll('.conversation-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.id === id);
  });

  elements.chatTitle.textContent = conversation.name;

  if (conversation.type === 'group') {
    elements.chatSubtitle.textContent = `Grup sohbeti · ${conversation.members.length} kişi`;
    elements.chatSubtitle.style.color = 'var(--muted)';
    renderMessages(conversation.messages);
  } else {
    elements.chatSubtitle.textContent = conversation.isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
    elements.chatSubtitle.style.color = conversation.isOnline ? '#2ecc71' : 'var(--muted)';
    // Backend'den mesajları çek
    fetchMessages(conversation.id);
  }
}

async function fetchMessages(withTc) {
  try {
    const res = await fetch(`/api/messages?with_tc=${withTc}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    const data = await res.json();
    if (data.success) {
      const conv = getConversationById(withTc);
      if (conv) {
        conv.messages = data.messages.map(m => ({
          from: m.sender_tc === getCurrentUser().tc ? 'me' : 'them',
          text: m.content,
          time: formatTime(m.sentAt),
          rawTime: m.sentAt
        }));
        
        // Son mesajı ve zamanı güncelle (Mesaj listeleme mantığı eksiksiz)
        if (conv.messages.length > 0) {
          const lastMsg = conv.messages[conv.messages.length - 1];
          conv.lastMessage = lastMsg.from === 'me' ? 'Siz: ' + lastMsg.text : lastMsg.text;
          conv.lastTime = lastMsg.time;
          conv.lastTimestamp = lastMsg.rawTime ? new Date(lastMsg.rawTime).getTime() : new Date().getTime();
        } else {
          conv.lastMessage = 'Henüz mesaj yok';
          conv.lastTime = '';
          conv.lastTimestamp = 0;
        }
        
        // Arayüzü güncelle
        renderConversationLists(elements.conversationSearch.value);
        
        if (state.activeConversationId === withTc) {
          renderMessages(conv.messages);
        }
      }
    }
  } catch (e) { console.error("Message fetch failed:", e); }
}

function renderMessages(messages) {
  elements.chatMessages.innerHTML = '';

  if (!messages || messages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <i class="fa-regular fa-message"></i>
      <p>Henüz mesaj yok. Mesaj göndermek için alttaki alana yazın.</p>
    `;
    elements.chatMessages.appendChild(empty);
    scrollToBottom();
    return;
  }

  messages.forEach((message) => {
    const item = document.createElement('div');
    item.className = `message ${message.from === 'me' ? 'me' : 'them'}`;
    item.innerHTML = `
      <div>${message.text}</div>
      <span class="message-time">${message.time}</span>
    `;
    elements.chatMessages.appendChild(item);
  });

  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  });
}

async function sendMessage(text) {
  const conversation = getConversationById(state.activeConversationId);
  if (!conversation || !text.trim()) return;

  const currentText = text.trim();
  elements.messageInput.value = '';

  // Local state update for immediate feedback
  const newMessage = {
    from: 'me',
    text: currentText,
    time: formatTime(),
    rawTime: new Date().toISOString()
  };
  conversation.messages.push(newMessage);
  conversation.lastMessage = 'Siz: ' + newMessage.text;
  conversation.lastTime = newMessage.time;
  conversation.lastTimestamp = new Date(newMessage.rawTime).getTime();
  renderMessages(conversation.messages);
  renderConversationLists(elements.conversationSearch.value);

  // Send to Backend
  if (conversation.type === 'individual') {
    try {
      // 1. Backend API'ye kaydet (HTTP üzerinden)
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          receiver_tc: conversation.id,
          content: currentText
        })
      });

    } catch (e) { console.error("Message send failed:", e); }
  } else if (conversation.type === 'group') {
    // Geçici veri kullanımı (localStorage) ile grup mesajını kaydet
    const allGroups = JSON.parse(localStorage.getItem('chatGroups') || '[]');
    const groupIndex = allGroups.findIndex(g => g.id === conversation.id);
    if (groupIndex !== -1) {
      allGroups[groupIndex].messages.push(newMessage);
      allGroups[groupIndex].lastMessage = 'Siz: ' + newMessage.text;
      allGroups[groupIndex].lastTime = newMessage.time;
      allGroups[groupIndex].lastTimestamp = conversation.lastTimestamp;
      localStorage.setItem('chatGroups', JSON.stringify(allGroups));
    }
  }
}

function toggleSidebar() {
  elements.chatSidebar.classList.toggle('hidden');
}

function goToPanel() {
  const user = getCurrentUser();
  if (!user) return;
  window.location.href = redirectByRole(user.role);
}

async function openContactsModal() {
  const user = getCurrentUser();
  if (!user) return;
  
  try {
    const res = await fetch(`/api/users?school=${encodeURIComponent(user.school || '')}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    
    // Kendisini listeden çıkar
    const peers = data.users.filter(u => String(u.tc) !== String(user.tc));
    
    if(elements.contactsList) {
      elements.contactsList.innerHTML = peers.map(u => `
        <div class="user-card" onclick="startChat('${u.tc}', '${u.name}')" style="cursor:pointer; display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--border); width:100%; text-align:left; background:transparent;">
          <span class="user-avatar" style="width:38px; height:38px; background:rgba(92,142,173,0.18); color:var(--primary); border-radius:50%; display:grid; place-items:center; font-weight:700; position:relative; flex-shrink:0;">
            ${u.name.split(' ').map(n=>n[0]).join('')}
            <span class="online-indicator ${u.isOnline ? 'online' : ''}" style="width:11px; height:11px; border:2px solid var(--surface); position:absolute; bottom:0; right:0;"></span>
          </span>
          <div style="flex:1; min-width:0;">
            <div class="user-name" style="font-weight:700; font-size:14px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.name}</div>
            <div style="font-size:11px; color:${u.isOnline ? '#2ecc71' : 'var(--muted)'};">${u.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'} · ${u.role === 'ogretmen' ? 'Öğretmen' : u.role === 'ogrenci' ? 'Öğrenci' : 'Veli'}</div>
          </div>
        </div>
      `).join('');
    }
    
    if(elements.contactsModal) elements.contactsModal.classList.add('open');
  } catch(e) {
    console.error("Contacts fetch failed:", e);
    if(elements.contactsList) elements.contactsList.innerHTML = '<div style="padding:20px; text-align:center; color:var(--muted);">Kişiler yüklenemedi.</div>';
  }
}

function closeContactsModal() {
  if(elements.contactsModal) elements.contactsModal.classList.remove('open');
}

function startChat(peerTc, peerName) {
    closeContactsModal();
    const existing = state.conversations.find(c => c.id === peerTc);
    if(existing) {
        setActiveConversation(peerTc);
    } else {
        const newConv = {
            id: peerTc,
            type: 'individual',
            name: peerName,
            members: [peerTc],
            lastMessage: 'Yeni sohbet...',
            lastTime: '',
            messages: []
        };
        state.conversations.unshift(newConv);
        renderConversationLists();
        setActiveConversation(peerTc);
    }
}

function openModal() {
  elements.groupModal.classList.add('open');
  elements.groupModal.setAttribute('aria-hidden', 'false');
  renderUserList();
}

function closeModal() {
  elements.groupModal.classList.remove('open');
  elements.groupModal.setAttribute('aria-hidden', 'true');
  elements.groupName.value = '';
  elements.userList.querySelectorAll('.user-card.selected').forEach((el) => el.classList.remove('selected'));
}

function renderUserList() {
  elements.userList.innerHTML = '';
  state.users.forEach((user) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'user-card';
    card.dataset.userId = user.id || user.tc;

    card.innerHTML = `
      <span class="user-avatar">${user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')}
      </span>
      <span class="user-name">${user.name}</span>
    `;

    card.addEventListener('click', () => {
      card.classList.toggle('selected');
    });

    elements.userList.appendChild(card);
  });
}

function createGroup() {
  const groupName = elements.groupName.value.trim();
  const selectedUsers = Array.from(elements.userList.querySelectorAll('.user-card.selected')).map((card) => card.dataset.userId);

  if (!groupName) {
    alert('Grup adı giriniz.');
    return;
  }

  if (selectedUsers.length < 1) {
    alert('En az bir üye seçmelisiniz.');
    return;
  }
  
  const user = getCurrentUser();
  if(user) {
      selectedUsers.push(user.id || user.tc); // add creator to group
  }

  const newGroup = {
    id: randomId(),
    type: 'group',
    name: groupName,
    members: selectedUsers,
    lastMessage: 'Grup oluşturuldu.',
    lastTime: formatTime(),
    messages: [
      { from: 'me', text: 'Grup oluşturuldu. Herkese merhaba!', time: formatTime() },
    ],
  };
  
  const allGroups = JSON.parse(localStorage.getItem('chatGroups') || '[]');
  allGroups.push(newGroup);
  localStorage.setItem('chatGroups', JSON.stringify(allGroups));

  state.conversations.unshift(newGroup);
  renderConversationLists(elements.conversationSearch.value);
  closeModal();
  setActiveConversation(newGroup.id);
}

async function init() {
  const user = requireAuth();
  if (!user) return;

  await createDummyData();
  renderConversationLists(elements.conversationSearch.value);

  // Varsayılan olarak ilk konuşmayı seç
  if (state.conversations.length && !state.activeConversationId) {
    setActiveConversation(state.conversations[0].id);
  }

  elements.chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(elements.messageInput.value);
  });

  elements.conversationSearch.addEventListener('input', () => {
    renderConversationLists(elements.conversationSearch.value);
  });

  if(elements.toggleSidebar) elements.toggleSidebar.addEventListener('click', toggleSidebar);

  if(elements.openGroupModal) elements.openGroupModal.addEventListener('click', openModal);
  if(elements.createGroupBtn) elements.createGroupBtn.addEventListener('click', openModal);
  if(elements.closeModal) elements.closeModal.addEventListener('click', closeModal);
  if(elements.cancelGroup) elements.cancelGroup.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal();
  });
  if(elements.modalBackdrop) elements.modalBackdrop.addEventListener('click', closeModal);
  if(elements.saveGroup) elements.saveGroup.addEventListener('click', (event) => {
    event.preventDefault();
    createGroup();
  });

  if(elements.openContactsBtn) elements.openContactsBtn.addEventListener('click', openContactsModal);
  if(elements.closeContacts) elements.closeContacts.addEventListener('click', closeContactsModal);
  if(elements.contactsBackdrop) elements.contactsBackdrop.addEventListener('click', closeContactsModal);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) {
      if(elements.chatSidebar) elements.chatSidebar.classList.remove('hidden');
    }
  });

  // Arayüz ve API iletişimi: Gerçek zamanlı mesajlaşma için polling
  setInterval(() => {
    // Karşı tarafa mesaj gitmesi ve görebilmesi için tüm bireysel sohbetleri yokla
    state.conversations.filter(c => c.type === 'individual').forEach(c => {
      fetchMessages(c.id);
    });
  }, 3000);
}

init();
