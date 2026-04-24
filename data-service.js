(function () {
  const LOCAL_CLINICS_KEY = 'tvReceptionClinicsV1';
  const LOCAL_STATE_PREFIX = 'tvReceptionClinicState:';
  const ACTIVE_CLINIC_KEY = 'tvReceptionActiveClinic';
  const LEGACY_ITEMS_KEY = 'tvReceptionItemsV4';
  const LEGACY_SETTINGS_KEY = 'tvReceptionTvSettingsV4';

  let supabaseClient = null;

  const VIDEO_BUCKET = 'indoor-videos';

  function safeFileName(value) {
    return String(value || 'video.mp4')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '') || 'video.mp4';
  }

  async function uploadMediaFile(file, clinicSlug, itemId) {
    if (!file) return null;
    const isVideo = String(file.type || '').startsWith('video/');

    if (!hasSupabase()) {
      return { url: null, storagePath: '', mime: file.type || '', name: file.name || '', kind: isVideo ? 'video' : 'image', usedStorage: false };
    }

    const client = getClient();
    const safeSlug = slugify(clinicSlug || getActiveClinic() || 'clinica');
    const extension = (file.name || '').split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const baseName = safeFileName((file.name || 'media').replace(/\.[^.]+$/, ''));
    const path = safeSlug + '/' + (itemId || Date.now()) + '-' + Date.now() + '-' + baseName + '.' + extension;

    const { error: uploadError } = await client.storage
      .from(VIDEO_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || (isVideo ? 'video/mp4' : 'application/octet-stream'),
        upsert: false
      });

    if (uploadError) {
      const message = String(uploadError.message || uploadError.error || uploadError);
      if (message.toLowerCase().includes('bucket')) {
        throw new Error('Bucket "' + VIDEO_BUCKET + '" não encontrado. Crie esse bucket público no Supabase Storage.');
      }
      throw uploadError;
    }

    const { data } = client.storage.from(VIDEO_BUCKET).getPublicUrl(path);
    return { url: data?.publicUrl || '', storagePath: path, bucket: VIDEO_BUCKET, mime: file.type || '', name: file.name || '', kind: isVideo ? 'video' : 'image', usedStorage: true };
  }


  function getConfig() {
    return window.TVReceptionSupabaseConfig || { url: '', anonKey: '' };
  }

  function hasSupabase() {
    const cfg = getConfig();
    return !!(cfg.url && cfg.anonKey && window.supabase?.createClient);
  }

  function getClient() {
    if (!hasSupabase()) return null;
    if (!supabaseClient) {
      const cfg = getConfig();
      supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    }
    return supabaseClient;
  }

  function slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'clinica';
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getActiveClinic() {
    try {
      const params = new URLSearchParams(location.search);
      const slug = params.get('clinica') || params.get('clinic');
      if (slug) return slugify(slug);
    } catch {}
    return sessionStorage.getItem(ACTIVE_CLINIC_KEY) || localStorage.getItem(ACTIVE_CLINIC_KEY) || '';
  }

  function setActiveClinic(clinic) {
    const slug = typeof clinic === 'string' ? clinic : clinic?.slug;
    if (!slug) return;
    sessionStorage.setItem(ACTIVE_CLINIC_KEY, slug);
    localStorage.setItem(ACTIVE_CLINIC_KEY, slug);
    if (clinic && typeof clinic === 'object') {
      sessionStorage.setItem('tvReceptionClinicName', clinic.clinic_name || clinic.clinicName || 'Sua clínica');
      sessionStorage.setItem('tvReceptionAuthName', clinic.owner_name || clinic.ownerName || 'Administrador');
    }
  }

  function getLocalClinics() {
    const clinics = readJson(LOCAL_CLINICS_KEY, []);
    if (!Array.isArray(clinics) || !clinics.length) {
      const demo = [{
        slug: 'clinica-modelo',
        clinic_name: 'Clínica Modelo',
        owner_name: 'Administrador',
        email: 'admin@clinica.com',
        phone: '(51) 90000-1234',
        password: '123456',
        plan: 'demo',
        status: 'active'
      }];
      writeJson(LOCAL_CLINICS_KEY, demo);
      return demo;
    }
    return clinics;
  }

  function saveLocalClinics(clinics) {
    writeJson(LOCAL_CLINICS_KEY, clinics);
  }

  function getDefaultState() {
    return {
      items: readJson(LEGACY_ITEMS_KEY, []),
      tvSettings: readJson(LEGACY_SETTINGS_KEY, null),
      updated_at: new Date().toISOString()
    };
  }

  function getLocalState(slug) {
    return readJson(LOCAL_STATE_PREFIX + slug, getDefaultState());
  }

  function saveLocalState(slug, state) {
    writeJson(LOCAL_STATE_PREFIX + slug, state);
    localStorage.setItem(LOCAL_STATE_PREFIX + slug + ':ping', String(Date.now()));
  }

  async function loginClinic(email, password) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (hasSupabase()) {
      const client = getClient();
      const { data, error } = await client
        .from('clinics')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('password', password)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      setActiveClinic(data);
      return data;
    }

    const clinic = getLocalClinics().find((item) => String(item.email || '').toLowerCase() === normalizedEmail && item.password === password);
    if (clinic) setActiveClinic(clinic);
    return clinic || null;
  }

  async function registerClinic(payload) {
    const clinicPayload = {
      slug: slugify(payload.slug || payload.clinicName),
      clinic_name: String(payload.clinicName || '').trim(),
      owner_name: String(payload.ownerName || '').trim(),
      email: String(payload.email || '').trim().toLowerCase(),
      phone: String(payload.phone || '').trim(),
      password: String(payload.password || '').trim(),
      plan: payload.plan || 'pro',
      status: 'active'
    };

    if (!clinicPayload.clinic_name || !clinicPayload.email || !clinicPayload.password) {
      throw new Error('Preencha nome da clínica, e-mail e senha.');
    }

    if (hasSupabase()) {
      const client = getClient();
      const { data: existing } = await client.from('clinics').select('id,slug').or(`email.eq.${clinicPayload.email},slug.eq.${clinicPayload.slug}`);
      if (existing?.length) {
        throw new Error('Já existe uma clínica com esse e-mail ou identificador.');
      }
      const { data, error } = await client.from('clinics').insert(clinicPayload).select().single();
      if (error) throw error;
      const defaultState = getDefaultState();
      const { error: contentError } = await client.from('clinic_content').upsert({
        clinic_slug: data.slug,
        items: defaultState.items || [],
        tv_settings: defaultState.tvSettings || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'clinic_slug' });
      if (contentError) throw contentError;
      setActiveClinic(data);
      return data;
    }

    const clinics = getLocalClinics();
    if (clinics.some((item) => item.email === clinicPayload.email || item.slug === clinicPayload.slug)) {
      throw new Error('Já existe uma clínica com esse e-mail ou identificador.');
    }
    clinics.push(clinicPayload);
    saveLocalClinics(clinics);
    saveLocalState(clinicPayload.slug, getDefaultState());
    setActiveClinic(clinicPayload);
    return clinicPayload;
  }

  async function updateClinic(payload) {
    const slug = getActiveClinic();
    if (!slug) throw new Error('Nenhuma clínica ativa.');
    const clinicPayload = {
      slug: slugify(payload.slug || slug),
      clinic_name: String(payload.clinicName || '').trim(),
      owner_name: String(payload.ownerName || '').trim(),
      email: String(payload.email || '').trim().toLowerCase(),
      phone: String(payload.phone || '').trim(),
      password: String(payload.password || '').trim(),
      plan: String(payload.plan || '').trim() || 'pro'
    };

    if (hasSupabase()) {
      const client = getClient();
      const { data, error } = await client
        .from('clinics')
        .update(clinicPayload)
        .eq('slug', slug)
        .select()
        .single();
      if (error) throw error;
      if (clinicPayload.slug !== slug) {
        await client.from('clinic_content').update({ clinic_slug: clinicPayload.slug }).eq('clinic_slug', slug);
      }
      setActiveClinic(data);
      return data;
    }

    const clinics = getLocalClinics();
    const index = clinics.findIndex((item) => item.slug === slug);
    if (index < 0) throw new Error('Clínica não encontrada.');
    clinics[index] = { ...clinics[index], ...clinicPayload };
    saveLocalClinics(clinics);
    if (clinicPayload.slug !== slug) {
      const state = getLocalState(slug);
      saveLocalState(clinicPayload.slug, state);
      localStorage.removeItem(LOCAL_STATE_PREFIX + slug);
    }
    setActiveClinic(clinics[index]);
    return clinics[index];
  }

  async function getClinicBySlug(slug) {
    const safeSlug = slugify(slug || getActiveClinic());
    if (!safeSlug) return null;
    if (hasSupabase()) {
      const client = getClient();
      const { data, error } = await client.from('clinics').select('*').eq('slug', safeSlug).maybeSingle();
      if (error) throw error;
      return data;
    }
    return getLocalClinics().find((item) => item.slug === safeSlug) || null;
  }

  async function getCurrentClinic() {
    return getClinicBySlug(getActiveClinic());
  }

  async function loadClinicState(slug) {
    const safeSlug = slugify(slug || getActiveClinic());
    if (!safeSlug) return { clinic: null, items: [], tvSettings: {}, source: hasSupabase() ? 'supabase' : 'local' };

    if (hasSupabase()) {
      const client = getClient();
      const [{ data: clinic, error: clinicError }, { data: content, error: contentError }] = await Promise.all([
        client.from('clinics').select('*').eq('slug', safeSlug).maybeSingle(),
        client.from('clinic_content').select('*').eq('clinic_slug', safeSlug).maybeSingle()
      ]);
      if (clinicError) throw clinicError;
      if (contentError) throw contentError;
      return {
        clinic,
        items: Array.isArray(content?.items) ? content.items : [],
        tvSettings: content?.tv_settings || {},
        updatedAt: content?.updated_at || null,
        source: 'supabase'
      };
    }

    return {
      clinic: getLocalClinics().find((item) => item.slug === safeSlug) || null,
      ...getLocalState(safeSlug),
      source: 'local'
    };
  }

  async function saveClinicState({ slug, items, tvSettings }) {
    const safeSlug = slugify(slug || getActiveClinic());
    if (!safeSlug) throw new Error('Defina a clínica antes de salvar.');
    const payload = {
      clinic_slug: safeSlug,
      items: Array.isArray(items) ? items : [],
      tv_settings: tvSettings || {},
      updated_at: new Date().toISOString()
    };

    if (hasSupabase()) {
      const client = getClient();
      const { error } = await client.from('clinic_content').upsert(payload, { onConflict: 'clinic_slug' });
      if (error) throw error;
    } else {
      saveLocalState(safeSlug, {
        items: payload.items,
        tvSettings: payload.tv_settings,
        updated_at: payload.updated_at
      });
    }

    localStorage.setItem(LEGACY_ITEMS_KEY, JSON.stringify(payload.items));
    localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(payload.tv_settings));
    return payload;
  }

  function subscribeClinicState(slug, callback) {
    const safeSlug = slugify(slug || getActiveClinic());
    if (!safeSlug || typeof callback !== 'function') return () => {};

    if (hasSupabase()) {
      const client = getClient();
      const channel = client
        .channel('clinic-content-' + safeSlug)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'clinic_content',
          filter: 'clinic_slug=eq.' + safeSlug
        }, (payload) => callback(payload.new || payload))
        .subscribe();

      return () => client.removeChannel(channel);
    }

    const handler = (e) => {
      if (e.key === LOCAL_STATE_PREFIX + safeSlug + ':ping') callback({ local: true });
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  window.TVReceptionDataService = {
    hasSupabase,
    getClient,
    uploadMediaFile,
    slugify,
    getActiveClinic,
    setActiveClinic,
    loginClinic,
    registerClinic,
    updateClinic,
    getCurrentClinic,
    getClinicBySlug,
    loadClinicState,
    saveClinicState,
    subscribeClinicState
  };
})();
