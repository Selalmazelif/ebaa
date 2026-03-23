// Chat sayfası için temel statik veri ve UI yönetimi

const state = {
  activeConversationId: null,
  conversations: [],
  users: [],
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

function createDummyData() {
  const user = getCurrentUser();
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  if (!user) {
    state.users = [];
    state.conversations = [];
    return;
  }

  const peers = users.filter((u) => u.school === user.school && u.tc !== user.tc);
  state.users = peers;
  state.conversations = peers.map((p) => ({
    id: p.tc,
    type: 'individual',
    name: p.name,
    members: [p.tc],
    lastMessage: 'Henüz mesaj yok',
    lastTime: '',
    messages: [],
  }));
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
    <span class="conversation-avatar">${initials}</span>
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
  const filtered = state.conversations.filter((c) => c.name.toLowerCase().includes(normalized));

  elements.individualList.innerHTML = '';
  elements.groupList.innerHTML = '';

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
  } else {
    elements.chatSubtitle.textContent = 'Bireysel sohbet';
  }

  renderMessages(conversation.messages);
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

function sendMessage(text) {
  const conversation = getConversationById(state.activeConversationId);
  if (!conversation || !text.trim()) return;

  const newMessage = {
    from: 'me',
    text: text.trim(),
    time: formatTime(),
  };

  conversation.messages.push(newMessage);
  conversation.lastMessage = newMessage.text;
  conversation.lastTime = newMessage.time;

  renderMessages(conversation.messages);
  renderConversationLists(elements.conversationSearch.value);
  elements.messageInput.value = '';
}

function toggleSidebar() {
  elements.chatSidebar.classList.toggle('hidden');
}

function goToPanel() {
  const user = getCurrentUser();
  if (!user) return;
  
  if (user.role === 'ogrenci') {
    window.location.href = 'ogrenci-panel.html';
  } else if (user.role === 'ogretmen') {
    window.location.href = 'ogretmen-panel.html';
  } else if (user.role === 'veli') {
    window.location.href = 'veli-panel.html';
  } else {
    window.location.href = 'index.html';
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
    card.dataset.userId = user.id;

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

  state.conversations.unshift(newGroup);
  renderConversationLists(elements.conversationSearch.value);
  closeModal();
  setActiveConversation(newGroup.id);
}

function init() {
  const user = requireAuth();
  if (!user) return;

  createDummyData();
  renderConversationLists();
  showUserInfo();

  // Varsayılan olarak ilk konuşmayı seç
  if (state.conversations.length) {
    setActiveConversation(state.conversations[0].id);
  }

  elements.chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(elements.messageInput.value);
  });

  elements.conversationSearch.addEventListener('input', () => {
    renderConversationLists(elements.conversationSearch.value);
  });

  elements.toggleSidebar.addEventListener('click', toggleSidebar);

  elements.openGroupModal.addEventListener('click', openModal);
  elements.createGroupBtn.addEventListener('click', openModal);
  elements.closeModal.addEventListener('click', closeModal);
  elements.cancelGroup.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal();
  });
  elements.modalBackdrop.addEventListener('click', closeModal);
  elements.saveGroup.addEventListener('click', (event) => {
    event.preventDefault();
    createGroup();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) {
      elements.chatSidebar.classList.remove('hidden');
    }
  });
}

init();
