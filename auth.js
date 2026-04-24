(function () {
  const AUTH_KEY = 'tvReceptionAuthSession';

  function isAuthenticated() {
    return sessionStorage.getItem(AUTH_KEY) === '1';
  }

  async function login(email, password) {
    const clinic = await window.TVReceptionDataService.loginClinic(email, password);
    if (clinic) {
      sessionStorage.setItem(AUTH_KEY, '1');
      return clinic;
    }
    return null;
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem('tvReceptionAuthName');
    sessionStorage.removeItem('tvReceptionClinicName');
  }

  async function register(data) {
    const clinic = await window.TVReceptionDataService.registerClinic(data);
    sessionStorage.setItem(AUTH_KEY, '1');
    return clinic;
  }

  async function updateProfile(data) {
    const clinic = await window.TVReceptionDataService.updateClinic(data);
    return clinic;
  }

  async function getUser() {
    return window.TVReceptionDataService.getCurrentClinic();
  }

  async function forgotPassword(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) {
      return { ok: false, message: 'Digite o e-mail cadastrado da clínica.' };
    }
    if (window.TVReceptionDataService.hasSupabase()) {
      const clinic = await window.TVReceptionDataService.getClient()
        .from('clinics')
        .select('email,password')
        .eq('email', normalized)
        .maybeSingle();
      if (clinic.error || !clinic.data) {
        return { ok: false, message: 'Não encontramos esse e-mail no cadastro.' };
      }
      return { ok: true, message: 'Para teste rápido: ' + clinic.data.email + ' / ' + clinic.data.password };
    }
    const clinics = JSON.parse(localStorage.getItem('tvReceptionClinicsV1') || '[]');
    const clinic = clinics.find((item) => String(item.email || '').toLowerCase() === normalized);
    if (!clinic) {
      return { ok: false, message: 'Não encontramos esse e-mail no cadastro local.' };
    }
    return { ok: true, message: 'Para teste local: ' + clinic.email + ' / ' + clinic.password };
  }

  function getClinicName() {
    return sessionStorage.getItem('tvReceptionClinicName') || 'Sua clínica';
  }

  function requireAuth() {
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    const isNewRegister = new URLSearchParams(location.search).get('novo') === '1';
    if ((page === 'painel.html' || (page === 'configuracoes.html' && !isNewRegister)) && !isAuthenticated()) {
      location.replace('login.html');
    }
  }

  window.TVReceptionAuth = {
    isAuthenticated,
    login,
    logout,
    register,
    updateProfile,
    getUser,
    getClinicName,
    forgotPassword,
    requireAuth
  };

  requireAuth();
})();
