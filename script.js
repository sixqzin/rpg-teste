// ============================================
// CHRONO RPG - SISTEMA COMPLETO v3.0
// ============================================

// ===== CANVAS BACKGROUND =====
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const stars = Array.from({ length: 150 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 2 + 0.5,
  vy: Math.random() * 0.5 + 0.2,
  opacity: Math.random() * 0.5 + 0.5
}));

function animateBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach(s => {
    ctx.fillStyle = `rgba(168,85,247,${s.opacity * 0.3})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    s.y += s.vy;
    if (s.y > canvas.height) {
      s.y = -10;
      s.x = Math.random() * canvas.width;
    }
  });
  requestAnimationFrame(animateBackground);
}
animateBackground();

// ===== STORAGE & DATA =====
const STORAGE_KEY = 'chronoRPG_data';
const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect fill="%23a855f7" width="96" height="96"/%3E%3Ctext x="50%25" y="50%25" font-size="48" fill="white" text-anchor="middle" dy=".3em"%3E🎭%3C/text%3E%3C/svg%3E';

let DATA = {
  users: [
    { user: 'host', pass: 'boladefogo123', role: 'admin', avatar: DEFAULT_AVATAR, sessionsAttended: 0, achievements: [] }
  ],
  campaigns: [],
  attendance: [],
  masterRequests: [],
  notifications: [],
  diceHistory: [],
  diceMacros: [],
  chatMessages: [],
  characterSheets: []
};

let currentUser = null;
let currentAttendanceData = null;
let currentEditCampaign = null;
let currentSheetCampaign = null;
let currentManageCampaign = null;
let currentViewSheet = null;
let selectedTimeSlots = [];
let selectedDiceType = 'd20';
let lastRoll = null;

// ===== STORAGE FUNCTIONS =====
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      DATA = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
}

// ===== UTILITY FUNCTIONS =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navMap = {
    'playerView': 'navPlayer',
    'masterView': 'navMaster',
    'adminView': 'navAdmin',
    'masterRequestView': 'navMasterRequest',
    'diceView': 'navDice',
    'chatView': 'navChat',
    'rankingView': 'navRanking'
  };
  if (navMap[viewId]) {
    document.getElementById(navMap[viewId]).classList.add('active');
  }
}

function showToast(message, type = 'info', title = '') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      <div class="toast-message">${message}</div>
    </div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

async function fileToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// ===== AUTH FUNCTIONS =====
async function login(username, password) {
  const user = DATA.users.find(u => u.user === username && u.pass === password);
  if (!user) {
    showToast('Usuário ou senha inválidos', 'error', 'Erro de Login');
    return;
  }
  currentUser = user;
  showToast(`Bem-vindo, ${username}!`, 'success', 'Login realizado');
  initDashboard();
}

async function register(username, password, avatarFile) {
  if (!username || !password) {
    showToast('Preencha todos os campos', 'warning');
    return;
  }
  if (DATA.users.find(u => u.user === username)) {
    showToast('Usuário já existe', 'error', 'Erro de Registro');
    return;
  }
  
  let avatarUrl = DEFAULT_AVATAR;
  if (avatarFile) {
    avatarUrl = await fileToDataURL(avatarFile);
  }
  
  const newUser = {
    user: username,
    pass: password,
    role: 'player',
    avatar: avatarUrl,
    sessionsAttended: 0,
    achievements: [],
    masterTier: null
  };
  
  DATA.users.push(newUser);
  saveData();
  showToast('Conta criada com sucesso!', 'success', 'Registro Completo');
  showScreen('loginScreen');
}

function logout() {
  currentUser = null;
  showScreen('loginScreen');
  showToast('Você saiu da conta', 'info', 'Até logo!');
}

async function uploadAvatar(file) {
  if (!file) return;
  currentUser.avatar = await fileToDataURL(file);
  document.getElementById('userAvatar').src = currentUser.avatar;
  saveData();
  showToast('Avatar atualizado!', 'success');
}

// ===== DASHBOARD =====
function initDashboard() {
  showScreen('dashboard');
  
  document.getElementById('welcomeUser').textContent = currentUser.user;
  document.getElementById('userAvatar').src = currentUser.avatar || DEFAULT_AVATAR;
  
  const roleBadge = document.getElementById('roleBadge');
  if (currentUser.role === 'admin') {
    roleBadge.textContent = '👑 Admin';
  } else if (currentUser.role === 'master') {
    roleBadge.textContent = '🧙 Mestre';
    const tierBadge = document.getElementById('masterTier');
    tierBadge.style.display = 'block';
    tierBadge.textContent = currentUser.masterTier || 'Bronze';
  } else {
    roleBadge.textContent = '🎮 Jogador';
    document.getElementById('masterTier').style.display = 'none';
  }
  
  document.getElementById('navMaster').style.display = 
    (currentUser.role === 'master' || currentUser.role === 'admin') ? 'block' : 'none';
  document.getElementById('navAdmin').style.display = 
    currentUser.role === 'admin' ? 'block' : 'none';
  document.getElementById('navMasterRequest').style.display = 
    currentUser.role === 'player' ? 'block' : 'none';
  
  renderAchievementsBadges();
  updateNotificationBadge();
  showView('playerView');
  loadPlayerView();
}

// ===== PLAYER VIEW =====
function loadPlayerView() {
  loadActiveCampaigns();
  loadMyEnrollments();
  loadAttendanceList();
  updatePlayerCampaignCount();
}

function updatePlayerCampaignCount() {
  const enrolled = getUserCampaigns(currentUser.user).length;
  document.getElementById('playerCampaignCount').textContent = `${enrolled}/2`;
}

function getUserCampaigns(username) {
  return DATA.campaigns.filter(c => 
    c.status === 'approved' && 
    !c.finished &&
    c.enrolled && 
    c.enrolled.includes(username)
  );
}

function createCampaignCard(campaign) {
  const template = document.getElementById('cardTemplate');
  const card = template.content.cloneNode(true).querySelector('.campaign-card');
  
  card.querySelector('.title').textContent = campaign.name;
  card.querySelector('.meta').textContent = `Mestre: ${campaign.master} | Sistema: ${campaign.system || 'N/A'}`;
  card.querySelector('.desc').textContent = campaign.desc || 'Sem descrição';
  
  const chipsRow = card.querySelector('.chips-row');
  chipsRow.innerHTML = '';
  if (campaign.categories && campaign.categories.length > 0) {
    campaign.categories.forEach(cat => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = cat;
      chipsRow.appendChild(chip);
    });
  }
  
  const enrolled = campaign.enrolled ? campaign.enrolled.length : 0;
  const maxPlayers = campaign.maxPlayers || 4;
  card.querySelector('.left').textContent = `👥 ${enrolled}/${maxPlayers} jogadores`;
  
  return card;
}

function loadActiveCampaigns() {
  const list = document.getElementById('activeList');
  const userCampaigns = getUserCampaigns(currentUser.user);
  
  let campaigns = DATA.campaigns.filter(c =>
    c.status === 'approved' &&
    !c.finished &&
    c.master !== currentUser.user &&
    (!c.enrolled || !c.enrolled.includes(currentUser.user))
  );
  
  const searchTerm = document.getElementById('searchCampaigns').value.toLowerCase();
  const filterCat = document.getElementById('filterCategory').value;
  const filterSys = document.getElementById('filterSystem').value;
  
  if (searchTerm) {
    campaigns = campaigns.filter(c => 
      c.name.toLowerCase().includes(searchTerm) ||
      (c.desc && c.desc.toLowerCase().includes(searchTerm))
    );
  }
  
  if (filterCat) {
    campaigns = campaigns.filter(c => 
      c.categories && c.categories.includes(filterCat)
    );
  }
  
  if (filterSys) {
    campaigns = campaigns.filter(c => c.system === filterSys);
  }
  
  if (campaigns.length === 0) {
    list.innerHTML = '<div class="empty-state">🔭 Nenhuma campanha disponível</div>';
    return;
  }
  
  list.innerHTML = '';
  campaigns.forEach(campaign => {
    const card = createCampaignCard(campaign);
    const actions = card.querySelector('.actions');
    
    const enrolled = campaign.enrolled ? campaign.enrolled.length : 0;
    const maxPlayers = campaign.maxPlayers || 4;
    
    if (userCampaigns.length >= 2) {
      const btnFull = document.createElement('button');
      btnFull.className = 'btn ghost';
      btnFull.textContent = '🔒 Limite atingido';
      btnFull.disabled = true;
      actions.appendChild(btnFull);
    } else if (enrolled >= maxPlayers) {
      const btnFull = document.createElement('button');
      btnFull.className = 'btn ghost';
      btnFull.textContent = '🔒 Campanha cheia';
      btnFull.disabled = true;
      actions.appendChild(btnFull);
    } else {
      const btnEnroll = document.createElement('button');
      btnEnroll.className = 'btn success';
      btnEnroll.textContent = '✅ Participar';
      btnEnroll.onclick = () => enrollInCampaign(campaign.id);
      actions.appendChild(btnEnroll);
    }
    
    list.appendChild(card);
  });
}

function loadMyEnrollments() {
  const list = document.getElementById('myEnrollments');
  const campaigns = getUserCampaigns(currentUser.user);
  
  if (campaigns.length === 0) {
    list.innerHTML = '<div class="empty-state">🔭 Você não está em nenhuma campanha</div>';
    return;
  }
  
  list.innerHTML = '';
  campaigns.forEach(campaign => {
    const card = createCampaignCard(campaign);
    const actions = card.querySelector('.actions');
    
    const btnSheet = document.createElement('button');
    btnSheet.className = 'btn primary';
    btnSheet.textContent = '📋 Ficha';
    btnSheet.onclick = () => openSheetModal(campaign);
    actions.appendChild(btnSheet);
    
    const btnLeave = document.createElement('button');
    btnLeave.className = 'btn danger';
    btnLeave.textContent = '🚪 Sair';
    btnLeave.onclick = () => leaveCampaign(campaign.id);
    actions.appendChild(btnLeave);
    
    list.appendChild(card);
  });
}

async function enrollInCampaign(campaignId) {
  const campaign = DATA.campaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  const userCampaigns = getUserCampaigns(currentUser.user);
  if (userCampaigns.length >= 2) {
    showToast('Você já está em 2 campanhas', 'warning');
    return;
  }
  
  const enrolled = campaign.enrolled ? campaign.enrolled.length : 0;
  const maxPlayers = campaign.maxPlayers || 4;
  
  if (enrolled >= maxPlayers) {
    showToast('Campanha cheia', 'warning');
    return;
  }
  
  if (!campaign.enrolled) campaign.enrolled = [];
  campaign.enrolled.push(currentUser.user);
  
  if (campaign.sessions && campaign.sessions.length > 0) {
    campaign.sessions.forEach(sessionDate => {
      DATA.attendance.push({
        id: generateId(),
        campaign: campaign.id,
        campaignName: campaign.name,
        user: currentUser.user,
        session: sessionDate,
        status: 'pending',
        reason: ''
      });
    });
  }
  
  saveData();
  showToast('Inscrição realizada!', 'success');
  loadPlayerView();
  populateChatCampaigns();
}

async function leaveCampaign(campaignId) {
  if (!confirm('Deseja realmente sair desta campanha?')) return;
  
  const campaign = DATA.campaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  campaign.enrolled = campaign.enrolled.filter(u => u !== currentUser.user);
  DATA.attendance = DATA.attendance.filter(a => 
    !(a.campaign === campaignId && a.user === currentUser.user)
  );
  
  DATA.characterSheets = DATA.characterSheets.filter(s =>
    !(s.campaign === campaignId && s.user === currentUser.user)
  );
  
  saveData();
  showToast('Você saiu da campanha', 'info');
  loadPlayerView();
  populateChatCampaigns();
}

// ===== ATTENDANCE =====
function loadAttendanceList() {
  const list = document.getElementById('attendanceList');
  const userAttendance = DATA.attendance.filter(a => 
    a.user === currentUser.user && a.status === 'pending'
  );
  
  if (userAttendance.length === 0) {
    list.innerHTML = '<div class="empty-state">✅ Nenhuma confirmação pendente</div>';
    return;
  }
  
  list.innerHTML = '';
  userAttendance.forEach(att => {
    const campaign = DATA.campaigns.find(c => c.id === att.campaign);
    if (!campaign) return;
    
    const card = document.createElement('div');
    card.className = 'card attendance-card';
    
    const sessionDate = new Date(att.session);
    card.innerHTML = `
      <h4>${campaign.name}</h4>
      <p class="muted small">📅 ${sessionDate.toLocaleString('pt-BR')}</p>
      <div class="status-badge pending">⏳ Aguardando confirmação</div>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const btnConfirm = document.createElement('button');
    btnConfirm.className = 'btn success';
    btnConfirm.textContent = '✅ Confirmar';
    btnConfirm.onclick = () => openAttendanceModal(campaign, att.session);
    actions.appendChild(btnConfirm);
    
    card.appendChild(actions);
    list.appendChild(card);
  });
}

function openAttendanceModal(campaign, sessionDate) {
  currentAttendanceData = { campaign, sessionDate };
  const modal = document.getElementById('attendanceModal');
  
  document.getElementById('modalTitle').textContent = '📅 Confirmar Presença';
  document.getElementById('modalCampaign').textContent = campaign.name;
  
  const sessionTime = new Date(sessionDate);
  document.getElementById('modalSession').textContent = sessionTime.toLocaleString('pt-BR');
  
  document.getElementById('reasonSection').style.display = 'none';
  document.getElementById('btnSubmitAttendance').style.display = 'none';
  document.getElementById('absenceReason').value = '';
  
  modal.classList.add('active');
}

function closeAttendanceModal() {
  document.getElementById('attendanceModal').classList.remove('active');
  currentAttendanceData = null;
}

async function confirmPresence() {
  if (!currentAttendanceData) return;
  const { campaign, sessionDate } = currentAttendanceData;
  
  let attendance = DATA.attendance.find(a =>
    a.campaign === campaign.id &&
    a.user === currentUser.user &&
    a.session === sessionDate
  );
  
  if (attendance) {
    attendance.status = 'confirmed';
    attendance.reason = '';
  }
  
  currentUser.sessionsAttended = (currentUser.sessionsAttended || 0) + 1;
  
  saveData();
  showToast('Presença confirmada!', 'success');
  closeAttendanceModal();
  loadPlayerView();
  checkAchievements();
}

function showAbsenceForm() {
  document.getElementById('reasonSection').style.display = 'block';
  document.getElementById('btnSubmitAttendance').style.display = 'inline-block';
}

async function confirmAbsence() {
  if (!currentAttendanceData) return;
  
  const reason = document.getElementById('absenceReason').value.trim();
  if (!reason) {
    showToast('Por favor, informe o motivo da ausência', 'warning');
    return;
  }
  
  const { campaign, sessionDate } = currentAttendanceData;
  
  let attendance = DATA.attendance.find(a =>
    a.campaign === campaign.id &&
    a.user === currentUser.user &&
    a.session === sessionDate
  );
  
  if (attendance) {
    attendance.status = 'absent';
    attendance.reason = reason;
  }
  
  saveData();
  showToast('Ausência registrada', 'info');
  closeAttendanceModal();
  loadPlayerView();
}

// ===== CHARACTER SHEETS =====
function openSheetModal(campaign) {
  currentSheetCampaign = campaign;
  const modal = document.getElementById('sheetModal');
  
  document.getElementById('sheetCampaignName').textContent = campaign.name;
  
  const sheet = DATA.characterSheets.find(s => 
    s.campaign === campaign.id && s.user === currentUser.user
  );
  
  if (sheet) {
    document.getElementById('sheetUploadSection').style.display = 'none';
    document.getElementById('sheetViewSection').style.display = 'block';
    document.getElementById('sheetImage').src = sheet.image;
    
    const statusDiv = document.getElementById('sheetStatus');
    if (sheet.status === 'pending') {
      statusDiv.innerHTML = '<div class="status-badge pending">⏳ Aguardando aprovação</div>';
    } else if (sheet.status === 'approved') {
      statusDiv.innerHTML = '<div class="status-badge confirmed">✅ Ficha aprovada</div>';
    } else if (sheet.status === 'rejected') {
      statusDiv.innerHTML = '<div class="status-badge absent">❌ Ficha rejeitada</div>';
    }
  } else {
    document.getElementById('sheetUploadSection').style.display = 'block';
    document.getElementById('sheetViewSection').style.display = 'none';
  }
  
  modal.classList.add('active');
}

function closeSheetModal() {
  document.getElementById('sheetModal').classList.remove('active');
  currentSheetCampaign = null;
}

async function uploadSheet() {
  if (!currentSheetCampaign) return;
  
  const file = document.getElementById('sheetFile').files[0];
  if (!file) {
    showToast('Selecione uma imagem', 'warning');
    return;
  }
  
  const imageUrl = await fileToDataURL(file);
  
  const existingSheet = DATA.characterSheets.find(s =>
    s.campaign === currentSheetCampaign.id && s.user === currentUser.user
  );
  
  if (existingSheet) {
    existingSheet.image = imageUrl;
    existingSheet.status = 'pending';
    existingSheet.updatedAt = new Date().toISOString();
  } else {
    DATA.characterSheets.push({
      id: generateId(),
      campaign: currentSheetCampaign.id,
      user: currentUser.user,
      image: imageUrl,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }
  
  saveData();
  showToast('Ficha enviada para aprovação!', 'success');
  closeSheetModal();
  
  const master = DATA.users.find(u => u.user === currentSheetCampaign.master);
  if (master) {
    addNotification(master.user, 'Nova Ficha', `${currentUser.user} enviou uma ficha em "${currentSheetCampaign.name}"`);
  }
}

// ===== MASTER VIEW =====
function loadMasterView() {
  if (currentUser.role !== 'master' && currentUser.role !== 'admin') return;
  
  loadMasterCampaigns();
  updateMasterCampaignCount();
  populateTimeGrid();
  populateCategoryFilters();
  loadRoomSchedule();
}

function updateMasterCampaignCount() {
  const campaigns = DATA.campaigns.filter(c => 
    c.master === currentUser.user && !c.finished
  );
  const maxCampaigns = currentUser.masterTier === 'Gold' ? 5 : 2;
  document.getElementById('masterCampaignCount').textContent = `${campaigns.length}/${maxCampaigns}`;
  
  const tierInfo = document.getElementById('masterTierInfo');
  if (currentUser.masterTier) {
    tierInfo.textContent = `Tier: ${currentUser.masterTier}`;
  }
}

function loadRoomSchedule() {
  const grid = document.getElementById('roomScheduleGrid');
  grid.innerHTML = '';
  
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th style="padding:8px;border:1px solid rgba(255,255,255,0.1);">Horário</th>';
  days.forEach(day => {
    const th = document.createElement('th');
    th.textContent = day;
    th.style.padding = '8px';
    th.style.border = '1px solid rgba(255,255,255,0.1)';
    th.style.fontSize = '12px';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  times.forEach(time => {
    const row = document.createElement('tr');
    const timeCell = document.createElement('td');
    timeCell.textContent = time;
    timeCell.style.padding = '8px';
    timeCell.style.border = '1px solid rgba(255,255,255,0.1)';
    timeCell.style.fontWeight = '600';
    timeCell.style.fontSize = '12px';
    row.appendChild(timeCell);
    
    days.forEach(day => {
      const cell = document.createElement('td');
      cell.style.padding = '8px';
      cell.style.border = '1px solid rgba(255,255,255,0.1)';
      cell.style.textAlign = 'center';
      cell.style.fontSize = '11px';
      
      const campaigns = DATA.campaigns.filter(c => 
        !c.finished && 
        c.schedule && 
        c.schedule.includes(time) &&
        c.master !== currentUser.user
      );
      
      if (campaigns.length > 0) {
        cell.style.background = 'rgba(239,68,68,0.2)';
        cell.textContent = '🔒';
        cell.title = campaigns.map(c => c.name).join(', ');
      } else {
        cell.style.background = 'rgba(16,185,129,0.1)';
        cell.textContent = '✓';
      }
      
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  
  grid.appendChild(table);
}

function populateTimeGrid() {
  const grid = document.getElementById('timeGrid');
  grid.innerHTML = '';
  
  const times = [
    '08:00', '10:00', '12:00', '14:00', 
    '16:00', '18:00', '20:00', '22:00'
  ];
  
  times.forEach(time => {
    const btn = document.createElement('button');
    btn.className = 'time-btn';
    btn.textContent = time;
    btn.type = 'button';
    btn.onclick = () => toggleTimeSlot(time, btn);
    grid.appendChild(btn);
  });
}

function toggleTimeSlot(time, btn) {
  const index = selectedTimeSlots.indexOf(time);
  
  if (index > -1) {
    selectedTimeSlots.splice(index, 1);
    btn.classList.remove('selected');
  } else {
    if (selectedTimeSlots.length >= 2) {
      showToast('Máximo de 2 horários', 'warning');
      return;
    }
    selectedTimeSlots.push(time);
    btn.classList.add('selected');
  }
}

function loadMasterCampaigns() {
  const list = document.getElementById('masterList');
  const campaigns = DATA.campaigns.filter(c => 
    c.master === currentUser.user && !c.finished
  );
  
  if (campaigns.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhuma campanha criada ainda</div>';
    return;
  }
  
  list.innerHTML = '';
  campaigns.forEach(campaign => {
    const card = createCampaignCard(campaign);
    const actions = card.querySelector('.actions');
    
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn ghost';
    btnEdit.textContent = '✏️ Editar';
    btnEdit.onclick = () => openEditModal(campaign);
    actions.appendChild(btnEdit);
    
    const btnManage = document.createElement('button');
    btnManage.className = 'btn primary';
    btnManage.textContent = '📋 Gerenciar';
    btnManage.onclick = () => openManageCampaignModal(campaign.id);
    actions.appendChild(btnManage);
    
    list.appendChild(card);
  });
}

async function createCampaign() {
  const name = document.getElementById('campName').value.trim();
  const system = document.getElementById('campSystem').value.trim();
  const desc = document.getElementById('campDesc').value.trim();
  const maxPlayers = parseInt(document.getElementById('campMaxPlayers').value) || 4;
  
  if (!name) {
    showToast('Digite o nome da campanha', 'warning');
    return;
  }
  
  const campaigns = DATA.campaigns.filter(c => 
    c.master === currentUser.user && !c.finished
  );
  const maxCampaigns = currentUser.masterTier === 'Gold' ? 5 : 2;
  
  if (campaigns.length >= maxCampaigns) {
    showToast(`Limite de ${maxCampaigns} campanhas atingido`, 'warning');
    return;
  }
  
  const categories = [];

  document.querySelectorAll('.catChk:checked').forEach(cb => {
    categories.push(cb.value);
  });
  
  const customCats = document.getElementById('catChips').querySelectorAll('.chip');
  customCats.forEach(chip => {
    categories.push(chip.textContent.replace('×', '').trim());
  });
  
  const campaign = {
    id: generateId(),
    name,
    system,
    desc,
    master: currentUser.user,
    status: 'approved',
    enrolled: [],
    finished: false,
    started: false,
    sessions: [],
    schedule: selectedTimeSlots,
    categories: categories.slice(0, 3),
    maxPlayers,
    createdAt: new Date().toISOString()
  };
  
  DATA.campaigns.push(campaign);
  saveData();
  
  showToast('Campanha criada com sucesso!', 'success');
  clearCampaignForm();
  loadMasterCampaigns();
  updateMasterCampaignCount();
  loadRoomSchedule();
}

function clearCampaignForm() {
  document.getElementById('campName').value = '';
  document.getElementById('campSystem').value = '';
  document.getElementById('campDesc').value = '';
  document.getElementById('campMaxPlayers').value = '4';
  document.getElementById('catFree').value = '';
  document.querySelectorAll('.catChk').forEach(cb => cb.checked = false);
  document.getElementById('catChips').innerHTML = '';
  selectedTimeSlots = [];
  document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('selected'));
}

function openEditModal(campaign) {
  currentEditCampaign = campaign;
  document.getElementById('editName').value = campaign.name;
  document.getElementById('editSystem').value = campaign.system || '';
  document.getElementById('editDesc').value = campaign.desc || '';
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
  currentEditCampaign = null;
}

async function saveEditCampaign() {
  if (!currentEditCampaign) return;
  
  currentEditCampaign.name = document.getElementById('editName').value.trim();
  currentEditCampaign.system = document.getElementById('editSystem').value.trim();
  currentEditCampaign.desc = document.getElementById('editDesc').value.trim();
  
  saveData();
  showToast('Campanha atualizada!', 'success');
  closeEditModal();
  loadMasterCampaigns();
}

async function finishCampaign() {
  if (!currentEditCampaign) return;
  if (!confirm('Finalizar esta campanha permanentemente?')) return;
  
  currentEditCampaign.finished = true;
  currentEditCampaign.finishedAt = new Date().toISOString();
  
  saveData();
  showToast('Campanha finalizada', 'info');
  closeEditModal();
  loadMasterCampaigns();
  updateMasterCampaignCount();
}

// ===== MANAGE CAMPAIGN MODAL =====
function openManageCampaignModal(campaignId) {
  const campaign = DATA.campaigns.find(c => c.id === campaignId);
  if (!campaign) return;
  
  currentManageCampaign = campaign;
  const modal = document.getElementById('manageCampaignModal');
  
  document.getElementById('manageCampaignName').textContent = campaign.name;
  
  const playerCount = campaign.enrolled ? campaign.enrolled.length : 0;
  document.getElementById('manageCampaignPlayerCount').textContent = playerCount;
  
  const playersDiv = document.getElementById('manageCampaignPlayers');
  playersDiv.innerHTML = '';
  
  if (!campaign.enrolled || campaign.enrolled.length === 0) {
    playersDiv.innerHTML = '<div class="empty-state">Nenhum jogador inscrito</div>';
  } else {
    campaign.enrolled.forEach(username => {
      const user = DATA.users.find(u => u.user === username);
      const sheet = DATA.characterSheets.find(s => 
        s.campaign === campaignId && s.user === username
      );
      
      const playerCard = document.createElement('div');
      playerCard.className = 'card user-card';
      playerCard.style.marginBottom = '12px';
      
      let sheetStatus = '';
      if (sheet) {
        if (sheet.status === 'pending') {
          sheetStatus = '<span class="status-badge pending">⏳ Ficha pendente</span>';
        } else if (sheet.status === 'approved') {
          sheetStatus = '<span class="status-badge confirmed">✅ Ficha aprovada</span>';
        } else if (sheet.status === 'rejected') {
          sheetStatus = '<span class="status-badge absent">❌ Ficha rejeitada</span>';
        }
      } else {
        sheetStatus = '<span class="muted small">📋 Sem ficha</span>';
      }
      
      playerCard.innerHTML = `
        <div class="left">
          <img src="${user ? user.avatar : DEFAULT_AVATAR}" class="avatar-sm" alt="${username}">
          <div>
            <div class="name">${username}</div>
            ${sheetStatus}
          </div>
        </div>
        <div class="actions">
          ${sheet ? `<button class="btn ghost small" onclick="viewSheetModal('${campaignId}', '${username}')">👁️ Ver Ficha</button>` : ''}
        </div>
      `;
      
      playersDiv.appendChild(playerCard);
    });
  }
  
  modal.classList.add('active');
}

function closeManageCampaignModal() {
  document.getElementById('manageCampaignModal').classList.remove('active');
  currentManageCampaign = null;
}

async function startCampaign() {
  if (!currentManageCampaign) return;
  
  const sheets = DATA.characterSheets.filter(s => 
    s.campaign === currentManageCampaign.id
  );
  
  const allApproved = currentManageCampaign.enrolled.every(username => {
    const sheet = sheets.find(s => s.user === username);
    return sheet && sheet.status === 'approved';
  });
  
  if (!allApproved) {
    showToast('Todas as fichas devem estar aprovadas', 'warning');
    return;
  }
  
  currentManageCampaign.started = true;
  currentManageCampaign.startedAt = new Date().toISOString();
  
  saveData();
  showToast('Campanha iniciada!', 'success');
  closeManageCampaignModal();
  
  currentManageCampaign.enrolled.forEach(username => {
    addNotification(username, 'Campanha Iniciada', `A campanha "${currentManageCampaign.name}" foi iniciada!`);
  });
}

// ===== VIEW SHEET MODAL =====
function viewSheetModal(campaignId, username) {
  const sheet = DATA.characterSheets.find(s => 
    s.campaign === campaignId && s.user === username
  );
  
  if (!sheet) return;
  
  currentViewSheet = sheet;
  const modal = document.getElementById('viewSheetModal');
  
  document.getElementById('viewSheetPlayerName').textContent = username;
  document.getElementById('viewSheetImage').src = sheet.image;
  
  modal.classList.add('active');
}

function closeViewSheetModal() {
  document.getElementById('viewSheetModal').classList.remove('active');
  currentViewSheet = null;
}

async function approveSheet() {
  if (!currentViewSheet) return;
  
  currentViewSheet.status = 'approved';
  saveData();
  
  showToast('Ficha aprovada!', 'success');
  closeViewSheetModal();
  
  addNotification(currentViewSheet.user, 'Ficha Aprovada', 'Sua ficha foi aprovada pelo mestre!');
  
  if (currentManageCampaign) {
    openManageCampaignModal(currentManageCampaign.id);
  }
}

async function rejectSheet() {
  if (!currentViewSheet) return;
  
  currentViewSheet.status = 'rejected';
  saveData();
  
  showToast('Ficha rejeitada', 'info');
  closeViewSheetModal();
  
  addNotification(currentViewSheet.user, 'Ficha Rejeitada', 'Sua ficha foi rejeitada. Por favor, envie uma nova versão.');
  
  if (currentManageCampaign) {
    openManageCampaignModal(currentManageCampaign.id);
  }
}

// ===== ADMIN VIEW =====
function loadAdminView() {
  if (currentUser.role !== 'admin') return;
  
  loadAdminStats();
  loadPendingCampaigns();
  loadMasterRequests();
  loadMastersManagement();
  loadUsersList();
  loadCampaignPlayers();
  loadAdminRoomSchedule();
}

function loadAdminStats() {
  document.getElementById('statUsers').textContent = DATA.users.length;
  document.getElementById('statCampaigns').textContent = DATA.campaigns.length;
  document.getElementById('statPending').textContent = 
    DATA.campaigns.filter(c => c.status === 'pending').length;
  document.getElementById('statActive').textContent = 
    DATA.campaigns.filter(c => c.status === 'approved' && !c.finished).length;
}

function loadAdminRoomSchedule() {
  const container = document.getElementById('adminRoomSchedule');
  container.innerHTML = '';
  
  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th style="padding:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(168,85,247,0.1);">Horário</th>';
  days.forEach(day => {
    const th = document.createElement('th');
    th.textContent = day;
    th.style.padding = '10px';
    th.style.border = '1px solid rgba(255,255,255,0.1)';
    th.style.fontSize = '13px';
    th.style.background = 'rgba(168,85,247,0.1)';
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  times.forEach(time => {
    const row = document.createElement('tr');
    const timeCell = document.createElement('td');
    timeCell.textContent = time;
    timeCell.style.padding = '10px';
    timeCell.style.border = '1px solid rgba(255,255,255,0.1)';
    timeCell.style.fontWeight = '700';
    timeCell.style.background = 'rgba(255,255,255,0.03)';
    row.appendChild(timeCell);
    
    days.forEach(day => {
      const cell = document.createElement('td');
      cell.style.padding = '10px';
      cell.style.border = '1px solid rgba(255,255,255,0.1)';
      cell.style.textAlign = 'center';
      cell.style.fontSize = '12px';
      
      const campaigns = DATA.campaigns.filter(c => 
        !c.finished && 
        c.schedule && 
        c.schedule.includes(time)
      );
      
      if (campaigns.length > 0) {
        cell.style.background = 'rgba(239,68,68,0.2)';
        cell.innerHTML = `<div style="font-size:18px;">🔒</div><div style="font-size:10px;color:var(--muted);">${campaigns.length} campanha(s)</div>`;
        cell.title = campaigns.map(c => `${c.name} (${c.master})`).join('\n');
      } else {
        cell.style.background = 'rgba(16,185,129,0.1)';
        cell.innerHTML = '<div style="font-size:18px;">✓</div><div style="font-size:10px;color:var(--muted);">Livre</div>';
      }
      
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  
  container.appendChild(table);
}

function loadPendingCampaigns() {
  const list = document.getElementById('pendingList');
  const pending = DATA.campaigns.filter(c => c.status === 'pending');
  
  if (pending.length === 0) {
    list.innerHTML = '<div class="empty-state">✅ Nenhuma aprovação pendente</div>';
    return;
  }
  
  list.innerHTML = '';
  pending.forEach(campaign => {
    const card = createCampaignCard(campaign);
    const actions = card.querySelector('.actions');
    
    const btnApprove = document.createElement('button');
    btnApprove.className = 'btn success';
    btnApprove.textContent = '✅ Aprovar';
    btnApprove.onclick = () => approveCampaign(campaign.id);
    actions.appendChild(btnApprove);
    
    const btnReject = document.createElement('button');
    btnReject.className = 'btn danger';
    btnReject.textContent = '❌ Rejeitar';
    btnReject.onclick = () => rejectCampaign(campaign.id);
    actions.appendChild(btnReject);
    
    list.appendChild(card);
  });
}

async function approveCampaign(id) {
  const campaign = DATA.campaigns.find(c => c.id === id);
  if (!campaign) return;
  
  campaign.status = 'approved';
  saveData();
  showToast('Campanha aprovada!', 'success');
  loadAdminView();
  
  addNotification(campaign.master, 'Campanha Aprovada', `Sua campanha "${campaign.name}" foi aprovada!`);
}

async function rejectCampaign(id) {
  if (!confirm('Rejeitar esta campanha?')) return;
  
  const campaign = DATA.campaigns.find(c => c.id === id);
  if (campaign) {
    addNotification(campaign.master, 'Campanha Rejeitada', `Sua campanha "${campaign.name}" foi rejeitada.`);
  }
  
  DATA.campaigns = DATA.campaigns.filter(c => c.id !== id);
  saveData();
  showToast('Campanha rejeitada', 'info');
  loadAdminView();
}

function loadMasterRequests() {
  const list = document.getElementById('masterRequestsList');
  const requests = DATA.masterRequests.filter(r => r.status === 'pending');
  
  if (requests.length === 0) {
    list.innerHTML = '<div class="empty-state">✅ Nenhuma requisição pendente</div>';
    return;
  }
  
  list.innerHTML = '';
  requests.forEach(req => {
    const user = DATA.users.find(u => u.user === req.user);
    if (!user) return;
    
    const card = document.createElement('div');
    card.className = 'card user-card';
    card.innerHTML = `
      <div class="left">
        <img src="${user.avatar}" class="avatar-sm" alt="${user.user}">
        <div>
          <div class="name">${user.user}</div>
          <div class="muted small">Sessões: ${user.sessionsAttended || 0}</div>
          <div class="muted small">Data: ${new Date(req.date).toLocaleDateString('pt-BR')}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn success" onclick="approveMasterRequest('${req.id}')">✅ Aprovar</button>
        <button class="btn danger" onclick="rejectMasterRequest('${req.id}')">❌ Rejeitar</button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function approveMasterRequest(requestId) {
  const request = DATA.masterRequests.find(r => r.id === requestId);
  if (!request) return;
  
  const user = DATA.users.find(u => u.user === request.user);
  if (!user) return;
  
  user.role = 'master';
  user.masterTier = 'Bronze';
  request.status = 'approved';
  
  saveData();
  showToast(`${user.user} agora é Mestre!`, 'success');
  loadAdminView();
  
  addNotification(user.user, 'Parabéns!', 'Você foi aprovado como Mestre!');
}

async function rejectMasterRequest(requestId) {
  if (!confirm('Rejeitar esta requisição?')) return;
  
  const request = DATA.masterRequests.find(r => r.id === requestId);
  if (request) {
    request.status = 'rejected';
    addNotification(request.user, 'Requisição Rejeitada', 'Sua requisição para se tornar Mestre foi rejeitada.');
  }
  
  saveData();
  showToast('Requisição rejeitada', 'info');
  loadAdminView();
}

function loadMastersManagement() {
  const list = document.getElementById('mastersManagement');
  const masters = DATA.users.filter(u => u.role === 'master');
  
  if (masters.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum mestre cadastrado</div>';
    return;
  }
  
  list.innerHTML = '';
  masters.forEach(master => {
    const campaigns = DATA.campaigns.filter(c => c.master === master.user && !c.finished).length;
    
    const card = document.createElement('div');
    card.className = 'card user-card';
    card.innerHTML = `
      <div class="left">
        <img src="${master.avatar}" class="avatar-sm" alt="${master.user}">
        <div>
          <div class="name">🧙 ${master.user}</div>
          <div class="muted small">Tier: ${master.masterTier || 'Bronze'}</div>
          <div class="muted small">Campanhas: ${campaigns}</div>
        </div>
      </div>
      <div class="actions">
        <select onchange="changeMasterTier('${master.user}', this.value)" style="padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#fff;font-size:12px;">
          <option value="Bronze" ${master.masterTier === 'Bronze' ? 'selected' : ''}>Bronze (2 campanhas)</option>
          <option value="Silver" ${master.masterTier === 'Silver' ? 'selected' : ''}>Silver (3 campanhas)</option>
          <option value="Gold" ${master.masterTier === 'Gold' ? 'selected' : ''}>Gold (5 campanhas)</option>
        </select>
        <button class="btn danger small" onclick="demoteMaster('${master.user}')">⬇️ Rebaixar</button>
      </div>
    `;
    list.appendChild(card);
  });
}

function changeMasterTier(username, tier) {
  const user = DATA.users.find(u => u.user === username);
  if (!user) return;
  
  user.masterTier = tier;
  saveData();
  showToast(`Tier de ${username} alterado para ${tier}`, 'success');
  loadAdminView();
  
  addNotification(username, 'Tier Atualizado', `Seu tier foi alterado para ${tier}!`);
}

function demoteMaster(username) {
  if (!confirm(`Rebaixar ${username} para jogador?`)) return;
  
  const user = DATA.users.find(u => u.user === username);
  if (!user) return;
  
  user.role = 'player';
  user.masterTier = null;
  
  saveData();
  showToast(`${username} rebaixado para jogador`, 'info');
  loadAdminView();
  
  addNotification(username, 'Papel Alterado', 'Você foi rebaixado para jogador.');
}

function loadUsersList() {
  const list = document.getElementById('usersList');
  const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
  
  let users = DATA.users.filter(u => u.user !== 'host');
  
  if (searchTerm) {
    users = users.filter(u => u.user.toLowerCase().includes(searchTerm));
  }
  
  if (users.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum usuário encontrado</div>';
    return;
  }
  
  list.innerHTML = '';
  users.forEach(user => {
    const card = document.createElement('div');
    card.className = 'card user-card';
    
    const roleIcon = user.role === 'admin' ? '👑' : user.role === 'master' ? '🧙' : '🎮';
    
    card.innerHTML = `
      <div class="left">
        <img src="${user.avatar}" class="avatar-sm" alt="${user.user}">
        <div>
          <div class="name">${roleIcon} ${user.user}</div>
          <div class="muted small">Sessões: ${user.sessionsAttended || 0}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn ghost small" onclick="deleteUser('${user.user}')">🗑️ Remover</button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function deleteUser(username) {
  if (!confirm(`Remover usuário ${username}?`)) return;
  
  DATA.users = DATA.users.filter(u => u.user !== username);
  DATA.campaigns.forEach(c => {
    if (c.enrolled) {
      c.enrolled = c.enrolled.filter(u => u !== username);
    }
  });
  DATA.attendance = DATA.attendance.filter(a => a.user !== username);
  DATA.characterSheets = DATA.characterSheets.filter(s => s.user !== username);
  
  saveData();
  showToast('Usuário removido', 'info');
  loadAdminView();
}

function loadCampaignPlayers() {
  const list = document.getElementById('campaignPlayersList');
  const campaigns = DATA.campaigns.filter(c => c.status === 'approved' && !c.finished);
  
  if (campaigns.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhuma campanha ativa</div>';
    return;
  }
  
  list.innerHTML = '';
  campaigns.forEach(campaign => {
    const card = document.createElement('div');
    card.className = 'card';
    const playerCount = campaign.enrolled ? campaign.enrolled.length : 0;
    const maxPlayers = campaign.maxPlayers || 4;
    
    card.innerHTML = `
      <h4>${campaign.name}</h4>
      <p class="muted small">Mestre: ${campaign.master}</p>
      <p class="muted small">👥 ${playerCount}/${maxPlayers} jogadores inscritos</p>
    `;
    
    if (campaign.enrolled && campaign.enrolled.length > 0) {
      const playersList = document.createElement('div');
      playersList.className = 'chips-row';
      playersList.style.marginTop = '12px';
      
      campaign.enrolled.forEach(username => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = username;
        playersList.appendChild(chip);
      });
      
      card.appendChild(playersList);
    }
    
    list.appendChild(card);
  });
}

// ===== MASTER REQUEST VIEW =====
function loadMasterRequestView() {
  checkMasterRequirements();
  loadExamQuestions();
}

function checkMasterRequirements() {
  const status = document.getElementById('requestStatus');
  const sessionsAttended = currentUser.sessionsAttended || 0;
  const reqCount1 = document.getElementById('reqCount1');
  const reqIcon1 = document.getElementById('reqIcon1');
  
  reqCount1.textContent = `${Math.min(sessionsAttended, 3)}/3`;
  reqIcon1.textContent = sessionsAttended >= 3 ? '✅' : '⏳';
  
  const existingRequest = DATA.masterRequests.find(r => r.user === currentUser.user);
  
  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      status.innerHTML = '<div class="card warning"><h4>⏳ Requisição Pendente</h4><p>Sua requisição está sendo analisada pelos administradores.</p></div>';
      document.querySelector('.exam-section').style.display = 'none';
      document.getElementById('requestSubmitSection').style.display = 'none';
    } else if (existingRequest.status === 'approved') {
      status.innerHTML = '<div class="card success"><h4>✅ Aprovado!</h4><p>Você já é um Mestre!</p></div>';
      document.querySelector('.exam-section').style.display = 'none';
      document.getElementById('requestSubmitSection').style.display = 'none';
    } else if (existingRequest.status === 'rejected') {
      status.innerHTML = '<div class="card danger"><h4>❌ Requisição Rejeitada</h4><p>Sua requisição foi rejeitada. Você pode tentar novamente.</p></div>';
      document.querySelector('.exam-section').style.display = 'block';
      document.getElementById('requestSubmitSection').style.display = 'none';
    }
  } else {
    status.innerHTML = '';
    document.querySelector('.exam-section').style.display = 'block';
  }
}

const examQuestions = [
  {
    question: 'O que significa RPG?',
    options: ['Role Playing Game', 'Real Player Game', 'Random Play Game', 'Role Power Game'],
    correct: 0
  },
  {
    question: 'Qual é o papel principal do Mestre?',
    options: ['Ganhar dos jogadores', 'Narrar e arbitrar o jogo', 'Jogar dados', 'Criar personagens'],
    correct: 1
  },
  {
    question: 'O que é um D20?',
    options: ['Um tipo de magia', 'Um dado de 20 lados', 'Um personagem', 'Uma classe'],
    correct: 1
  },
  {
    question: 'O que significa "sessão zero"?',
    options: ['Primeira aventura', 'Reunião de planejamento inicial', 'Última sessão', 'Sessão cancelada'],
    correct: 1
  },
  {
    question: 'O que é importante em uma boa narrativa de RPG?',
    options: ['Matar todos os personagens', 'Colaboração e diversão', 'Ganhar sempre', 'Seguir regras rigidamente'],
    correct: 1
  },
  {
    question: 'Como um mestre deve lidar com conflitos entre jogadores?',
    options: ['Ignorar', 'Mediar com imparcialidade', 'Expulsar todos', 'Tomar partido'],
    correct: 1
  },
  {
    question: 'O que é "railroading" e por que deve ser evitado?',
    options: ['Uma técnica avançada', 'Forçar uma história única sem escolhas', 'Um tipo de dado', 'Uma classe de personagem'],
    correct: 1
  },
  {
    question: 'Qual a importância da "regra de ouro" no RPG?',
    options: ['Sempre rolar dados', 'Diversão vem antes das regras', 'Nunca mudar regras', 'Mestre sempre vence'],
    correct: 1
  },
  {
    question: 'O que é importante ao criar um encontro balanceado?',
    options: ['Sempre ser impossível', 'Considerar nível e capacidades dos jogadores', 'Ser sempre fácil', 'Não planejar'],
    correct: 1
  },
  {
    question: 'Como lidar com um jogador problemático?',
    options: ['Ignorar sempre', 'Conversar em particular primeiro', 'Expulsar imediatamente', 'Punir o personagem'],
    correct: 1
  }
];

function loadExamQuestions() {
  const container = document.getElementById('examQuestions');
  container.innerHTML = '';
  
  examQuestions.forEach((q, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'exam-question';
    questionDiv.innerHTML = `<p><strong>Pergunta ${index + 1}:</strong> ${q.question}</p>`;
    
    q.options.forEach((opt, optIndex) => {
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="radio" name="q${index}" value="${optIndex}">
        ${opt}
      `;
      questionDiv.appendChild(label);
    });
    
    container.appendChild(questionDiv);
  });
}

async function submitExam() {
  let correct = 0;
  
  examQuestions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    if (selected && parseInt(selected.value) === q.correct) {
      correct++;
    }
  });
  
  const results = document.getElementById('examResults');
  
  if (correct >= 7) {
    results.innerHTML = '<div class="card success"><h4>✅ Prova Aprovada!</h4><p>Você acertou ' + correct + ' de 10 questões.</p></div>';
    
    const sessionsOk = (currentUser.sessionsAttended || 0) >= 3;
    
    if (sessionsOk) {
      document.getElementById('requestSubmitSection').style.display = 'block';
    } else {
      results.innerHTML += '<div class="card warning" style="margin-top:16px;"><h4>⏳ Aguardando Requisito</h4><p>Você ainda precisa participar de mais sessões antes de enviar a requiição.</p></div>';
    }
    
    return true;
  } else {
    results.innerHTML = '<div class="card danger"><h4>❌ Prova Reprovada</h4><p>Você precisa acertar pelo menos 7 questões. Acertou apenas ' + correct + '.</p></div>';
    document.getElementById('requestSubmitSection').style.display = 'none';
    return false;
  }
}

async function submitMasterRequest() {
  const sessionsOk = (currentUser.sessionsAttended || 0) >= 3;
  
  if (!sessionsOk) {
    showToast('Complete os requisitos primeiro', 'warning');
    return;
  }
  
  const request = {
    id: generateId(),
    user: currentUser.user,
    date: new Date().toISOString(),
    status: 'pending',
    examScore: 7
  };
  
  DATA.masterRequests.push(request);
  saveData();
  
  showToast('Requisição enviada para aprovação!', 'success');
  
  setTimeout(() => {
    checkMasterRequirements();
  }, 1000);
}

// ===== ACHIEVEMENTS =====
function checkAchievements() {
  if (!currentUser) return;
  
  const achievements = [
    { name: 'Primeira Sessão', condition: () => currentUser.sessionsAttended >= 1, icon: '🎯' },
    { name: 'Veterano', condition: () => currentUser.sessionsAttended >= 5, icon: '⭐' },
    { name: 'Lendário', condition: () => currentUser.sessionsAttended >= 10, icon: '👑' },
    { name: 'Primeiro Mestre', condition: () => currentUser.role === 'master', icon: '🧙' }
  ];
  
  achievements.forEach(ach => {
    if (ach.condition() && !hasAchievement(ach.name)) {
      grantAchievement(ach.name, ach.icon);
    }
  });
}

function hasAchievement(name) {
  return currentUser.achievements && currentUser.achievements.some(a => a.name === name);
}

function grantAchievement(name, icon) {
  if (!currentUser.achievements) currentUser.achievements = [];
  currentUser.achievements.push({ name, icon, date: new Date().toISOString() });
  saveData();
  showToast(`${icon} ${name}`, 'success', 'Nova Conquista!');
  renderAchievementsBadges();
}

function renderAchievementsBadges() {
  const container = document.getElementById('achievementsBadges');
  container.innerHTML = '';
  
  if (!currentUser.achievements || currentUser.achievements.length === 0) return;
  
  currentUser.achievements.slice(0, 5).forEach(ach => {
    const badge = document.createElement('span');
    badge.className = 'achievement-badge';
    badge.textContent = ach.icon;
    badge.title = ach.name;
    container.appendChild(badge);
  });
}

function loadMyAchievements() {
  const list = document.getElementById('myAchievements');
  
  if (!currentUser.achievements || currentUser.achievements.length === 0) {
    list.innerHTML = '<div class="empty-state">Sem conquistas ainda</div>';
    return;
  }
  
  list.innerHTML = '';
  currentUser.achievements.forEach(ach => {
    const card = document.createElement('div');
    card.className = 'achievement-card';
    card.innerHTML = `
      <div class="achievement-icon">${ach.icon}</div>
      <div class="achievement-content">
        <div class="achievement-name">${ach.name}</div>
        <div class="achievement-description">${new Date(ach.date).toLocaleDateString('pt-BR')}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

// ===== RANKING =====
function loadRankingView() {
  loadTopPlayers();
  loadMyAchievements();
  updateRankingStats();
}

function updateRankingStats() {
  const activePlayers = DATA.users.filter(u => (u.sessionsAttended || 0) > 0);
  document.getElementById('rankingTotalPlayers').textContent = activePlayers.length;
  
  const totalSessions = activePlayers.reduce((sum, u) => sum + (u.sessionsAttended || 0), 0);
  document.getElementById('rankingTotalSessions').textContent = totalSessions;
  
  const avgPresence = activePlayers.length > 0 ? Math.round((totalSessions / activePlayers.length) * 10) / 10 : 0;
  document.getElementById('rankingAvgPresence').textContent = `${avgPresence * 10}%`;
}

function loadTopPlayers() {
  const list = document.getElementById('topPlayersList');
  const sorted = [...DATA.users]
    .filter(u => u.user !== 'host')
    .sort((a, b) => (b.sessionsAttended || 0) - (a.sessionsAttended || 0))
    .slice(0, 10);
  
  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state">Sem jogadores ainda</div>';
    return;
  }
  
  list.innerHTML = '';
  sorted.forEach((user, index) => {
    const card = document.createElement('div');
    card.className = 'ranking-card card';
    
    let positionClass = '';
    if (index === 0) positionClass = 'gold';
    else if (index === 1) positionClass = 'silver';
    else if (index === 2) positionClass = 'bronze';
    
    const campaigns = getUserCampaigns(user.user).length;
    
    card.innerHTML = `
      <div class="ranking-position ${positionClass}">#${index + 1}</div>
      <img src="${user.avatar}" class="ranking-avatar" alt="${user.user}">
      <div class="ranking-info">
        <div class="ranking-name">${user.user}</div>
        <div class="ranking-stats">
          <span class="ranking-stat">📅 ${user.sessionsAttended || 0} sessões</span>
          <span class="ranking-stat">🎲 ${campaigns} campanhas</span>
        </div>
      </div>
    `;
    
    list.appendChild(card);
  });
}

// ===== DICE ROLLER =====
function loadDiceView() {
  renderDiceHistory();
  renderMacros();
  setupDiceButtons();
}

function setupDiceButtons() {
  document.querySelectorAll('.dice-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.dice-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      selectedDiceType = this.dataset.dice;
    });
  });
}

function rollDice() {
  const count = parseInt(document.getElementById('diceCount').value) || 1;
  const modifier = parseInt(document.getElementById('diceModifier').value) || 0;
  const description = document.getElementById('diceDescription').value.trim();
  
  const sides = parseInt(selectedDiceType.substring(1));
  
  if (count < 1 || count > 20) {
    showToast('Quantidade deve ser entre 1 e 20', 'warning');
    return;
  }
  
  const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;
  
  const formula = `${count}${selectedDiceType}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''}`;
  
  lastRoll = {
    id: generateId(),
    user: currentUser.user,
    formula,
    dice: selectedDiceType,
    count,
    modifier,
    description,
    rolls,
    sum,
    total,
    timestamp: new Date().toISOString()
  };
  
  DATA.diceHistory.unshift(lastRoll);
  if (DATA.diceHistory.length > 50) {
    DATA.diceHistory = DATA.diceHistory.slice(0, 50);
  }
  
  saveData();
  displayDiceResult(lastRoll);
  renderDiceHistory();
}

function displayDiceResult(roll) {
  const resultDiv = document.getElementById('diceResult');
  resultDiv.style.display = 'block';
  
  const hasCritical = roll.dice === 'd20' && roll.rolls.some(r => r === 20 || r === 1);
  
  let rollsHTML = roll.rolls.map(r => {
    let className = 'roll-value';
    if (roll.dice === 'd20') {
      if (r === 20) className += ' critical-success';
      if (r === 1) className += ' critical-fail';
    }
    return `<div class="${className}">${r}</div>`;
  }).join('');
  
  resultDiv.innerHTML = `
    <div class="result-dice">${roll.formula}</div>
    ${roll.description ? `<div class="result-description">${roll.description}</div>` : ''}
    <div class="result-rolls">${rollsHTML}</div>
    ${roll.modifier !== 0 ? `<div class="muted small">Soma: ${roll.sum} ${roll.modifier >= 0 ? '+' : ''}${roll.modifier}</div>` : ''}
    <div class="result-total">${roll.total}</div>
    ${hasCritical && roll.rolls.includes(20) ? '<div class="muted small" style="color:var(--success);">🎉 CRÍTICO!</div>' : ''}
    ${hasCritical && roll.rolls.includes(1) ? '<div class="muted small" style="color:var(--danger);">💀 FALHA CRÍTICA!</div>' : ''}
  `;
  
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderDiceHistory() {
  const list = document.getElementById('diceHistory');
  
  if (DATA.diceHistory.length === 0) {
    list.innerHTML = '<div class="empty-history">🎲 Nenhuma rolagem ainda</div>';
    return;
  }
  
  list.innerHTML = '';
  DATA.diceHistory.slice(0, 20).forEach(roll => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    const time = new Date(roll.timestamp);
    const rollsDisplay = roll.rolls.join(', ');
    
    item.innerHTML = `
      <div class="history-info">
        <div class="history-formula">${roll.formula}</div>
        ${roll.description ? `<div class="history-description">${roll.description}</div>` : ''}
        <div class="history-timestamp">${time.toLocaleString('pt-BR')}</div>
      </div>
      <div class="history-result">
        <div class="history-rolls">[${rollsDisplay}]</div>
        <div class="history-total">${roll.total}</div>
      </div>
    `;
    
    list.appendChild(item);
  });
}

function clearDiceHistory() {
  if (!confirm('Limpar todo o histórico de rolagens?')) return;
  DATA.diceHistory = [];
  saveData();
  renderDiceHistory();
  showToast('Histórico limpo', 'info');
}

function saveMacro() {
  const count = parseInt(document.getElementById('diceCount').value) || 1;
  const modifier = parseInt(document.getElementById('diceModifier').value) || 0;
  const description = document.getElementById('diceDescription').value.trim();
  
  if (!description) {
    showToast('Digite uma descrição para a macro', 'warning');
    return;
  }
  
  const formula = `${count}${selectedDiceType}${modifier >= 0 ? '+' : ''}${modifier !== 0 ? modifier : ''}`;
  
  const macro = {
    id: generateId(),
    user: currentUser.user,
    name: description,
    formula,
    dice: selectedDiceType,
    count,
    modifier
  };
  
  DATA.diceMacros.push(macro);
  saveData();
  showToast('Macro salva!', 'success');
  renderMacros();
}

function renderMacros() {
  const list = document.getElementById('macrosList');
  const userMacros = DATA.diceMacros.filter(m => m.user === currentUser.user);
  
  if (userMacros.length === 0) {
    list.innerHTML = '<div class="empty-macros">💾 Nenhuma macro salva</div>';
    return;
  }
  
  list.innerHTML = '';
  userMacros.forEach(macro => {
    const item = document.createElement('div');
    item.className = 'macro-item';
    
    item.innerHTML = `
      <div class="macro-info">
        <div class="macro-name">${macro.name}</div>
        <div class="macro-formula">${macro.formula}</div>
      </div>
      <div class="macro-actions">
        <button class="btn primary small" onclick="rollMacro('${macro.id}')">🎲 Rolar</button>
        <button class="btn danger small" onclick="deleteMacro('${macro.id}')">🗑️</button>
      </div>
    `;
    
    list.appendChild(item);
  });
}

function rollMacro(macroId) {
  const macro = DATA.diceMacros.find(m => m.id === macroId);
  if (!macro) return;
  
  document.getElementById('diceCount').value = macro.count;
  document.getElementById('diceModifier').value = macro.modifier;
  document.getElementById('diceDescription').value = macro.name;
  selectedDiceType = macro.dice;
  
  document.querySelectorAll('.dice-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dice === macro.dice);
  });
  
  rollDice();
}

function deleteMacro(macroId) {
  if (!confirm('Deletar esta macro?')) return;
  DATA.diceMacros = DATA.diceMacros.filter(m => m.id !== macroId);
  saveData();
  renderMacros();
  showToast('Macro deletada', 'info');
}

// ===== CHAT =====
function loadChatView() {
  populateChatCampaigns();
}

function populateChatCampaigns() {
  const select = document.getElementById('chatCampaignSelect');
  const userCampaigns = getUserCampaigns(currentUser.user);
  
  const noCampaigns = document.getElementById('noCampaignsChat');
  const chatCard = document.querySelector('#chatView .card');
  
  if (userCampaigns.length === 0) {
    noCampaigns.style.display = 'block';
    chatCard.style.display = 'none';
    return;
  }
  
  noCampaigns.style.display = 'none';
  chatCard.style.display = 'block';
  
  select.innerHTML = '<option value="">Escolha uma campanha...</option>';
  
  userCampaigns.forEach(campaign => {
    const option = document.createElement('option');
    option.value = campaign.id;
    option.textContent = campaign.name;
    select.appendChild(option);
  });
}

function loadCampaignChat() {
  const campaignId = document.getElementById('chatCampaignSelect').value;
  if (!campaignId) return;
  
  const messages = DATA.chatMessages.filter(m => m.campaign === campaignId);
  const container = document.getElementById('chatMessages');
  
  if (messages.length === 0) {
    container.innerHTML = '<div class="empty-chat">💬 Nenhuma mensagem ainda</div>';
    return;
  }
  
  container.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = msg.type === 'roll' ? 'chat-message roll' : 'chat-message';
    
    const time = new Date(msg.timestamp);
    
    div.innerHTML = `
      <div class="chat-header">
        <span class="chat-user">${msg.user}</span>
        <span class="chat-timestamp">${time.toLocaleTimeString('pt-BR')}</span>
      </div>
      <div class="chat-content">${msg.message}</div>
      ${msg.roll ? `<div class="chat-roll-result">🎲 ${msg.roll.formula} = ${msg.roll.total}</div>` : ''}
    `;
    
    container.appendChild(div);
  });
  
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const campaignId = document.getElementById('chatCampaignSelect').value;
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!campaignId) {
    showToast('Selecione uma campanha', 'warning');
    return;
  }
  
  if (!message) {
    showToast('Digite uma mensagem', 'warning');
    return;
  }
  
  const chatMessage = {
    id: generateId(),
    campaign: campaignId,
    user: currentUser.user,
    message,
    type: 'text',
    timestamp: new Date().toISOString()
  };
  
  DATA.chatMessages.push(chatMessage);
  saveData();
  
  input.value = '';
  loadCampaignChat();
}

// ===== NOTIFICATIONS =====
function addNotification(username, title, message) {
  const notification = {
    id: generateId(),
    user: username,
    title,
    message,
    read: false,
    timestamp: new Date().toISOString()
  };
  
  DATA.notifications.push(notification);
  saveData();
  
  if (currentUser && currentUser.user === username) {
    updateNotificationBadge();
  }
}

function updateNotificationBadge() {
  const unread = DATA.notifications.filter(n => 
    n.user === currentUser.user && !n.read
  ).length;
  
  const badge = document.getElementById('notificationBadge');
  if (unread > 0) {
    badge.style.display = 'block';
    badge.textContent = unread > 9 ? '9+' : unread;
  } else {
    badge.style.display = 'none';
  }
}

function openNotifications() {
  const panel = document.getElementById('notificationsPanel');
  const list = document.getElementById('notificationsList');
  
  const userNotifications = DATA.notifications.filter(n => n.user === currentUser.user);
  
  if (userNotifications.length === 0) {
    list.innerHTML = '<div class="empty-notifications">🔔 Nenhuma notificação</div>';
  } else {
    list.innerHTML = '';
    userNotifications.forEach(notif => {
      const item = document.createElement('div');
      item.className = notif.read ? 'notification-item' : 'notification-item unread';
      
      const time = new Date(notif.timestamp);
      
      item.innerHTML = `
        <div class="notification-header">
          <span class="notification-title">${notif.title}</span>
          <span class="notification-time">${time.toLocaleString('pt-BR')}</span>
        </div>
        <div class="notification-message">${notif.message}</div>
      `;
      
      item.onclick = () => markNotificationRead(notif.id);
      list.appendChild(item);
    });
  }
  
  panel.classList.add('active');
}

function closeNotifications() {
  document.getElementById('notificationsPanel').classList.remove('active');
}

function markNotificationRead(notifId) {
  const notif = DATA.notifications.find(n => n.id === notifId);
  if (notif) {
    notif.read = true;
    saveData();
    updateNotificationBadge();
  }
}

// ===== CATEGORY FILTERS =====
function populateCategoryFilters() {
  const allCategories = new Set();
  const allSystems = new Set();
  
  DATA.campaigns.forEach(c => {
    if (c.categories) {
      c.categories.forEach(cat => allCategories.add(cat));
    }
    if (c.system) {
      allSystems.add(c.system);
    }
  });
  
  const catFilter = document.getElementById('filterCategory');
  catFilter.innerHTML = '<option value="">Todas Categorias</option>';
  [...allCategories].sort().forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catFilter.appendChild(opt);
  });
  
  const sysFilter = document.getElementById('filterSystem');
  sysFilter.innerHTML = '<option value="">Todos Sistemas</option>';
  [...allSystems].sort().forEach(sys => {
    const opt = document.createElement('option');
    opt.value = sys;
    opt.textContent = sys;
    sysFilter.appendChild(opt);
  });
}

// ===== CUSTOM CATEGORIES =====
function setupCustomCategories() {
  const input = document.getElementById('catFree');
  const chipsContainer = document.getElementById('catChips');
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input.value.trim();
      
      if (!value) return;
      
      const checkedCount = document.querySelectorAll('.catChk:checked').length;
      const customCount = chipsContainer.querySelectorAll('.chip').length;
      
      if (checkedCount + customCount >= 3) {
        showToast('Máximo de 3 categorias', 'warning');
        return;
      }
      
      const chip = document.createElement('span');
      chip.className = 'chip removable';
      chip.textContent = value;
      chip.onclick = () => chip.remove();
      
      chipsContainer.appendChild(chip);
      input.value = '';
    }
  });
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  
  // Auth
  document.getElementById('btnLogin').addEventListener('click', () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    login(user, pass);
  });
  
  document.getElementById('loginPass').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btnLogin').click();
    }
  });
  
  document.getElementById('btnRegister').addEventListener('click', async () => {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const avatar = document.getElementById('regAvatar').files[0];
    await register(user, pass, avatar);
  });
  
  document.getElementById('goRegister').addEventListener('click', (e) => {
    e.preventDefault();
    showScreen('registerScreen');
  });
  
  document.getElementById('goLogin').addEventListener('click', () => {
    showScreen('loginScreen');
  });
  
  document.getElementById('btnLogout').addEventListener('click', logout);
  
  // Navigation
  document.getElementById('navPlayer').addEventListener('click', () => {
    showView('playerView');
    loadPlayerView();
  });
  
  document.getElementById('navMaster').addEventListener('click', () => {
    showView('masterView');
    loadMasterView();
  });
  
  document.getElementById('navAdmin').addEventListener('click', () => {
    showView('adminView');
    loadAdminView();
  });
  
  document.getElementById('navMasterRequest').addEventListener('click', () => {
    showView('masterRequestView');
    loadMasterRequestView();
  });
  
  document.getElementById('navDice').addEventListener('click', () => {
    showView('diceView');
    loadDiceView();
  });
  
  document.getElementById('navChat').addEventListener('click', () => {
    showView('chatView');
    loadChatView();
  });
  
  document.getElementById('navRanking').addEventListener('click', () => {
    showView('rankingView');
    loadRankingView();
  });
  
  // Avatar upload
  document.getElementById('btnUploadAvatar').addEventListener('click', () => {
    document.getElementById('fileAvatar').click();
  });
  
  document.getElementById('fileAvatar').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      uploadAvatar(e.target.files[0]);
    }
  });
  
  // Master create campaign
  document.getElementById('btnCreate').addEventListener('click', (e) => {
    e.preventDefault();
    createCampaign();
  });
  
  document.getElementById('btnClear').addEventListener('click', () => {
    clearCampaignForm();
  });
  
  // Edit modal
  document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
  document.getElementById('btnSaveEdit').addEventListener('click', saveEditCampaign);
  document.getElementById('btnFinishCampaign').addEventListener('click', finishCampaign);
  
  // Attendance modal
  document.getElementById('btnConfirmPresence').addEventListener('click', confirmPresence);
  document.getElementById('btnConfirmAbsence').addEventListener('click', showAbsenceForm);
  document.getElementById('btnSubmitAttendance').addEventListener('click', confirmAbsence);
  document.getElementById('btnCancelModal').addEventListener('click', closeAttendanceModal);
  
  // Sheet modal
  document.getElementById('btnUploadSheet').addEventListener('click', uploadSheet);
  document.getElementById('btnCloseSheet').addEventListener('click', closeSheetModal);
  
  // Manage campaign modal
  document.getElementById('btnStartCampaign').addEventListener('click', startCampaign);
  document.getElementById('btnCloseManage').addEventListener('click', closeManageCampaignModal);
  
  // View sheet modal
  document.getElementById('btnApproveSheet').addEventListener('click', approveSheet);
  document.getElementById('btnRejectSheet').addEventListener('click', rejectSheet);
  document.getElementById('btnCloseViewSheet').addEventListener('click', closeViewSheetModal);
  
  // Filters
  document.getElementById('searchCampaigns').addEventListener('input', loadActiveCampaigns);
  document.getElementById('filterCategory').addEventListener('change', loadActiveCampaigns);
  document.getElementById('filterSystem').addEventListener('change', loadActiveCampaigns);
  document.getElementById('searchUsers').addEventListener('input', loadUsersList);
  
  // Dice roller
  document.getElementById('btnRollDice').addEventListener('click', rollDice);
  document.getElementById('btnSaveMacro').addEventListener('click', saveMacro);
  document.getElementById('btnClearHistory').addEventListener('click', clearDiceHistory);
  
  // Chat
  document.getElementById('chatCampaignSelect').addEventListener('change', loadCampaignChat);
  document.getElementById('btnSendMessage').addEventListener('click', sendChatMessage);
  
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
  
  // Notifications
  document.getElementById('btnNotifications').addEventListener('click', openNotifications);
  
  // Master request exam
  document.getElementById('btnSubmitExam').addEventListener('click', submitExam);
  document.getElementById('btnSubmitMasterRequest').addEventListener('click', submitMasterRequest);
  
  // Custom categories
  setupCustomCategories();
  
  // Auto-save periodically
  setInterval(saveData, 30000);
  
  console.log('%c🎲 Chrono RPG v3.0 - Sistema carregado com sucesso!', 'color:#a855f7;font-weight:bold;font-size:16px;');
});

// Make functions global for inline onclick handlers
window.approveMasterRequest = approveMasterRequest;
window.rejectMasterRequest = rejectMasterRequest;
window.deleteUser = deleteUser;
window.rollMacro = rollMacro;
window.deleteMacro = deleteMacro;
window.closeNotifications = closeNotifications;
window.viewSheetModal = viewSheetModal;
window.changeMasterTier = changeMasterTier;
window.demoteMaster = demoteMaster;