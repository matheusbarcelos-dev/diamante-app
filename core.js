/* Diamante App - núcleo: utilidades, API, interface base, autenticação e navegação */
(function () {
'use strict';
const D = window.D = { S: { user: null, config: {}, view: 'home', setup: false }, V: {}, act: {} };
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
D.$ = $; D.$$ = $$;

/* ---------- utilidades ---------- */
const esc = D.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = D.brl = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
const num = D.num = (v, d) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: d == null ? 0 : d }).format(Number(v) || 0);
D.pad = n => String(n).padStart(2, '0');
D.today = () => { const d = new Date(); return d.getFullYear() + '-' + D.pad(d.getMonth() + 1) + '-' + D.pad(d.getDate()); };
D.addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + D.pad(d.getMonth() + 1) + '-' + D.pad(d.getDate()); };
D.fdate = iso => { if (!iso) return ''; const p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0].slice(2) : iso; };
D.fdt = s => { if (!s) return 'nunca'; const p = String(s).split(/[ T]/); return D.fdate(p[0]) + ' ' + (p[1] || '').slice(0, 5); };
D.ago = s => { if (!s) return ''; const t = new Date(String(s).replace(' ', 'T')).getTime(); if (isNaN(t)) return ''; const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'agora'; if (m < 60) return m + ' min'; const h = Math.round(m / 60); if (h < 24) return h + ' h'; const d = Math.round(h / 24); return d + (d === 1 ? ' dia' : ' dias'); };
D.diffDays = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(D.today() + 'T12:00:00')) / 86400000);
D.first = n => String(n || '').trim().split(/\s+/)[0] || '';
D.initials = n => { const p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };

/* telefone brasileiro: devolve 55DDNXXXXXXXX ou '' se inválido */
D.phone = raw => {
  let d = String(raw || '').replace(/\D+/g, '').replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return (d.length >= 12 && d.length <= 13 && d.startsWith('55')) ? d : '';
};
D.fphone = p => {
  const d = String(p || '').replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p || '';
};
D.maskTel = v => { const d = String(v).replace(/\D/g, '').slice(0, 11); if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`; if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return d; };
D.clubeLink = () => new URL('clube.html?c=' + D.S.user.slug, location.href).href;
D.wa = (tel, text) => `https://wa.me/${tel}${text ? '?text=' + encodeURIComponent(text) : ''}`;

/* ---------- ranks e metas ---------- */
D.RANKS = ['Consultor', 'Manager', 'Director', 'Executive', 'Elite', 'Premier', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Blue Diamond', 'Presidential Diamond'];
// contatos = quantos chamar por dia quando você É esse rank (Consultor 3, Manager 4, Director 5 e assim por diante).
// Não existe meta de PV no app: o acompanhamento do rank é feito no escritório virtual (office.doterra.com).
D.RANK_DEF = {
  Consultor: { contatos: 3 }, Manager: { contatos: 4 }, Director: { contatos: 5 }, Executive: { contatos: 6 }, Elite: { contatos: 7 }, Premier: { contatos: 8 },
  Silver: { contatos: 9 }, Gold: { contatos: 10 }, Platinum: { contatos: 11 }, Diamond: { contatos: 12 }, 'Blue Diamond': { contatos: 13 }, 'Presidential Diamond': { contatos: 14 } };
D.OFFICE_URL = 'https://office.doterra.com';
D.CLUBE_META = 3; // pessoas por semana que precisam concluir a inscrição no Clube
D.rk = r => { const d = D.RANK_DEF[r] || D.RANK_DEF.Consultor; return { contatos: d.contatos }; };
D.nextRank = r => { const i = D.RANKS.indexOf(r); return i >= 0 && i < D.RANKS.length - 1 ? D.RANKS[i + 1] : null; };

/* ---------- API ---------- */
D.api = async (a, data) => {
  let r;
  try {
    r = await fetch('api.php?a=' + a, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'diamante' }, body: JSON.stringify(data || {}) });
  } catch (e) { throw new Error('Sem conexão com a internet. Verifique e tente de novo.'); }
  let j = null;
  try { j = await r.json(); } catch (e) { throw new Error('O servidor não respondeu direito. Confira se o api.php está no site e o PHP está ativo.'); }
  if (!j.ok) {
    const err = new Error(j.erro || 'Algo deu errado.'); err.status = r.status;
    if (r.status === 401 && D.S.user) { D.S.user = null; D.renderAuth('login'); }
    throw err;
  }
  return j;
};

/* ---------- interface base ---------- */
let toastT;
D.toast = (msg, bad) => {
  $('#toast') && $('#toast').remove();
  const t = document.createElement('div'); t.id = 'toast'; t.className = bad ? 'bad' : ''; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), bad ? 5000 : 3000);
};
D.fail = e => D.toast(e && e.message ? e.message : 'Algo deu errado.', true);

let lastFocus = null;
D.sheet = (title, html, onclose) => {
  D.closeSheet(true);
  lastFocus = document.activeElement;
  const o = document.createElement('div'); o.id = 'ov'; o.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="hd"><h2>${esc(title)}</h2><button class="x" data-act="close" aria-label="Fechar">×</button></div><div id="sheetbody">${html}</div></div>`;
  o._onclose = onclose;
  o.addEventListener('mousedown', e => { if (e.target === o) D.closeSheet(); });
  document.body.appendChild(o); document.body.style.overflow = 'hidden';
  const f = $('input,textarea,select', o); if (f && !f.value && !/date|checkbox/.test(f.type)) setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { } }, 60);
  return o;
};
D.closeSheet = quiet => {
  const o = $('#ov'); if (!o) return;
  const cb = o._onclose; o.remove(); document.body.style.overflow = '';
  if (lastFocus && lastFocus.focus && !quiet) { try { lastFocus.focus(); } catch (e) { } }
  if (cb && !quiet) cb();
};
D.confirm = (title, msg, okLabel, danger) => new Promise(res => {
  D.sheet(title, `<p>${esc(msg)}</p><div class="row" style="margin-top:16px"><button class="btn ghost sp" data-act="cf-no">Cancelar</button><button class="btn ${danger ? 'bad' : ''} sp" data-act="cf-yes">${esc(okLabel || 'Confirmar')}</button></div>`, () => res(false));
  D.act['cf-yes'] = () => { const o = $('#ov'); if (o) o._onclose = null; D.closeSheet(true); res(true); };
  D.act['cf-no'] = () => D.closeSheet();
});
D.busy = (btn, on) => { if (!btn) return; btn.disabled = !!on; if (on) { btn._t = btn.textContent; btn.textContent = 'Aguarde…'; } else if (btn._t) btn.textContent = btn._t; };
D.copy = async (txt, ok) => {
  try { await navigator.clipboard.writeText(txt); }
  catch (e) { const t = document.createElement('textarea'); t.value = txt; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (x) { } t.remove(); }
  D.toast(ok || 'Copiado! ✓');
};
D.val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
D.setErr = (msg, id) => { const e = document.getElementById(id || 'err'); if (e) { e.textContent = msg || ''; if (msg) e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } return !msg; };

/* ---------- navegação ---------- */
const NAV = [
  { v: 'home', i: '🏠', t: 'Início' }, { v: 'chamar', i: '📞', t: 'Chamar' }, { v: 'vendas', i: '💰', t: 'Vendas' },
  { v: 'estoque', i: '📦', t: 'Estoque' }, { v: 'anamnese', i: '📋', t: 'Anamnese' }, { v: 'clube', i: '💎', t: 'Clube' }];
const SIDE = NAV.concat([{ v: 'followup', i: '🔔', t: 'Follow-up' }, { v: 'metas', i: '🎯', t: 'Metas do dia' }, { v: 'historico', i: '🗓️', t: 'Histórico por mês' }, { v: 'tutorial', i: '🎓', t: 'Tutorial' }, { v: 'conta', i: '👤', t: 'Minha conta' }]);
D.go = (v, push) => { if (push !== false) { try { history.pushState({ v }, '', '#/' + v); } catch (e) { location.hash = '#/' + v; } } D.S.view = v; D.show(); window.scrollTo(0, 0); };
window.addEventListener('popstate', () => { const v = (location.hash.match(/^#\/(\w+)/) || [])[1]; if (D.S.user && D.V[v]) { D.S.view = v; D.show(); } else if (D.S.user) { D.S.view = 'home'; D.show(); } });

D.badges = () => D.S.badges || {};
D.renderShell = () => {
  const u = D.S.user, b = D.badges();
  const dot = v => { const n = v === 'followup' ? b.followups : v === 'anamnese' ? b.ana : v === 'clube' ? b.clube : v === 'estoque' ? b.estoque : 0; return n ? `<span class="dot">${n > 99 ? '99+' : n}</span>` : ''; };
  const side = SIDE.concat(u.role === 'admin' ? [{ v: 'admin', i: '🛠️', t: 'Administração' }] : []);
  $('#root').innerHTML = `<div id="shell">
    <aside id="side"><div class="brand"><img src="logo.png" alt=""><div><b>Diamante App</b><span>${esc(D.first(u.nome))} · ${esc(u.rank)}</span></div></div>
      ${side.map(n => `<button class="it" data-v="${n.v}" data-act="nav"><i>${n.i}</i>${n.t}${dot(n.v)}</button>`).join('')}
      <div class="sp"></div><button class="it" data-act="logout"><i>🚪</i>Sair</button></aside>
    <main id="main" tabindex="-1"></main></div>
    <nav id="nav" aria-label="Menu principal">${NAV.map(n => `<button data-v="${n.v}" data-act="nav" aria-label="${n.t}"><i>${n.i}</i>${n.t}${dot(n.v)}</button>`).join('')}</nav>`;
};
D.markNav = () => { $$('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === D.S.view)); };
D.show = async () => {
  if (!D.S.user) return D.renderAuth('login');
  if (!$('#shell')) D.renderShell();
  D.markNav();
  const v = D.V[D.S.view] || D.V.home, m = $('#main');
  m.innerHTML = '<div class="empty"><div class="em">💜</div>Carregando…</div>';
  try { await v(m); } catch (e) { if (e.status !== 401) { m.innerHTML = `<div class="card center"><div class="em" style="font-size:44px">😕</div><h2>Não deu certo</h2><p class="muted">${esc(e.message)}</p><button class="btn" data-act="reload">Tentar de novo</button></div>`; } }
  D.markNav();
};
D.refreshBadges = async () => {
  try {
    const r = await D.api('resumo'); D.S.resumo = r;
    D.S.badges = { followups: r.followups, ana: r.ana_novas, estoque: r.estoque_baixo, clube: r.clube_novos };
    const b = D.S.badges;
    $$('[data-v]').forEach(btn => { const v = btn.dataset.v; const n = v === 'followup' ? b.followups : v === 'anamnese' ? b.ana : v === 'clube' ? b.clube : v === 'estoque' ? b.estoque : 0; let d = $('.dot', btn); if (n) { if (!d) { d = document.createElement('span'); d.className = 'dot'; btn.appendChild(d); } d.textContent = n > 99 ? '99+' : n; } else if (d) d.remove(); });
    return r;
  } catch (e) { return D.S.resumo; }
};
D.page = (title, inner, back) => `${back === false ? '' : '<button class="back" data-act="home">← Início</button>'}<h1 style="margin-bottom:16px">${title}</h1>${inner}`;

/* ---------- autenticação ---------- */
const A = { mode: 'welcome', step: 1, f: { nome: '', email: '', whatsapp: '', rank: 'Consultor' } };
D.renderAuth = (mode) => {
  A.mode = mode || 'welcome'; D.S.user = null;
  const logo = '<img class="logo" src="logo.png" alt="Diamante App">';
  let h = '';
  if (A.mode === 'welcome') {
    h = `${logo}<h1>Diamante App</h1><p class="sub">Seu painel diário de consultor de bem-estar doTERRA.<br>Metas, contatos, vendas e estoque em um só lugar.</p>
      <div class="stack"><button class="btn block" data-act="auth-go" data-m="login">Já tenho conta · Entrar</button>
      <button class="btn block sec2" data-act="auth-go" data-m="reg">Criar minha conta</button></div>
      ${D.S.setup ? '<p class="center small" style="margin-top:22px"><a href="#" data-act="auth-go" data-m="setup">Primeiro acesso do administrador</a></p>' : ''}`;
  } else if (A.mode === 'login') {
    h = `${logo}<h1>Entrar</h1><p class="sub">Use o e-mail e a senha que você cadastrou.</p>
      <form id="fLogin" novalidate><div class="field"><label for="lEmail">E-mail</label><input id="lEmail" type="email" inputmode="email" autocomplete="username" autocapitalize="none" value="${esc(A.f.email)}"></div>
      <div class="field"><label for="lPw">Senha</label><div class="pw"><input id="lPw" type="password" autocomplete="current-password"><button type="button" data-act="showpw" data-t="lPw">Mostrar</button></div></div>
      <div class="err" id="err" role="alert"></div><button class="btn block" type="submit" style="margin-top:8px">Entrar</button></form>
      <p class="center" style="margin-top:18px"><button class="back" data-act="auth-go" data-m="welcome">← Voltar</button></p>`;
  } else if (A.mode === 'reg') {
    const dots = `<div class="dots">${[1, 2, 3].map(i => `<i class="${i <= A.step ? 'on' : ''}"></i>`).join('')}</div>`;
    let body = '';
    if (A.step === 1) body = `<h1>Vamos criar sua conta</h1><p class="sub">Passo 1 de 3 · Quem é você?</p>
      <div class="field"><label for="rNome">Nome completo</label><input id="rNome" type="text" autocomplete="name" placeholder="Maria da Silva" value="${esc(A.f.nome)}"></div>
      <div class="field"><label for="rEmail">E-mail</label><input id="rEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" placeholder="voce@email.com" value="${esc(A.f.email)}"></div>`;
    else if (A.step === 2) body = `<h1>Seu WhatsApp e rank</h1><p class="sub">Passo 2 de 3</p>
      <div class="field"><label for="rWa">WhatsApp (com DDD)</label><input id="rWa" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(62) 99999-9999" value="${esc(A.f.whatsapp)}"></div>
      <div class="field"><label>Qual é o seu rank na doTERRA hoje?</label><div class="rk">${D.RANKS.map(r => `<button type="button" class="${A.f.rank === r ? 'on' : ''}" data-act="pick-rank" data-r="${r}">${r}</button>`).join('')}</div></div>`;
    else body = `<h1>Crie uma senha</h1><p class="sub">Passo 3 de 3 · Mínimo de 8 caracteres, com letras e números.</p>
      <div class="field"><label for="rPw">Senha</label><div class="pw"><input id="rPw" type="password" autocomplete="new-password"><button type="button" data-act="showpw" data-t="rPw">Mostrar</button></div></div>
      <div class="field"><label for="rPw2">Repita a senha</label><input id="rPw2" type="password" autocomplete="new-password"></div>`;
    h = `${dots}<form id="fReg" novalidate>${body}<div class="err" id="err" role="alert"></div>
      <div class="row" style="margin-top:12px">${A.step > 1 ? '<button class="btn ghost" type="button" data-act="reg-back">Voltar</button>' : '<button class="btn ghost" type="button" data-act="auth-go" data-m="welcome">Voltar</button>'}<button class="btn sp" type="submit">${A.step === 3 ? 'Criar conta' : 'Continuar'}</button></div></form>`;
  } else if (A.mode === 'setup') {
    h = `${logo}<h1>Conta administradora</h1><p class="sub">Cria o acesso que enxerga a produção de todos. Precisa da <b>chave de configuração</b> que está no arquivo <code>config.php</code>.</p>
      <form id="fSetup" novalidate>
      <div class="field"><label for="sKey">Chave de configuração</label><input id="sKey" type="text" autocomplete="off" autocapitalize="none"></div>
      <div class="field"><label for="sNome">Nome completo</label><input id="sNome" type="text" autocomplete="name"></div>
      <div class="field"><label for="sEmail">E-mail</label><input id="sEmail" type="email" autocomplete="email" autocapitalize="none"></div>
      <div class="field"><label for="sWa">WhatsApp</label><input id="sWa" type="tel" autocomplete="tel-national" placeholder="(62) 99999-9999"></div>
      <div class="field"><label for="sPw">Senha (mín. 8, letras e números)</label><div class="pw"><input id="sPw" type="password" autocomplete="new-password"><button type="button" data-act="showpw" data-t="sPw">Mostrar</button></div></div>
      <div class="err" id="err" role="alert"></div><button class="btn block" type="submit">Criar administrador</button></form>
      <p class="center" style="margin-top:16px"><button class="back" data-act="auth-go" data-m="welcome">← Voltar</button></p>`;
  }
  $('#root').innerHTML = `<div class="auth"><div class="box">${h}</div></div>`;
  const f = $('input'); if (f && A.mode !== 'welcome') setTimeout(() => { try { f.focus({ preventScroll: true }); } catch (e) { } }, 60);
};
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const pwOk = p => p.length >= 8 && /[A-Za-zÀ-ÿ]/.test(p) && /\d/.test(p);
const nameOk = n => n.trim().split(/\s+/).filter(Boolean).length >= 2;
D.enter = async () => {
  const me = await D.api('me');
  D.S.user = me.user; D.S.config = me.config || {}; D.S.setup = me.precisa_setup;
  if (!D.S.user) return D.renderAuth('welcome');
  const v = (location.hash.match(/^#\/(\w+)/) || [])[1];
  D.S.view = D.V[v] ? v : 'home';
  D.renderShell(); D.show(); D.refreshBadges();
};
D.submitAuth = async (form) => {
  const btn = $('button[type=submit]', form);
  try {
    if (form.id === 'fLogin') {
      const email = D.val('lEmail').trim(), pw = D.val('lPw');
      A.f.email = email;
      if (!emailOk(email)) return D.setErr('Digite o seu e-mail completo.');
      if (!pw) return D.setErr('Digite a sua senha.');
      D.setErr(''); D.busy(btn, true); await D.api('login', { email, senha: pw }); await D.enter();
    } else if (form.id === 'fReg') {
      if (A.step === 1) {
        A.f.nome = D.val('rNome').trim(); A.f.email = D.val('rEmail').trim().toLowerCase();
        if (!nameOk(A.f.nome)) return D.setErr('Digite seu nome completo (nome e sobrenome).');
        if (!emailOk(A.f.email)) return D.setErr('Esse e-mail parece incorreto. Exemplo: nome@email.com');
        A.step = 2; return D.renderAuth('reg');
      }
      if (A.step === 2) {
        A.f.whatsapp = D.val('rWa').trim();
        if (!D.phone(A.f.whatsapp)) return D.setErr('WhatsApp inválido. Digite com DDD, por exemplo (62) 99999-9999.');
        A.step = 3; return D.renderAuth('reg');
      }
      const p1 = D.val('rPw'), p2 = D.val('rPw2');
      if (!pwOk(p1)) return D.setErr('A senha precisa ter pelo menos 8 caracteres, com letras e números.');
      if (p1 !== p2) return D.setErr('As duas senhas não são iguais.');
      D.setErr(''); D.busy(btn, true);
      await D.api('register', { nome: A.f.nome, email: A.f.email, whatsapp: A.f.whatsapp, rank: A.f.rank, senha: p1 });
      A.f = { nome: '', email: '', whatsapp: '', rank: 'Consultor' }; A.step = 1; await D.enter(); D.toast('Conta criada! Bem-vinda(o) 💜');
    } else if (form.id === 'fSetup') {
      const d = { chave: D.val('sKey').trim(), nome: D.val('sNome').trim(), email: D.val('sEmail').trim(), whatsapp: D.val('sWa').trim(), rank: 'Diamond', senha: D.val('sPw') };
      if (!d.chave) return D.setErr('Digite a chave de configuração (arquivo config.php).');
      if (!nameOk(d.nome)) return D.setErr('Digite seu nome completo.');
      if (!emailOk(d.email)) return D.setErr('E-mail inválido.');
      if (!D.phone(d.whatsapp)) return D.setErr('WhatsApp inválido (use DDD).');
      if (!pwOk(d.senha)) return D.setErr('A senha precisa ter 8+ caracteres, com letras e números.');
      D.setErr(''); D.busy(btn, true); await D.api('setup_admin', d); await D.enter(); D.toast('Administrador criado ✓');
    }
  } catch (e) { D.busy(btn, false); D.setErr(e.message); }
};

/* ---------- eventos ---------- */
document.addEventListener('submit', e => { if (e.target.closest('.auth')) { e.preventDefault(); D.submitAuth(e.target); } });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.type === 'tel') t.value = D.maskTel(t.value);
  if (D.onInput) D.onInput(e);
});
document.addEventListener('change', e => { if (D.onChange) D.onChange(e); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') D.closeSheet(); });
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act;
  const core = {
    close: () => D.closeSheet(), reload: () => D.show(), home: () => D.go('home'),
    nav: () => D.go(el.dataset.v),
    'auth-go': () => { e.preventDefault(); A.step = 1; D.renderAuth(el.dataset.m); },
    'pick-rank': () => { A.f.rank = el.dataset.r; $$('.rk button').forEach(b => b.classList.toggle('on', b === el)); },
    'reg-back': () => { A.step = Math.max(1, A.step - 1); D.renderAuth('reg'); },
    showpw: () => { const i = document.getElementById(el.dataset.t); if (i) { const s = i.type === 'password'; i.type = s ? 'text' : 'password'; el.textContent = s ? 'Ocultar' : 'Mostrar'; } },
    logout: async () => { try { await D.api('logout'); } catch (x) { } D.S.user = null; D.S.resumo = null; D.S.badges = null; history.replaceState(null, '', location.pathname); const me = await D.api('me').catch(() => ({})); D.S.setup = !!me.precisa_setup; D.renderAuth('welcome'); }
  };
  const fn = core[a] || D.act[a];
  if (!fn) return;
  if (el.tagName === 'A' && a !== 'auth-go' && el.getAttribute('href') === '#') e.preventDefault();
  try { await fn(el, e); } catch (err) { D.busy(el, false); if (err && err.message) D.fail(err); }
});

D.boot = async () => {
  try { await D.enter(); }
  catch (e) { $('#root').innerHTML = `<div class="auth"><div class="box center"><img class="logo" src="logo.png" alt=""><h1>Ops!</h1><p class="sub">${esc(e.message)}</p><button class="btn block" onclick="location.reload()">Tentar de novo</button></div></div>`; }
};
})();
