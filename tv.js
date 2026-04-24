const defaultTvSettings = {
  tvTitle: 'Clínica Veterinária',
  tvSubtitle: 'Atualização automática da playlist local',
  sideTitle: 'Atendimento e novidades',
  sideText: 'Fale com nossa recepção para agendamentos, orientações e informações sobre nossos serviços.',
  whatsNumber: '(51) 90000-1234',
  instagramText: '@suaempresa',
  facebookText: '/suaempresa',
  newsTicker: 'Bem-vindo • Promoção da semana • Atendimento até às 20h • Fale com nossa equipe na recepção •',
  newsLabel: 'AVISOS',
  newsPreset: 'clean',
  customCss: '',
  clinicLogoData: null,
  appointmentNumbers: '',
  messageOfDay: 'Agende agora o check-up do seu pet'
};

let playlist = [];
let tvSettings = { ...defaultTvSettings };
let currentIndex = 0;
let timer = null;
let clinicSlug = '';
let unsubscribeRealtime = null;

const mainVideo = document.getElementById('mainVideo');
const mainYoutube = document.getElementById('mainYoutube');
const youtubeFallbackNotice = document.getElementById('youtubeFallbackNotice');
const mainImage = document.getElementById('mainImage');
const mainLayout = document.getElementById('mainLayout');
const layoutTitle = document.getElementById('layoutTitle');
const layoutDescription = document.getElementById('layoutDescription');
const layoutCta = document.getElementById('layoutCta');
const footerNote = document.getElementById('footerNote');
const tvClinicName = document.getElementById('tvClinicName');
const tvClinicSubtitle = document.getElementById('tvClinicSubtitle');
const tvLogo = document.getElementById('tvLogo');
const newsContent = document.getElementById('newsContent');
const newsLabel = document.getElementById('newsLabel');
const sideTitle = document.getElementById('sideTitle');
const sideText = document.getElementById('sideText');
const whatsNumber = document.getElementById('whatsNumber');
const instagramText = document.getElementById('instagramText');
const facebookText = document.getElementById('facebookText');
const appointmentRow = document.getElementById('appointmentRow');
const appointmentNumbers = document.getElementById('appointmentNumbers');
const tvCustomCss = document.getElementById('tvCustomCss');
const videoAutoplayNotice = document.getElementById('videoAutoplayNotice');
const tvModeBadge = document.getElementById('tvModeBadge');

init();

async function init() {
  clinicSlug = window.TVReceptionDataService.getActiveClinic();
  if (!clinicSlug) {
    tvClinicName.textContent = 'Defina a clínica';
    tvClinicSubtitle.textContent = 'Abra a TV com ?clinica=nome-da-clinica';
    showImage('assets/media.jpg');
    updateClock();
    setInterval(updateClock, 1000);
    return;
  }

  await refreshData();
  renderCurrentItem();
  updateClock();
  setInterval(updateClock, 1000);
  subscribeRealtime();
  if (tvModeBadge) tvModeBadge.textContent = window.TVReceptionDataService.hasSupabase() ? 'Realtime ativo' : 'Modo local';
}

function subscribeRealtime() {
  unsubscribeRealtime?.();
  unsubscribeRealtime = window.TVReceptionDataService.subscribeClinicState(clinicSlug, async () => {
    const currentId = playlist[currentIndex]?.id;
    await refreshData();
    const sameIndex = playlist.findIndex((x) => x.id === currentId);
    currentIndex = sameIndex >= 0 ? sameIndex : 0;
    renderCurrentItem();
  });
}

async function refreshData() {
  const state = await window.TVReceptionDataService.loadClinicState(clinicSlug);
  playlist = (state.items || []).filter(item => item && item.active);
  tvSettings = { ...defaultTvSettings, ...(state.tvSettings || {}) };
  applyTvSettings(state.clinic);
}

function applyTvSettings(clinic) {
  tvClinicName.textContent = tvSettings.tvTitle || clinic?.clinic_name || defaultTvSettings.tvTitle;
  tvClinicSubtitle.textContent = tvSettings.tvSubtitle || defaultTvSettings.tvSubtitle;
  sideTitle.textContent = tvSettings.sideTitle || defaultTvSettings.sideTitle;
  sideText.textContent = tvSettings.sideText || defaultTvSettings.sideText;
  whatsNumber.textContent = tvSettings.whatsNumber || defaultTvSettings.whatsNumber;
  instagramText.textContent = tvSettings.instagramText || defaultTvSettings.instagramText;
  facebookText.textContent = tvSettings.facebookText || defaultTvSettings.facebookText;
  newsContent.textContent = tvSettings.newsTicker || defaultTvSettings.newsTicker;
  newsLabel.textContent = tvSettings.newsLabel || defaultTvSettings.newsLabel;
  document.body.dataset.newsPreset = tvSettings.newsPreset || defaultTvSettings.newsPreset;
  tvCustomCss.textContent = tvSettings.customCss || '';

  tvLogo.src = tvSettings.clinicLogoData || 'assets/logo.svg';
  if (footerNote) footerNote.textContent = tvSettings.messageOfDay || defaultTvSettings.messageOfDay;

  const appt = (tvSettings.appointmentNumbers || '').trim();
  if (appt) {
    appointmentNumbers.textContent = appt;
    appointmentRow.hidden = false;
  } else {
    appointmentRow.hidden = true;
  }
}

function renderCurrentItem() {
  clearTimeout(timer);
  hideAutoplayNotice();
  hideLayout();
  hideYoutube();
  mainVideo.pause();
  mainVideo.removeAttribute('src');
  mainVideo.load();

  if (!playlist.length) {
    if (footerNote) footerNote.textContent = tvSettings.messageOfDay || defaultTvSettings.messageOfDay;
    showImage('assets/media.jpg');
    return;
  }

  const item = playlist[currentIndex] || playlist[0];
  const duration = Math.max((Number(item.duration) || 10) * 1000, 3000);

  if (item.type === 'layout') {
    showTextLayout(item);
    timer = setTimeout(nextSlide, duration);
  } else if (item.type === 'youtube' && item.youtubeUrl) {
    showYoutube(item.youtubeUrl, duration);
  } else if ((item.mediaKind === 'video' || item.type === 'video') && item.mediaData) {
    showVideo(item, duration);
  } else if (item.mediaData) {
    showImage(item.mediaData);
    timer = setTimeout(nextSlide, duration);
  } else {
    showImage('assets/media.jpg');
    timer = setTimeout(nextSlide, duration);
  }
}

function showImage(src) {
  hideAutoplayNotice();
  hideLayout();
  hideYoutube();
  mainVideo.classList.add('is-hidden');
  mainImage.classList.remove('is-hidden');
  mainImage.src = src;
}

function hideLayout() {
  if (!mainLayout) return;
  mainLayout.classList.add('is-hidden');
  mainLayout.style.background = '#081f4a';
  if (layoutCta) layoutCta.classList.add('is-hidden');
}

function hideYoutube() {
  if (!mainYoutube) return;
  mainYoutube.classList.add('is-hidden');
  mainYoutube.removeAttribute('src');
  hideYoutubeFallbackNotice();
}

function showYoutubeFallbackNotice() {
  youtubeFallbackNotice?.classList.remove('is-hidden');
}

function hideYoutubeFallbackNotice() {
  youtubeFallbackNotice?.classList.add('is-hidden');
}

function showYoutube(src, duration) {
  hideAutoplayNotice();
  hideLayout();
  hideYoutubeFallbackNotice();
  mainVideo.pause();
  mainVideo.classList.add('is-hidden');
  mainImage.classList.add('is-hidden');
  mainYoutube.classList.remove('is-hidden');
  mainYoutube.src = src;

  let moved = false;
  const failToNext = () => {
    if (moved) return;
    moved = true;
    showYoutubeFallbackNotice();
    setTimeout(() => {
      hideYoutube();
      nextSlide();
    }, 1200);
  };

  const watchdog = setTimeout(failToNext, 4500);
  mainYoutube.onload = () => {
    clearTimeout(watchdog);
    timer = setTimeout(() => {
      hideYoutube();
      nextSlide();
    }, duration);
  };
}

function showTextLayout(item) {
  hideAutoplayNotice();
  hideYoutube();
  mainVideo.pause();
  mainVideo.classList.add('is-hidden');
  mainImage.classList.add('is-hidden');
  mainLayout.classList.remove('is-hidden');

  const title = String(item.title || 'Destaque da clínica').trim();
  const description = String(item.description || 'Informações importantes para os clientes da recepção.').trim();
  const cta = String(item.cta || '').trim();
  const backgroundColor = String(item.backgroundColor || '#081f4a').trim() || '#081f4a';
  const textColor = String(item.textColor || '#ffffff').trim() || '#ffffff';
  const textAlign = ['left', 'center', 'right'].includes(item.textAlign) ? item.textAlign : 'center';
  const textSize = ['small', 'medium', 'large', 'xlarge'].includes(item.textSize) ? item.textSize : 'medium';

  mainLayout.style.background = backgroundColor;
  mainLayout.dataset.textSize = textSize;
  layoutTitle.textContent = title;
  layoutDescription.textContent = description;
  layoutTitle.style.color = textColor;
  layoutDescription.style.color = textColor;
  layoutDescription.style.textAlign = textAlign;
  layoutTitle.style.textAlign = textAlign;
  layoutDescription.style.fontWeight = item.textBold ? '800' : '500';
  layoutDescription.style.fontStyle = item.textItalic ? 'italic' : 'normal';
  layoutTitle.style.fontStyle = item.textItalic ? 'italic' : 'normal';
  const inner = mainLayout.querySelector('.tv-text-layout-inner');
  if (inner) {
    inner.style.textAlign = textAlign;
    inner.style.justifyItems = textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'center';
  }

  if (cta) {
    layoutCta.textContent = cta;
    layoutCta.classList.remove('is-hidden');
  } else {
    layoutCta.textContent = '';
    layoutCta.classList.add('is-hidden');
  }
}

function showVideo(item, duration) {
  const src = item?.mediaData;
  hideLayout();
  hideYoutube();
  mainImage.classList.add('is-hidden');
  mainVideo.classList.remove('is-hidden');
  mainVideo.src = src || '';
  mainVideo.currentTime = 0;
  mainVideo.muted = true;
  mainVideo.volume = 0;
  mainVideo.setAttribute('playsinline', '');

  const playPromise = mainVideo.play();
  if (playPromise?.catch) playPromise.catch(() => showAutoplayNotice());

  const onEnded = () => {
    mainVideo.removeEventListener('ended', onEnded);
    nextSlide();
  };

  mainVideo.addEventListener('ended', onEnded);
  timer = setTimeout(() => {
    mainVideo.removeEventListener('ended', onEnded);
    nextSlide();
  }, duration);
}

function showAutoplayNotice() {
  videoAutoplayNotice?.classList.remove('is-hidden');
}

function hideAutoplayNotice() {
  videoAutoplayNotice?.classList.add('is-hidden');
}

function nextSlide() {
  if (!playlist.length) return;
  currentIndex = (currentIndex + 1) % playlist.length;
  renderCurrentItem();
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  document.getElementById('tvTime').textContent = time;
  document.getElementById('tvDate').textContent = date.charAt(0).toUpperCase() + date.slice(1);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') nextSlide();
  if (e.key === 'ArrowLeft') {
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    renderCurrentItem();
  }
});

videoAutoplayNotice?.addEventListener('click', async () => {
  try {
    mainVideo.muted = false;
    mainVideo.volume = 1;
    await mainVideo.play();
    hideAutoplayNotice();
  } catch {
    mainVideo.muted = true;
    await mainVideo.play().catch(() => {});
  }
});
