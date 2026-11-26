/* Diamante App - telas: início (metas), chamar contatos, metas do dia */
(function () {
'use strict';
const D = window.D, esc = D.esc, $ = D.$, $$ = D.$$;
D.inputs = {};
D.onInput = e => { const f = D.inputs[e.target.id]; if (f) f(e); };
D.onChange = e => { const f = D.changes && D.changes[e.target.id]; if (f) f(e); };
D.changes = {};

/* catálogo */
const CAT = window.CATALOGO || [];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
CAT.forEach(p => { p._k = norm(p.n + ' ' + p.t + ' ' + p.c + ' ' + p.s); });
D.catBySku = {}; CAT.forEach(p => { D.catBySku[p.s] = p; });
D.CATS = ['Todos', 'Óleo Essencial', 'Mix de Óleos', 'Roll-On', 'Emotional Aromatherapy', 'Suplementos e Alimentos', 'Cuidados Pessoais', 'Kits e Acessórios'];
D.searchCat = (q, cat) => {
  const t = norm(q).split(/\s+/).filter(Boolean);
  return CAT.filter(p => (!cat || cat === 'Todos' || p.c === cat) && t.every(w => p._k.includes(w))).slice(0, 60);
};
D.prodName = p => p.n + (p.t && p.t !== '—' ? ' · ' + p.t : '');

/* seletor de produto reutilizável */
let pick = { cb: null, cat: 'Todos' };
D.pickProduct = cb => {
  pick = { cb, cat: 'Todos' };
  D.sheet('Escolha o produto', `<input id="pq" type="search" placeholder="Digite: lavanda, deep blue, kit…" autocomplete="off">
    <div class="chips" style="margin-top:10px" id="pcats">${D.CATS.map(c => `<button class="chip ${c === 'Todos' ? 'on' : ''}" data-act="pp-cat" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
    <div class="list" id="plist"></div>`);
  pickRender();
};
function pickRender() {
  const r = D.searchCat(D.val('pq'), pick.cat), box = $('#plist'); if (!box) return;
  box.innerHTML = r.length ? r.map(p => `<button class="prod" data-act="pp-sel" data-s="${p.s}"><div class="t"><b>${esc(p.n)}</b><span>${esc(p.t)} · ${esc(p.c)}</span></div><div class="pr">${D.brl(p.r)}<span>${p.p} PV · membro ${D.brl(p.m)}</span></div></button>`).join('')
    : `<div class="empty">Nenhum produto encontrado.<br><button class="btn sm sec2" style="margin-top:10px" data-act="pp-manual">Digitar um produto que não está na lista</button></div>`;
}
D.inputs.pq = pickRender;
D.act['pp-cat'] = el => { pick.cat = el.dataset.c; $$('#pcats .chip').forEach(c => c.classList.toggle('on', c === el)); pickRender(); };
D.act['pp-sel'] = el => { const p = D.catBySku[el.dataset.s]; const cb = pick.cb; D.closeSheet(true); if (cb && p) cb(p); };
D.act['pp-manual'] = () => {
  const nome = D.val('pq').trim(); if (nome.length < 2) return D.toast('Digite o nome do produto no campo de busca.', true);
  const cb = pick.cb; D.closeSheet(true); if (cb) cb({ s: '', n: nome, t: '', r: 0, m: 0, p: 0, c: 'Outro' });
};

/* ================= INÍCIO ================= */
D.V.home = async m => {
  const r = await D.refreshBadges(), u = D.S.user;
  const cur = D.rk(u.rank), nx = D.nextRank(u.rank);
  const alvo = cur.contatos, ch = r.hoje.chamados, okDia = ch >= alvo;
  const hr = new Date().getHours(), sau = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  const tile = (act, ic, t, sub, n) => `<button class="tile" data-act="${act}"><i>${ic}</i><b>${t}</b><span>${sub}</span>${n ? `<span class="dot">${n}</span>` : ''}</button>`;
  const cl = r.clube_semana, cm = r.clube_meta, clOk = cl >= cm;
  m.innerHTML = `
    <div class="hello"><button class="av" data-act="nav" data-v="conta" aria-label="Minha conta">${esc(D.initials(u.nome))}</button>
      <div class="sp"><div class="muted small">${sau},</div><h1 style="font-size:24px">${esc(D.first(u.nome))}</h1></div><span class="pill">💎 ${esc(u.rank)}</span></div>
    <section class="card tint hero" aria-label="Seu rank">
      <div class="small muted">SEU RANK</div>
      ${nx ? `<div class="rankvs"><div class="rk"><span>Rank atual</span><b>💎 ${esc(u.rank)}</b></div><div class="arr" aria-hidden="true">→</div><div class="rk nx"><span>Próximo rank</span><b>⭐ ${esc(nx)}</b></div></div>`
           : `<div class="rankvs"><div class="rk"><span>Rank atual</span><b>💎 ${esc(u.rank)}</b></div></div><p style="margin:6px 0 0">Você está no topo. Continue formando líderes!</p>`}
      <a class="btn sm sec2 block" style="margin-top:14px" href="${D.OFFICE_URL}" target="_blank" rel="noopener noreferrer">Verificar meta no escritório virtual ↗</a>
    </section>
    <section class="sec"><h2>Hoje, o que fazer</h2><div class="list">
      ${D.tutCard ? D.tutCard() : ''}
      <button class="task ${okDia ? 'done' : ''}" data-act="nav" data-v="chamar"><div class="ic">${okDia ? '✅' : '📞'}</div><div class="t"><b>Chamar ${alvo} contatos</b><span>${okDia ? 'Meta do dia batida! 🎉' : `Você já chamou ${ch} de ${alvo}`}</span></div><div class="go">›</div></button>
      <button class="task ${clOk ? 'done' : ''}" data-act="nav" data-v="clube"><div class="ic">${clOk ? '✅' : '💎'}</div><div class="t"><b>Trazer ${cm} pessoas para o Clube esta semana</b><span>${clOk ? 'Meta da semana batida! 🎉' : `${cl} de ${cm} inscrições concluídas`}</span></div><div class="go">›</div></button>
      <button class="task ${r.followups ? '' : 'done'}" data-act="nav" data-v="followup"><div class="ic">${r.followups ? '🔔' : '✅'}</div><div class="t"><b>${r.followups ? `${r.followups} cliente${r.followups > 1 ? 's' : ''} para dar follow-up` : 'Nenhum follow-up pendente'}</b><span>${r.followups ? 'O óleo deles deve estar acabando. Hora da revenda!' : 'Tudo em dia por aqui'}</span></div><div class="go">›</div></button>
      ${r.estoque_baixo ? `<button class="task" data-act="nav" data-v="estoque"><div class="ic">📦</div><div class="t"><b>${r.estoque_baixo} produto${r.estoque_baixo > 1 ? 's' : ''} acabando no estoque</b><span>Veja o que repor</span></div><div class="go">›</div></button>` : ''}
    </div></section>
    <section class="sec"><h2>O que você quer fazer?</h2><div class="tiles">
      ${tile('nav" data-v="chamar', '📞', 'Chamar contatos', 'Lista, WhatsApp e roteiro', '')}
      ${tile('venda-new', '💰', 'Registrar venda', 'Anote e agende o lembrete')}
      ${tile('nav" data-v="clube', '💎', 'Clube de Vantagens', 'Link, QR Code e inscrições', r.clube_novos)}
      ${tile('nav" data-v="followup', '🔔', 'Follow-up', 'Quem precisa repor', r.followups)}
      ${tile('nav" data-v="estoque', '📦', 'Meu estoque', 'Óleos e produtos', r.estoque_baixo)}
      ${tile('nav" data-v="metas', '🎯', 'Metas do dia', 'Chamei, interessou, vendi')}
      ${tile('nav" data-v="anamnese', '📋', 'Anamnese', 'Link e CRM de respostas', r.ana_novas)}
      ${tile('nav" data-v="historico', '🗓️', 'Histórico por mês', 'Tudo que você fez, mês a mês')}
      ${tile('nav" data-v="tutorial', '🎓', 'Tutorial', 'Aula para começar com o pé direito', '')}
      ${u.role === 'admin' ? tile('nav" data-v="admin', '🛠️', 'Administração', 'Produção, histórico e backup') : ''}
    </div></section>`;
};

/* ================= CHAMAR CONTATOS ================= */
const C = D.C = { listas: [], listaId: null, leads: [], curId: null, filter: 'novo', skip: [] };
const MSG = {
  m1: n => `Oii, ${n}! Tá por aí? Queria te mostrar uma coisa que descobri 🤭`,
  m2a: () => 'Pois é, eu descobri um negócio que eu lembrei de você na hora que eu vi.',
  m2b: () => 'É como uma anamnese, que dá pra marcar tudo que você gostaria de melhorar na sua saúde, e ele te sugere como melhorar isso de forma totalmente natural. Quer ver?',
  m3: (n, link) => `${n}, ele recomenda uns óleos essenciais da doTERRA, que são maravilhosos. Eu comecei a usar, e não parei mais, tem um de hortelã que eu tiro minha enxaqueca na hora. Eles são totalmente puros, e tem pra tuuudo que você imaginar! E vou te falar, funciona muito. Faz a anamnese aqui e me conta quais que indicou: ${link}`
};
D.anaLink = () => new URL('anamnese.html?c=' + D.S.user.slug, location.href).href;
const ST = { novo: ['Novo', ''], chamado: ['Chamado', 'warn'], respondeu: ['Respondeu', 'warn'], interessado: ['Interessado 😍', 'ok'], cliente: ['Virou cliente 💜', 'ok'], sem_interesse: ['Sem interesse', 'bad'] };
D.stPill = s => { const x = ST[s] || ST.novo; return `<span class="pill ${x[1]}">${x[0]}</span>`; };

D.V.chamar = async m => {
  const [rl, rs] = await Promise.all([D.api('listas'), D.refreshBadges()]);
  C.listas = rl.listas;
  if (!C.listas.some(l => l.id === C.listaId)) { C.listaId = C.listas[0] ? C.listas[0].id : null; C.curId = null; C.skip = []; }
  if (C.listaId) C.leads = (await D.api('leads', { lista_id: C.listaId })).leads; else C.leads = [];
  drawChamar(m || $('#main'));
};
function drawChamar(m) {
  const rs = D.S.resumo, alvo = D.rk(D.S.user.rank).contatos, ch = rs ? rs.hoje.chamados : 0;
  const pct = Math.min(100, Math.round(ch / alvo * 100));
  const chips = C.listas.map(l => `<button class="chip ${l.id === C.listaId ? 'on' : ''}" data-act="lista-sel" data-id="${l.id}">${esc(l.nome)} · ${l.novos}/${l.total}</button>`).join('') + '<button class="chip" data-act="import-open">＋ Nova lista</button>';
  m.innerHTML = D.page('Chamar contatos', `
    <div class="card"><div class="row"><b class="sp">Hoje você chamou</b><span class="b" style="font-size:22px">${ch} / ${alvo}</span></div>
      <div class="bar light" style="margin:10px 0 4px"><i style="width:${Math.max(pct, 2)}%"></i></div>
      <div class="small muted">${ch >= alvo ? '🎉 Meta do dia batida! Cada conversa a mais é bônus.' : `Faltam ${alvo - ch} contato${alvo - ch > 1 ? 's' : ''} para bater a meta de hoje.`}</div></div>
    ${C.listas.length ? `<div class="sec"><div class="chips" aria-label="Suas listas">${chips}</div><div id="leadbox"></div><div id="guide"></div><div id="leadlist"></div></div>` : `
    <div class="card center" style="margin-top:14px"><div class="em" style="font-size:52px">📇</div><h2>Importe sua primeira lista</h2><p class="muted">Dê um nome para a lista (ex.: “Amigos da igreja”) e traga os contatos da sua agenda. Depois é só chamar um de cada vez.</p><button class="btn block" data-act="import-open">Importar contatos</button></div>`}`);
  if (C.listas.length) { drawLead(); drawGuide(); drawLeadList(); }
}
function curLead() {
  let l = C.leads.find(x => x.id === C.curId);
  if (!l) l = C.leads.find(x => x.status === 'novo' && !C.skip.includes(x.id));
  return l || null;
}
function drawLead() {
  const box = $('#leadbox'); if (!box) return;
  const lista = C.listas.find(l => l.id === C.listaId), l = curLead();
  const novos = C.leads.filter(x => x.status === 'novo').length;
  if (!l) {
    box.innerHTML = `<div class="card center"><div class="em" style="font-size:50px">${novos ? '⏭️' : '🏁'}</div><h2>${novos ? 'Você pulou todos os que restavam' : 'Lista concluída!'}</h2><p class="muted">${novos ? 'Volte aos pulados quando quiser.' : `Você trabalhou os ${C.leads.length} contatos de “${esc(lista.nome)}”. Veja abaixo quem respondeu e quem tem interesse.`}</p>${novos ? '<button class="btn" data-act="skip-reset">Voltar aos pulados</button>' : '<button class="btn sec2" data-act="import-open">Importar outra lista</button>'}</div>`;
    return;
  }
  C.curId = l.id;
  const pos = C.leads.indexOf(l) + 1, nome = D.first(l.nome), isNew = l.status === 'novo';
  const m1 = MSG.m1(nome);
  box.innerHTML = `<div class="card lead">
    <span class="pill">Contato ${pos} de ${C.leads.length} · ${novos} para chamar</span>
    <div class="nm">${esc(l.nome)}</div><div class="tel">${esc(D.fphone(l.telefone))}</div><div style="margin:8px 0">${D.stPill(l.status)}</div>
    <a class="btn wa block" data-act="lead-wa" data-id="${l.id}" href="${D.wa(l.telefone, m1)}" target="_blank" rel="noopener">💬 ${isNew ? 'Chamar no WhatsApp' : 'Abrir WhatsApp de novo'}</a>
    ${isNew ? `<p class="small muted" style="margin-top:10px">Já vai com a mensagem pronta:</p><div class="msg" style="text-align:left">${esc(m1)}</div>` : ''}
    ${isNew ? `<div class="row" style="margin-top:14px"><button class="btn ghost sp" data-act="lead-skip">Pular</button><button class="btn ghost sp" data-act="lead-st" data-st="sem_interesse">Não chamar</button></div>` : `
    <div class="step-lb" style="text-align:center">Como foi a conversa?</div>
    <div class="stack"><button class="btn ok block" data-act="lead-st" data-st="interessado">😍 Tem interesse</button>
    <div class="row"><button class="btn sec2 sp" data-act="lead-st" data-st="respondeu">Respondeu</button><button class="btn sec2 sp" data-act="lead-st" data-st="sem_interesse">Sem interesse</button></div>
    <button class="btn block" data-act="lead-next">Próximo contato →</button></div>`}
  </div>`;
}
function drawGuide() {
  const g = $('#guide'); if (!g) return;
  const l = curLead(); if (!l) { g.innerHTML = ''; return; }
  const n = D.first(l.nome), link = D.anaLink();
  const steps = [
    ['1 · Abertura', 'Já vai junto quando você toca em “Chamar no WhatsApp”.', [MSG.m1(n)]],
    ['2 · Quando a pessoa responder', 'Mande a primeira, espere um instante e mande a segunda em seguida.', [MSG.m2a(), MSG.m2b()]],
    ['3 · Depois da resposta dela', 'Envia o link da sua anamnese personalizada.', [MSG.m3(n, link)]]];
  g.innerHTML = `<div class="card" style="margin-top:14px"><h2>Como conduzir a conversa</h2><p class="small muted">Para falar com <b>${esc(n)}</b>. Toque em “Copiar” ou envie direto pelo WhatsApp.</p>` +
    steps.map((s, si) => `<div class="step-lb">${s[0]}</div><p class="small muted" style="margin-bottom:6px">${s[1]}</p>` + s[2].map((t, ti) => `<div class="msg">${esc(t)}</div><div class="row" style="margin:8px 0 12px"><button class="btn sm sec2 sp" data-act="copy-msg" data-s="${si}" data-t="${ti}">Copiar</button><a class="btn sm wa sp" target="_blank" rel="noopener" href="${D.wa(l.telefone, t)}">Enviar no WhatsApp</a></div>`).join('')).join('') + '</div>';
  g._steps = steps;
}
function drawLeadList() {
  const box = $('#leadlist'); if (!box) return;
  const f = C.filter, L = C.leads;
  const cnt = { novo: L.filter(x => x.status === 'novo').length, conv: L.filter(x => ['chamado', 'respondeu', 'interessado'].includes(x.status)).length };
  let show = f === 'novo' ? L.filter(x => x.status === 'novo') : f === 'conv' ? L.filter(x => ['chamado', 'respondeu', 'interessado'].includes(x.status)) : L;
  box.innerHTML = `<div class="sec"><h2>Seus contatos</h2><div class="seg" style="margin-bottom:12px"><button class="${f === 'novo' ? 'on' : ''}" data-act="lead-filter" data-f="novo">Para chamar (${cnt.novo})</button><button class="${f === 'conv' ? 'on' : ''}" data-act="lead-filter" data-f="conv">Conversando (${cnt.conv})</button><button class="${f === 'todos' ? 'on' : ''}" data-act="lead-filter" data-f="todos">Todos</button></div>
    <div class="list">${show.slice(0, 80).map(l => `<div class="item click" data-act="lead-pick" data-id="${l.id}"><div class="av">${esc(D.initials(l.nome))}</div><div class="t"><b>${esc(l.nome)}</b><span>${esc(D.fphone(l.telefone))}</span></div>${D.stPill(l.status)}</div>`).join('') || '<div class="empty">Nenhum contato aqui.</div>'}${show.length > 80 ? `<p class="center small muted">E mais ${show.length - 80}… use os filtros acima.</p>` : ''}</div>
    <div class="row" style="margin-top:16px"><button class="btn sm ghost sp" data-act="lista-del">Apagar esta lista</button></div></div>`;
}
D.act['lista-sel'] = async el => { C.listaId = Number(el.dataset.id); C.curId = null; C.skip = []; C.filter = 'novo'; C.leads = (await D.api('leads', { lista_id: C.listaId })).leads; drawChamar($('#main')); };
D.act['lead-filter'] = el => { C.filter = el.dataset.f; drawLeadList(); };
D.act['lead-pick'] = el => { C.curId = Number(el.dataset.id); drawLead(); drawGuide(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
D.act['lead-skip'] = () => { if (C.curId) C.skip.push(C.curId); C.curId = null; drawLead(); drawGuide(); };
D.act['skip-reset'] = () => { C.skip = []; C.curId = null; drawLead(); drawGuide(); };
D.act['lead-next'] = () => { C.curId = null; drawLead(); drawGuide(); drawLeadList(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
async function setStatus(l, st) {
  await D.api('lead_status', { id: l.id, status: st }); l.status = st;
  const li = C.listas.find(x => x.id === C.listaId); if (li) { li.novos = C.leads.filter(x => x.status === 'novo').length; }
  await D.refreshBadges();
  const pg = $('#main .card .b'); if (pg && D.S.resumo) pg.textContent = D.S.resumo.hoje.chamados + ' / ' + D.rk(D.S.user.rank).contatos;
}
D.act['lead-wa'] = async el => {
  const l = C.leads.find(x => x.id === Number(el.dataset.id)); if (!l) return;
  if (l.status === 'novo') { await setStatus(l, 'chamado'); setTimeout(() => { drawLead(); drawGuide(); drawLeadList(); }, 400); D.toast('Marcado como chamado ✓'); }
};
D.act['lead-st'] = async el => {
  const l = curLead(); if (!l) return; const st = el.dataset.st;
  await setStatus(l, st);
  if (st === 'sem_interesse') { C.curId = null; D.toast('Ok, sem problema 💜'); }
  else if (st === 'interessado') D.toast('Que ótimo! Mande agora o link da anamnese (passo 3) 😍');
  drawLead(); drawGuide(); drawLeadList(); drawChamarCounter();
};
function drawChamarCounter() { const c = $('#main .card .b'); if (c && D.S.resumo) c.textContent = D.S.resumo.hoje.chamados + ' / ' + D.rk(D.S.user.rank).contatos; }
D.act['copy-msg'] = el => { const g = $('#guide'); if (g && g._steps) D.copy(g._steps[el.dataset.s][2][el.dataset.t], 'Mensagem copiada ✓'); };
D.act['lista-del'] = async () => {
  const l = C.listas.find(x => x.id === C.listaId); if (!l) return;
  if (!await D.confirm('Apagar a lista?', `A lista “${l.nome}” e seus ${l.total} contatos serão apagados. Isso não tem volta.`, 'Apagar', true)) return;
  await D.api('lista_apagar', { id: l.id }); C.listaId = null; D.toast('Lista apagada'); D.V.chamar();
};

/* ----- importação de contatos ----- */
const IMP = { rows: [], inv: 0, dup: 0 };
function decodeQP(s) { try { const b = s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (_, h) => '%' + h); return decodeURIComponent(b); } catch (e) { return s; } }
D.parseContacts = txt => {
  const out = []; txt = String(txt || '').replace(/^﻿/, '');
  if (/BEGIN:VCARD/i.test(txt)) {
    txt.split(/BEGIN:VCARD/i).slice(1).forEach(card => {
      const unf = card.replace(/\r?\n[ \t]/g, '');
      let fn = (unf.match(/^FN([^:\n]*):(.*)$/mi) || []);
      let nome = fn[2] || ''; if (/QUOTED-PRINTABLE/i.test(fn[1] || '')) nome = decodeQP(nome);
      if (!nome) { const n = unf.match(/^N[^:\n]*:(.*)$/mi); if (n) nome = n[1].split(';').reverse().join(' '); }
      const tels = [...unf.matchAll(/^TEL[^:\n]*:(.*)$/gmi)].map(x => x[1].trim());
      tels.forEach(t => out.push({ nome: nome.trim(), telefone: t }));
    });
    return out;
  }
  txt.split(/\r?\n/).forEach(line => {
    line = line.trim(); if (!line) return;
    const ms = [...line.matchAll(/\+?\(?\d[\d\s().\-]{6,}\d/g)].filter(x => { const n = x[0].replace(/\D/g, '').length; return n >= 8 && n <= 15; });
    if (!ms.length) return;
    const mt = ms[0]; let nome = (line.slice(0, mt.index) + ' ' + line.slice(mt.index + mt[0].length)).replace(/["';,|\t()]+/g, ' ').replace(/\s+/g, ' ').replace(/^[\s\-–:]+|[\s\-–:]+$/g, '').trim();
    if (/^(nome|name)\b/i.test(nome) && !/\d{8}/.test(mt[0])) return;
    out.push({ nome, telefone: mt[0] });
  });
  return out;
};
function impPreview() {
  const raw = D.parseContacts(D.val('impTxt')).concat(IMP.extra || []);
  const seen = new Set(), rows = []; let inv = 0, dup = 0;
  raw.forEach(c => {
    const tel = D.phone(c.telefone), nome = String(c.nome || '').trim().slice(0, 100);
    if (!tel || !nome) { inv++; return; }
    if (seen.has(tel)) { dup++; return; }
    seen.add(tel); rows.push({ nome, telefone: tel });
  });
  IMP.rows = rows; IMP.inv = inv; IMP.dup = dup;
  const box = $('#impPrev'); if (!box) return;
  box.innerHTML = raw.length ? `<div class="card" style="background:var(--l50);box-shadow:none"><b>${rows.length} contato${rows.length === 1 ? '' : 's'} pronto${rows.length === 1 ? '' : 's'} para importar</b>${inv ? `<div class="small" style="color:var(--warn)">${inv} ignorado${inv > 1 ? 's' : ''} (sem nome ou com telefone inválido)</div>` : ''}${dup ? `<div class="small muted">${dup} repetido${dup > 1 ? 's' : ''} removido${dup > 1 ? 's' : ''}</div>` : ''}${rows.slice(0, 4).map(r => `<div class="small muted">${esc(r.nome)} — ${esc(D.fphone(r.telefone))}</div>`).join('')}${rows.length > 4 ? '<div class="small muted">…</div>' : ''}</div>` : '';
  const b = $('#impGo'); if (b) b.disabled = !rows.length;
}
D.inputs.impTxt = impPreview;
D.act['import-open'] = () => {
  IMP.extra = []; IMP.rows = [];
  const canPick = !!(navigator.contacts && navigator.contacts.select);
  D.sheet('Importar contatos', `
    <div class="field" style="margin-top:0"><label for="impNome">1. Dê um nome para esta lista</label><input id="impNome" type="text" maxlength="80" placeholder="Ex.: Amigos da igreja"></div>
    <div class="field"><label>2. Traga os contatos</label>
      <div class="stack">
      ${canPick ? '<button class="btn block sec2" data-act="imp-agenda">📱 Escolher da agenda do celular</button>' : ''}
      <label class="btn block sec2" for="impFile" style="cursor:pointer">📄 Enviar arquivo (.vcf ou .csv)</label><input id="impFile" type="file" accept=".vcf,.csv,.txt,text/vcard,text/csv,text/plain" hidden>
      </div>
      <div class="hint">Ou cole abaixo, um contato por linha: <b>Nome, telefone</b></div>
      <textarea id="impTxt" placeholder="Maria Souza, (62) 99999-1111&#10;João Lima; 62 98888-2222"></textarea></div>
    <div id="impPrev" style="margin-top:12px"></div><div class="err" id="err" role="alert"></div>
    <button class="btn block" id="impGo" data-act="import-go" style="margin-top:12px" disabled>Importar contatos</button>`);
  D.changes.impFile = async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (f.size > 5e6) return D.setErr('Arquivo grande demais (máximo 5 MB).');
    if (/\.xlsx?$/i.test(f.name)) return D.setErr('Planilhas Excel não são lidas. Salve como CSV e envie de novo.');
    const t = await f.text(); $('#impTxt').value = t.slice(0, 600000); impPreview();
    if (!D.val('impNome')) { const el = $('#impNome'); if (el) el.value = f.name.replace(/\.[^.]+$/, '').slice(0, 60); }
  };
};
D.act['imp-agenda'] = async () => {
  try {
    const sel = await navigator.contacts.select(['name', 'tel'], { multiple: true });
    IMP.extra = (IMP.extra || []).concat(sel.map(c => ({ nome: (c.name || [])[0] || '', telefone: (c.tel || [])[0] || '' })));
    impPreview();
  } catch (e) { D.toast('Não foi possível abrir a agenda. Use o arquivo ou cole a lista.', true); }
};
D.act['import-go'] = async el => {
  const nome = D.val('impNome').trim();
  if (!nome) return D.setErr('Dê um nome para a lista (ex.: Amigos da igreja).');
  impPreview();
  if (!IMP.rows.length) return D.setErr('Nenhum contato válido. Confira se cada linha tem nome e telefone com DDD.');
  if (IMP.rows.length > 3000) return D.setErr('Importe no máximo 3.000 contatos por lista.');
  D.setErr(''); D.busy(el, true);
  const r = await D.api('lista_criar', { nome, contatos: IMP.rows });
  D.closeSheet(); C.listaId = r.id; C.curId = null; C.skip = []; C.filter = 'novo';
  D.toast(`${r.importados} contatos importados ✓`); D.V.chamar();
};

/* ================= METAS DO DIA ================= */
D.V.metas = async m => {
  const [p, rs] = await Promise.all([D.api('pros'), D.refreshBadges()]);
  const map = {}; p.dias.forEach(d => { map[d.dia] = d; });
  const h = map[p.hoje] || { chamados: 0, interessados: 0, vendas: 0 };
  const alvo = D.rk(D.S.user.rank).contatos, pct = Math.min(100, Math.round(h.chamados / alvo * 100));
  const dias = []; for (let i = 6; i >= 0; i--) { const d = D.addDays(D.today(), -i); dias.push({ d, ...(map[d] || { chamados: 0, interessados: 0, vendas: 0 }) }); }
  const maxC = Math.max(alvo, ...dias.map(x => x.chamados), 1);
  const sem = dias.reduce((a, x) => ({ c: a.c + x.chamados, i: a.i + x.interessados, v: a.v + x.vendas }), { c: 0, i: 0, v: 0 });
  const tot = p.dias.reduce((a, x) => ({ c: a.c + x.chamados, i: a.i + x.interessados, v: a.v + x.vendas }), { c: 0, i: 0, v: 0 });
  const taxa = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const dow = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const counter = (k, ic, t, v, sub) => `<div class="card center"><div class="em" style="font-size:34px">${ic}</div><b>${t}</b><div class="cnt" style="margin:10px 0 4px"><button data-act="pros-adj" data-k="${k}" data-d="-1" aria-label="Menos um">−</button><div class="v" id="v_${k}">${v}</div><button class="plus" data-act="pros-adj" data-k="${k}" data-d="1" aria-label="Mais um">+</button></div><div class="small muted">${sub}</div></div>`;
  m.innerHTML = D.page('Metas do dia', `
    <div class="card tint"><div class="small muted">HOJE · ${D.fdate(p.hoje)}</div><h1 style="font-size:24px;margin-top:2px">${h.chamados >= alvo ? 'Meta do dia batida! 🎉' : `Faltam ${alvo - h.chamados} contato${alvo - h.chamados > 1 ? 's' : ''} para a meta`}</h1><div class="bar"><i style="width:${Math.max(pct, 2)}%"></i></div><div class="small muted">Meta para ${esc(D.S.user.rank)}: chamar ${alvo} pessoas por dia</div></div>
    <div class="sec stack" id="counters">${counter('chamados', '📞', 'Quantas pessoas eu chamei', h.chamados, `Meta: ${alvo}`)}${counter('interessados', '😍', 'Quantas se interessaram', h.interessados, `Conversão: ${taxa(h.interessados, h.chamados)} dos chamados`)}${counter('vendas', '💰', 'Quantas vendas saíram', h.vendas, `Conversão: ${taxa(h.vendas, h.interessados)} dos interessados`)}</div>
    <p class="small muted center" style="margin-top:10px">Os números sobem sozinhos quando você chama um contato, marca interesse ou registra uma venda. Se errar, use o −.</p>
    <div class="card" style="margin-top:14px"><h2>Últimos 7 dias · chamados</h2><div class="bars">${dias.map(x => `<div><b>${x.chamados}</b><i style="height:${Math.round(x.chamados / maxC * 100)}%"></i>${dow[new Date(x.d + 'T12:00:00').getDay()]}</div>`).join('')}</div></div>
    <div class="card" style="margin-top:14px"><h2>Resumo</h2><div class="kpis"><div class="kpi"><b>${sem.c}</b><span>chamados na semana</span></div><div class="kpi"><b>${sem.i}</b><span>interessados na semana</span></div><div class="kpi"><b>${sem.v}</b><span>vendas na semana</span></div><div class="kpi"><b>${tot.c}</b><span>chamados em 30 dias</span></div><div class="kpi"><b>${tot.i}</b><span>interessados em 30 dias</span></div><div class="kpi"><b>${tot.v}</b><span>vendas em 30 dias</span></div></div></div>`);
};
D.act['pros-adj'] = async el => {
  const k = el.dataset.k, d = Number(el.dataset.d);
  const v = $('#v_' + k); if (d < 0 && Number(v.textContent) === 0) return;
  el.disabled = true; try { await D.api('pros_ajusta', { campo: k, delta: d }); } finally { el.disabled = false; }
  D.V.metas($('#main'));
};


})();
