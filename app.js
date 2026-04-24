const defaultTvSettings = {
  tvTitle: 'Programação da Recepção',
  tvSubtitle: 'Atualização automática da playlist local',
  sideTitle: 'Atendimento e novidades',
  sideText: 'Fale com nossa equipe, acompanhe as notícias e confira nossos canais.',
  whatsNumber: '(51) 90000-1234',
  instagramText: '@suaempresa',
  facebookText: '/suaempresa',
  newsTicker: 'Bem-vindo à recepção • Confira nossos serviços • Fale com nossa equipe para mais informações',
  newsLabel: 'AVISOS',
  newsPreset: 'clean',
  customCss: '',
  clinicLogoData: null,
  appointmentNumbers: '',
  messageOfDay: 'Agende agora o check-up do seu pet'
};

let items = [];
let tvSettings = { ...defaultTvSettings };
let currentMediaData = null;
let currentLogoData = null;
let currentTvLogoData = null;
let currentClinic = null;
let unsubscribeRealtime = null;

const form = document.getElementById('contentForm');
const itemId = document.getElementById('itemId');
const titleInput = document.getElementById('title');
const typeInput = document.getElementById('type');
const descriptionInput = document.getElementById('description');
const textEditorOptions = document.getElementById('textEditorOptions');
const textBoldInput = document.getElementById('textBold');
const textItalicInput = document.getElementById('textItalic');
const textSizeInput = document.getElementById('textSize');
const textColorInput = document.getElementById('textColor');
const textColorTextInput = document.getElementById('textColorText');
const textAlignInput = document.getElementById('textAlign');
const youtubeUrlInput = document.getElementById('youtubeUrl');
const youtubeUrlField = document.getElementById('youtubeUrlField');
const durationInput = document.getElementById('duration');
const ctaInput = document.getElementById('cta');
const backgroundColorInput = document.getElementById('backgroundColor');
const backgroundColorTextInput = document.getElementById('backgroundColorText');
const activeInput = document.getElementById('active');
const mediaFileInput = document.getElementById('mediaFile');
const logoFileInput = document.getElementById('logoFile');
const mediaPreview = document.getElementById('mediaPreview');
const logoPreview = document.getElementById('logoPreview');
const itemsList = document.getElementById('itemsList');
const itemCount = document.getElementById('itemCount');
const formTitle = document.getElementById('formTitle');
const saveStatus = document.getElementById('saveStatus');
const clinicBadge = document.getElementById('clinicBadge');
const realtimeBadge = document.getElementById('realtimeBadge');
const tvLink = document.getElementById('openTvLink');

const tvSettingsForm = document.getElementById('tvSettingsForm');
const tvSettingsStatus = document.getElementById('tvSettingsStatus');
const tvTitleInput = document.getElementById('tvTitle');
const tvSubtitleInput = document.getElementById('tvSubtitle');
const sideTitleInput = document.getElementById('sideTitle');
const sideTextInput = document.getElementById('sideText');
const whatsNumberInput = document.getElementById('whatsNumber');
const instagramTextInput = document.getElementById('instagramText');
const facebookTextInput = document.getElementById('facebookText');
const appointmentNumbersInput = document.getElementById('appointmentNumbers');
const messageOfDayInput = document.getElementById('messageOfDay');
const newsTickerInput = document.getElementById('newsTicker');
const newsLabelInput = document.getElementById('newsLabel');
const newsPresetInput = document.getElementById('newsPreset');
const customCssInput = document.getElementById('customCss');
const tvLogoFileInput = document.getElementById('tvLogoFile');
const tvLogoPreview = document.getElementById('tvLogoPreview');
const tvSettingsSubmitBtn = document.getElementById('saveTvSettingsBtn');

init();

async function init() {
  currentClinic = await window.TVReceptionDataService.getCurrentClinic();
  if (!currentClinic) {
    alert('Nenhuma clínica ativa. Faça login novamente.');
    location.replace('login.html');
    return;
  }

  const state = await window.TVReceptionDataService.loadClinicState(currentClinic.slug);
  items = Array.isArray(state.items) ? state.items : [];
  tvSettings = { ...defaultTvSettings, ...(state.tvSettings || {}) };
  if (!tvSettings.clinicLogoData && tvSettings.tvLogoData) tvSettings.clinicLogoData = tvSettings.tvLogoData;

  clinicBadge.textContent = currentClinic.clinic_name || currentClinic.clinicName || 'Clínica ativa';
  if (tvLink) tvLink.href = 'tv.html?clinica=' + encodeURIComponent(currentClinic.slug);
  if (realtimeBadge) realtimeBadge.textContent = window.TVReceptionDataService.hasSupabase() ? 'Realtime Supabase ativo' : 'Modo local de demonstração';

  renderItems();
  fillTvSettingsForm();
  wireEvents();
  subscribeRealtime();
}

function subscribeRealtime() {
  unsubscribeRealtime?.();
  unsubscribeRealtime = window.TVReceptionDataService.subscribeClinicState(currentClinic.slug, async () => {
    const currentId = itemId.value;
    const state = await window.TVReceptionDataService.loadClinicState(currentClinic.slug);
    items = Array.isArray(state.items) ? state.items : [];
    tvSettings = { ...defaultTvSettings, ...(state.tvSettings || {}) };
    renderItems();
    fillTvSettingsForm();
    if (currentId) {
      const sameItem = items.find((item) => item.id === currentId);
      if (!sameItem) resetForm();
    }
    setStatus('Conteúdo sincronizado');
    setTvSettingsStatus('TV sincronizada');
  });
}

function normalizeYoutubeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    let id = '';

    if (host === 'youtu.be') {
      id = url.pathname.replace(/^\//, '').split('/')[0];
    } else if (host.includes('youtube.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/embed/')[1].split('/')[0];
      else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/shorts/')[1].split('/')[0];
    }

    if (!id) return raw;
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${id}`;
  } catch {
    return raw;
  }
}

function updateTypeVisibility() {
  const type = typeInput.value;
  const isLayout = type === 'layout';
  const isYoutube = type === 'youtube';
  if (youtubeUrlField) youtubeUrlField.classList.toggle('is-hidden', !isYoutube);
  if (textEditorOptions) textEditorOptions.classList.toggle('is-hidden', !isLayout);
  if (mediaFileInput) mediaFileInput.closest('.file-box')?.classList.toggle('is-hidden', isYoutube);
  if (logoFileInput) logoFileInput.closest('.file-box')?.classList.toggle('is-hidden', !isLayout);
}

function wireEvents() {
  typeInput.addEventListener('change', updateTypeVisibility);
  updateTypeVisibility();

  mediaFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Lendo arquivo...');
    currentMediaData = await readFileAsDataURL(file);
    const inferredKind = file.type.startsWith('video/') ? 'video' : 'image';
    renderPreview(mediaPreview, inferredKind, currentMediaData);
    setStatus(inferredKind === 'video' ? 'Vídeo pronto' : 'Imagem pronta');
  });

  logoFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStatus('Lendo logo...');
    currentLogoData = await readFileAsDataURL(file);
    renderPreview(logoPreview, 'image', currentLogoData);
    setStatus('Logo pronta');
  });

  tvLogoFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTvSettingsStatus('Lendo logo da TV...');
    currentTvLogoData = await readFileAsDataURL(file);
    renderPreview(tvLogoPreview, 'image', currentTvLogoData);
    setTvSettingsStatus('Logotipo pronto');
  });

  backgroundColorInput?.addEventListener('input', () => {
    if (backgroundColorTextInput) backgroundColorTextInput.value = backgroundColorInput.value;
  });

  backgroundColorTextInput?.addEventListener('input', () => {
    const value = backgroundColorTextInput.value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
      backgroundColorInput.value = value;
    }
  });

  textColorInput?.addEventListener('input', () => {
    if (textColorTextInput) textColorTextInput.value = textColorInput.value;
  });

  textColorTextInput?.addEventListener('input', () => {
    const value = textColorTextInput.value.trim();
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
      textColorInput.value = value;
    }
  });

  form.addEventListener('submit', handleSubmit);
  tvSettingsForm.addEventListener('submit', handleTvSettingsSubmit);
  tvSettingsSubmitBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    handleTvSettingsSubmit(e);
  });
  document.getElementById('cancelEditBtn').addEventListener('click', resetForm);
  document.getElementById('resetTvSettingsBtn').addEventListener('click', resetTvSettingsForm);
  document.getElementById('newItemBtn').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.getElementById('exportBtn').addEventListener('click', exportBackup);
  document.getElementById('importBackup').addEventListener('change', importBackup);
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    window.TVReceptionAuth.logout();
    location.replace('login.html');
  });

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isTyping = ['input', 'textarea', 'select'].includes(tag);
    if (isTyping) return;
    if (e.altKey && e.key.toLowerCase() === 't') {
      window.open('tv.html?clinica=' + encodeURIComponent(currentClinic.slug), '_blank');
    }
  });
}

async function persistAll(successText) {
  await window.TVReceptionDataService.saveClinicState({ slug: currentClinic.slug, items, tvSettings });
  if (successText) showToast(successText);
}

async function handleSubmit(e) {
  e.preventDefault();
  const id = itemId.value || makeId();
  const existing = items.find((x) => x.id === id);

  const payload = {
    id,
    title: titleInput.value.trim(),
    type: typeInput.value,
    description: descriptionInput.value.trim(),
    youtubeUrl: normalizeYoutubeUrl(youtubeUrlInput?.value),
    duration: Number(durationInput.value) || 10,
    cta: ctaInput.value.trim(),
    backgroundColor: (backgroundColorTextInput?.value || backgroundColorInput?.value || '#081f4a').trim() || '#081f4a',
    textBold: !!textBoldInput?.checked,
    textItalic: !!textItalicInput?.checked,
    textSize: textSizeInput?.value || 'medium',
    textColor: (textColorTextInput?.value || textColorInput?.value || '#ffffff').trim() || '#ffffff',
    textAlign: textAlignInput?.value || 'center',
    active: activeInput.checked,
    mediaData: currentMediaData || existing?.mediaData || null,
    logoData: currentLogoData || existing?.logoData || null,
    mediaMime: mediaFileInput.files[0]?.type || existing?.mediaMime || '',
    mediaName: mediaFileInput.files[0]?.name || existing?.mediaName || '',
    mediaKind: getMediaKind(typeInput.value, currentMediaData || existing?.mediaData, mediaFileInput.files[0]?.type || existing?.mediaMime || ''),
    updatedAt: new Date().toISOString()
  };

  if (!payload.title) return setStatus('Digite um título', true);
  if (payload.type === 'youtube' && !payload.youtubeUrl) return setStatus('Cole um link do YouTube', true);

  const index = items.findIndex((x) => x.id === id);
  if (index >= 0) items[index] = { ...items[index], ...payload };
  else items.unshift(payload);

  try {
    setStatus('Salvando...');
    await persistAll('Item salvo com sucesso.');
    resetForm();
    renderItems();
    setStatus('Salvo com sucesso');
  } catch (err) {
    console.error(err);
    setStatus('Não foi possível salvar. Tente arquivo menor.', true);
    showToast('Não foi possível salvar este conteúdo.', true);
  }
}

async function handleTvSettingsSubmit(e) {
  e.preventDefault();
  tvSettings = {
    tvTitle: tvTitleInput.value.trim() || defaultTvSettings.tvTitle,
    tvSubtitle: tvSubtitleInput.value.trim() || defaultTvSettings.tvSubtitle,
    sideTitle: sideTitleInput.value.trim() || defaultTvSettings.sideTitle,
    sideText: sideTextInput.value.trim() || defaultTvSettings.sideText,
    whatsNumber: whatsNumberInput.value.trim(),
    instagramText: instagramTextInput.value.trim(),
    facebookText: facebookTextInput.value.trim(),
    appointmentNumbers: appointmentNumbersInput.value.trim(),
    messageOfDay: messageOfDayInput ? (messageOfDayInput.value.trim() || defaultTvSettings.messageOfDay) : defaultTvSettings.messageOfDay,
    newsTicker: newsTickerInput.value.trim() || defaultTvSettings.newsTicker,
    newsLabel: newsLabelInput.value.trim() || defaultTvSettings.newsLabel,
    newsPreset: newsPresetInput.value || defaultTvSettings.newsPreset,
    customCss: customCssInput.value,
    clinicLogoData: currentTvLogoData || tvSettings.clinicLogoData || null,
    tvLogoData: currentTvLogoData || tvSettings.clinicLogoData || null
  };

  try {
    setTvSettingsStatus('Salvando...');
    await persistAll('Informações da TV salvas com sucesso.');
    setTvSettingsStatus('Salvo com sucesso');
  } catch (err) {
    console.error(err);
    setTvSettingsStatus('Não foi possível salvar', true);
    showToast('Não foi possível salvar as informações da TV.', true);
  }
}

function fillTvSettingsForm() {
  tvTitleInput.value = tvSettings.tvTitle || '';
  tvSubtitleInput.value = tvSettings.tvSubtitle || '';
  sideTitleInput.value = tvSettings.sideTitle || '';
  sideTextInput.value = tvSettings.sideText || '';
  whatsNumberInput.value = tvSettings.whatsNumber || '';
  instagramTextInput.value = tvSettings.instagramText || '';
  facebookTextInput.value = tvSettings.facebookText || '';
  appointmentNumbersInput.value = tvSettings.appointmentNumbers || '';
  if (messageOfDayInput) messageOfDayInput.value = tvSettings.messageOfDay || defaultTvSettings.messageOfDay;
  newsTickerInput.value = tvSettings.newsTicker || '';
  newsLabelInput.value = tvSettings.newsLabel || '';
  newsPresetInput.value = tvSettings.newsPreset || defaultTvSettings.newsPreset;
  customCssInput.value = tvSettings.customCss || '';
  currentTvLogoData = tvSettings.clinicLogoData || null;
  renderPreview(tvLogoPreview, 'image', currentTvLogoData);
}

function renderItems() {
  itemsList.innerHTML = '';
  itemCount.textContent = `${items.length} ${items.length === 1 ? 'item' : 'itens'}`;

  if (!items.length) {
    itemsList.innerHTML = `<div class="empty-state" style="min-height:180px;border:1px dashed rgba(255,255,255,0.12);border-radius:20px;">Nenhum conteúdo cadastrado ainda.</div>`;
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="thumb">${getThumbMarkup(item)}</div>
      <div class="item-meta">
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.description || 'Sem descrição')}</p>
        <div class="item-tags">
          <span class="tag">${labelType(item.type)}</span>
          <span class="tag">${item.duration}s</span>
          <span class="tag">${item.active ? 'Ativo' : 'Inativo'}</span>
          <span class="tag">#${index + 1}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="icon-btn" data-action="up" data-id="${item.id}">↑</button>
        <button class="icon-btn" data-action="down" data-id="${item.id}">↓</button>
        <button class="icon-btn" data-action="edit" data-id="${item.id}">Editar</button>
        <button class="icon-btn danger" data-action="delete" data-id="${item.id}">Excluir</button>
      </div>
    `;
    itemsList.appendChild(row);
  });

  itemsList.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleRowAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleRowAction(action, id) {
  const index = items.findIndex((x) => x.id === id);
  if (index < 0) return;

  if (action === 'delete') items.splice(index, 1);
  if (action === 'up' && index > 0) [items[index - 1], items[index]] = [items[index], items[index - 1]];
  if (action === 'down' && index < items.length - 1) [items[index + 1], items[index]] = [items[index], items[index + 1]];
  if (action === 'edit') {
    const item = items[index];
    itemId.value = item.id;
    titleInput.value = item.title;
    typeInput.value = item.type;
    descriptionInput.value = item.description || '';
    durationInput.value = item.duration;
    ctaInput.value = item.cta || '';
    youtubeUrlInput.value = item.youtubeUrl || '';
    const savedColor = item.backgroundColor || '#081f4a';
    if (backgroundColorInput) backgroundColorInput.value = savedColor;
    if (backgroundColorTextInput) backgroundColorTextInput.value = savedColor;
    if (textBoldInput) textBoldInput.checked = !!item.textBold;
    if (textItalicInput) textItalicInput.checked = !!item.textItalic;
    if (textSizeInput) textSizeInput.value = item.textSize || 'medium';
    const savedTextColor = item.textColor || '#ffffff';
    if (textColorInput) textColorInput.value = savedTextColor;
    if (textColorTextInput) textColorTextInput.value = savedTextColor;
    if (textAlignInput) textAlignInput.value = item.textAlign || 'center';
    activeInput.checked = !!item.active;
    currentMediaData = item.mediaData || null;
    currentLogoData = item.logoData || null;
    renderPreview(mediaPreview, item.mediaKind || getMediaKind(item.type, item.mediaData), item.mediaData);
    renderPreview(logoPreview, 'image', item.logoData);
    formTitle.textContent = 'Editando item';
    setStatus('Editando item');
    updateTypeVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  try {
    setStatus('Salvando...');
    await persistAll('Programação atualizada com sucesso.');
    renderItems();
    setStatus('Salvo com sucesso');
  } catch (err) {
    console.error(err);
    setStatus('Não foi possível salvar', true);
  }
}

function resetForm() {
  form.reset();
  itemId.value = '';
  durationInput.value = 10;
  activeInput.checked = true;
  if (youtubeUrlInput) youtubeUrlInput.value = '';
  if (backgroundColorInput) backgroundColorInput.value = '#081f4a';
  if (backgroundColorTextInput) backgroundColorTextInput.value = '#081f4a';
  if (textBoldInput) textBoldInput.checked = false;
  if (textItalicInput) textItalicInput.checked = false;
  if (textSizeInput) textSizeInput.value = 'medium';
  if (textColorInput) textColorInput.value = '#ffffff';
  if (textColorTextInput) textColorTextInput.value = '#ffffff';
  if (textAlignInput) textAlignInput.value = 'center';
  currentMediaData = null;
  currentLogoData = null;
  mediaFileInput.value = '';
  logoFileInput.value = '';
  mediaPreview.innerHTML = 'Nenhum arquivo selecionado';
  mediaPreview.className = 'preview-box empty-state';
  logoPreview.innerHTML = 'Nenhum logo selecionado';
  logoPreview.className = 'preview-box empty-state';
  formTitle.textContent = 'Novo item';
  updateTypeVisibility();
}

function resetTvSettingsForm() {
  tvSettings = { ...defaultTvSettings };
  currentTvLogoData = null;
  tvLogoFileInput.value = '';
  fillTvSettingsForm();
  setTvSettingsStatus('Padrão carregado');
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderPreview(container, kind, data) {
  if (!data) {
    container.textContent = 'Nenhum arquivo selecionado';
    container.className = 'preview-box empty-state';
    return;
  }
  container.className = 'preview-box';
  container.innerHTML = kind === 'video' ? `<video src="${data}" controls muted></video>` : `<img src="${data}" alt="Prévia" />`;
}

function exportBackup() {
  const backup = { clinic: currentClinic, items, tvSettings };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (currentClinic?.slug || 'tv-recepcao') + '-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported.items)) throw new Error('Formato inválido');
    items = imported.items;
    tvSettings = { ...defaultTvSettings, ...(imported.tvSettings || {}) };
    await persistAll('Backup importado com sucesso.');
    renderItems();
    fillTvSettingsForm();
    resetForm();
    setStatus('Backup importado com sucesso');
    setTvSettingsStatus('Backup importado com sucesso');
  } catch (err) {
    console.error(err);
    setStatus('Não foi possível importar', true);
    setTvSettingsStatus('Não foi possível importar', true);
    showToast('Não foi possível importar o backup.', true);
  }
  e.target.value = '';
}

function getThumbMarkup(item) {
  if (item.type === 'youtube') return '<span class="tag">YouTube</span>';
  if (!item.mediaData) return '<span class="tag">Sem mídia</span>';
  const kind = item.mediaKind || getMediaKind(item.type, item.mediaData);
  return kind === 'video' ? `<video src="${item.mediaData}" muted></video>` : `<img src="${item.mediaData}" alt="thumb" />`;
}

function getMediaKind(type, data, mime = '') {
  if (type === 'video') return 'video';
  if (String(mime).startsWith('video/')) return 'video';
  if (data && typeof data === 'string' && data.startsWith('data:video/')) return 'video';
  return 'image';
}

function setStatus(message, error = false) {
  saveStatus.textContent = message;
  saveStatus.className = 'status-badge' + (error ? ' error' : '');
}

function setTvSettingsStatus(message, error = false) {
  tvSettingsStatus.textContent = message;
  tvSettingsStatus.className = 'status-badge' + (error ? ' error' : '');
}

function labelType(type) {
  return ({ image: 'Imagem', video: 'Vídeo', layout: 'Layout', youtube: 'YouTube' })[type] || type;
}

function makeId() {
  return 'item-' + Math.random().toString(36).slice(2, 10);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function showToast(message, error = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.className = 'toast';
  }, 2600);
}
