/* Diamante App - telas: vendas, follow-up, estoque, anamnese (CRM), minha conta */
(function () {
'use strict';
const D = window.D, esc = D.esc, $ = D.$, $$ = D.$$;
const _n = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
D.oilCat = o => { const nq = _n(o.q); return (window.CATALOGO || []).find(p => ['Óleo Essencial', 'Mix de Óleos', 'Roll-On', 'Emotional Aromatherapy'].includes(p.c) && _n(p.n + ' ' + p.t).includes(nq)); };

/* ================= VENDAS ================= */
const F = { cliente: '', whats: '', prod: null, qtd: 1, valor: 0, manual: false, dias: 30, data: '', baixar: true, estoque: [], clientes: [] };
D.V.vendas = async m => {
  const r = await D.api('vendas'); D.S.vendas = r.vendas;
  const mes = D.today().slice(0, 7), doMes = r.vendas.filter(v => v.data.slice(0, 7) === mes);
  const tv = doMes.reduce((a, v) => a + v.valor, 0), tp = doMes.reduce((a, v) => a + v.pv, 0);
  m.innerHTML = D.page('Vendas', `
    <button class="btn block" data-act="venda-new" style="min-height:64px;font-size:20px">＋ Registrar uma venda</button>
    <div class="card" style="margin-top:14px"><h2>Este mês</h2><div class="kpis"><div class="kpi"><b>${D.brl(tv)}</b><span>em vendas</span></div><div class="kpi"><b>${D.num(tp)}</b><span>PV</span></div><div class="kpi"><b>${doMes.length}</b><span>venda${doMes.length === 1 ? '' : 's'}</span></div></div></div>
    <div class="sec"><h2>Últimas vendas</h2><div class="list">${r.vendas.slice(0, 60).map(v => `<div class="item"><div class="av">${esc(D.initials(v.cliente))}</div><div class="t"><b>${esc(v.cliente)}</b><span>${esc(v.produto)}${v.qtd > 1 ? ' × ' + v.qtd : ''} · ${D.fdate(v.data)}</span>${v.fu_status === 'pendente' && v.followup ? `<span style="display:block;color:var(--l600)">🔔 Lembrar em ${D.fdate(v.followup)}</span>` : ''}</div><div style="text-align:right"><b>${D.brl(v.valor)}</b><br><span class="small muted">${D.num(v.pv)} PV</span></div><button class="btn sm ghost" style="min-height:40px;padding:6px 12px" data-act="venda-del" data-id="${v.id}" aria-label="Apagar venda">🗑</button></div>`).join('') || '<div class="empty"><div class="em">💰</div>Nenhuma venda ainda.<br>Toque no botão acima quando vender o primeiro óleo.</div>'}</div></div>`);
};
async function openVenda(pre) {
  Object.assign(F, { cliente: '', whats: '', prod: null, qtd: 1, valor: 0, manual: false, dias: 30, data: D.today(), baixar: true }, pre || {});
  const [e, v] = await Promise.all([D.api('estoque'), D.api('vendas')]);
  F.estoque = e.itens;
  const seen = {}; v.vendas.forEach(x => { if (!seen[x.cliente.toLowerCase()]) seen[x.cliente.toLowerCase()] = { cliente: x.cliente, whats: x.whatsapp }; });
  F.clientes = Object.values(seen);
  if (F.prod && !F.manual) F.valor = F.prod.r * F.qtd;
  drawVenda();
}
D.act['venda-new'] = () => openVenda();
function readVenda() {
  if (!$('#vCli')) return;
  F.cliente = D.val('vCli'); F.whats = D.val('vWa'); F.data = D.val('vData') || F.data;
  const vv = D.val('vVal'); if (vv !== '') { const n = Number(String(vv).replace(',', '.')); if (isFinite(n)) { if (Math.abs(n - F.valor) > 0.001) F.manual = true; F.valor = n; } }
  const b = $('#vBx'); if (b) F.baixar = b.checked;
}
function drawVenda() {
  const p = F.prod, emEst = p && p.s && F.estoque.some(x => x.sku === p.s);
  const body = `
    <div class="field" style="margin-top:0"><label for="vCli">Nome do cliente</label><input id="vCli" type="text" list="vClis" autocomplete="off" maxlength="100" value="${esc(F.cliente)}" placeholder="Quem comprou?"><datalist id="vClis">${F.clientes.map(c => `<option value="${esc(c.cliente)}"></option>`).join('')}</datalist></div>
    <div class="field"><label for="vWa">WhatsApp do cliente <span class="muted">(para o lembrete de reposição)</span></label><input id="vWa" type="tel" inputmode="tel" placeholder="(62) 99999-9999" value="${esc(F.whats)}"></div>
    <div class="field"><label>Produto vendido</label><button class="btn block ${p ? 'sec2' : ''}" data-act="v-prod" style="justify-content:flex-start;text-align:left">${p ? '🧴 ' + esc(D.prodName(p)) : '🔎 Escolher produto'}</button></div>
    <div class="field"><label>Quantidade</label><div class="qty"><button data-act="v-qty" data-d="-1" aria-label="Menos">−</button><b>${F.qtd}</b><button data-act="v-qty" data-d="1" aria-label="Mais">+</button></div></div>
    <div class="field"><label for="vVal">Valor da venda (R$)</label><input id="vVal" type="number" inputmode="decimal" step="0.01" min="0" value="${F.valor ? Math.round(F.valor * 100) / 100 : ''}" placeholder="0,00"><div class="hint">${p && p.p ? `Preenchido com o preço regular (${D.brl(p.r)}). Pode alterar. Vale <b>${D.num(p.p * F.qtd)} PV</b>.` : 'Digite quanto o cliente pagou.'}</div></div>
    <div class="field"><label>Lembrar de falar com o cliente daqui a…</label><div class="chips">${[[30, '30 dias'], [45, '45 dias'], [60, '60 dias'], [90, '90 dias'], [0, 'Sem lembrete']].map(([d, t]) => `<button class="chip ${F.dias === d ? 'on' : ''}" data-act="v-dias" data-d="${d}">${t}</button>`).join('')}</div><div class="hint">É o tempo que o produto costuma durar. Você receberá o aviso para já oferecer a próxima compra.</div></div>
    <div class="field"><label for="vData">Data da venda</label><input id="vData" type="date" max="${D.today()}" value="${esc(F.data)}"></div>
    ${emEst ? `<label class="row" style="margin-top:14px;cursor:pointer"><input type="checkbox" id="vBx" ${F.baixar ? 'checked' : ''} style="width:26px;height:26px;accent-color:var(--l600)"><span>Descontar do meu estoque</span></label>` : ''}
    <div class="err" id="err" role="alert"></div><button class="btn block" style="margin-top:12px" data-act="v-save">Salvar venda</button>`;
  if ($('#sheetbody') && $('#vCli')) $('#sheetbody').innerHTML = body; else D.sheet('Registrar venda', body);
}
D.inputs.vCli = e => { const c = F.clientes.find(x => x.cliente.toLowerCase() === e.target.value.trim().toLowerCase()); if (c && c.whats && !D.val('vWa')) { $('#vWa').value = D.fphone(c.whats); } };
D.act['v-prod'] = () => { readVenda(); D.pickProduct(p => {
  F.prod = p; if (!F.manual || !F.valor) { F.valor = p.r * F.qtd; F.manual = false; }
  F.dias = /Kit|Kits/.test(p.c) ? 60 : /Suplementos/.test(p.c) ? 30 : (p.t || '').includes('5 ml') ? 45 : 45;
  F.baixar = true; D.sheet('Registrar venda', ''); drawVenda();
}); };
D.act['v-qty'] = el => { readVenda(); const d = Number(el.dataset.d); F.qtd = Math.max(1, Math.min(99, F.qtd + d)); if (F.prod && !F.manual) F.valor = F.prod.r * F.qtd; drawVenda(); };
D.act['v-dias'] = el => { readVenda(); F.dias = Number(el.dataset.d); drawVenda(); };
D.act['v-save'] = async el => {
  readVenda();
  if (!F.cliente.trim()) return D.setErr('Digite o nome do cliente.');
  if (!F.prod) return D.setErr('Escolha o produto vendido.');
  if (F.whats.trim() && !D.phone(F.whats)) return D.setErr('WhatsApp do cliente inválido. Use DDD, ex.: (62) 99999-9999.');
  if (!(F.valor > 0) && !await D.confirm('Valor zerado', 'O valor da venda está em R$ 0,00. Deseja salvar assim mesmo?', 'Salvar')) return;
  if (!F.data || F.data > D.today()) return D.setErr('A data da venda não pode ser no futuro.');
  D.setErr(''); D.busy(el, true);
  const r = await D.api('venda_add', { cliente: F.cliente.trim(), whatsapp: F.whats.trim(), sku: F.prod.s, produto: D.prodName(F.prod), qtd: F.qtd, valor: F.valor, pv: (F.prod.p || 0) * F.qtd, data: F.data, dias: F.dias, baixar_estoque: F.baixar });
  D.closeSheet(true);
  D.toast(r.followup ? `Venda salva ✓ Lembrete marcado para ${D.fdate(r.followup)}` : 'Venda salva ✓');
  await D.refreshBadges(); D.show();
};
D.act['venda-del'] = async el => {
  if (!await D.confirm('Apagar esta venda?', 'O lembrete de follow-up dela também será apagado.', 'Apagar', true)) return;
  await D.api('venda_apagar', { id: Number(el.dataset.id) }); D.toast('Venda apagada'); D.show();
};

/* ================= FOLLOW-UP ================= */
const fuMsg = v => `Oii, ${D.first(v.cliente)}! Tudo bem? 💜 Lembrei de você: o seu ${String(v.produto).split(' · ')[0]} já deve estar acabando, né? Quer que eu já separe o próximo pra você?`;
D.V.followup = async m => {
  const r = await D.api('vendas'); D.S.vendas = r.vendas;
  const pend = r.vendas.filter(v => v.fu_status === 'pendente' && v.followup).sort((a, b) => a.followup.localeCompare(b.followup));
  const t = D.today(), atr = pend.filter(v => v.followup < t), hoje = pend.filter(v => v.followup === t), prox = pend.filter(v => v.followup > t && D.diffDays(v.followup) <= 21), dep = pend.filter(v => D.diffDays(v.followup) > 21);
  const card = (v, tag) => `<div class="card" style="margin-top:10px"><div class="row"><div class="av">${esc(D.initials(v.cliente))}</div><div class="t sp"><b>${esc(v.cliente)}</b><div class="small muted">${esc(v.produto)}</div></div><span class="pill ${tag === 'atr' ? 'bad' : tag === 'hoje' ? 'warn' : ''}">${tag === 'atr' ? Math.abs(D.diffDays(v.followup)) + ' dia' + (Math.abs(D.diffDays(v.followup)) > 1 ? 's' : '') + ' de atraso' : tag === 'hoje' ? 'Hoje' : D.fdate(v.followup)}</span></div>
    <div class="msg small" style="margin-top:12px">${esc(fuMsg(v))}</div>
    <div class="stack" style="margin-top:10px">${v.whatsapp ? `<a class="btn wa block" target="_blank" rel="noopener" href="${D.wa(v.whatsapp, fuMsg(v))}">💬 Chamar no WhatsApp</a>` : '<div class="small muted">Sem WhatsApp cadastrado nesta venda.</div>'}
    <div class="row"><button class="btn sec2 sp" data-act="fu-resell" data-id="${v.id}">💰 Vendeu de novo</button><button class="btn ghost sp" data-act="fu-snooze" data-id="${v.id}">Adiar</button></div>
    <button class="btn ghost block sm" data-act="fu-done" data-id="${v.id}">✓ Já falei, tirar da lista</button></div></div>`;
  const sec = (t, arr, tag) => arr.length ? `<div class="sec"><h2>${t} (${arr.length})</h2>${arr.map(v => card(v, tag)).join('')}</div>` : '';
  m.innerHTML = D.page('Follow-up', `<p class="muted">Clientes cujo produto deve estar acabando. Chame, ofereça a reposição e já engate a revenda.</p>
    ${sec('⚠️ Atrasados', atr, 'atr')}${sec('Para hoje', hoje, 'hoje')}${sec('Próximos dias', prox, 'prox')}${dep.length ? `<p class="small muted center" style="margin-top:18px">E mais ${dep.length} lembrete${dep.length > 1 ? 's' : ''} mais para frente.</p>` : ''}
    ${!pend.length ? '<div class="empty"><div class="em">🔔</div><b>Nenhum lembrete agendado.</b><br>Ao registrar uma venda, o app agenda o aviso para quando o produto acabar.<br><button class="btn" style="margin-top:14px" data-act="venda-new">Registrar venda</button></div>' : ''}
    ${pend.length && !atr.length && !hoje.length ? '<div class="card center" style="margin-top:14px"><div class="em" style="font-size:40px">✅</div><b>Você está em dia hoje!</b></div>' : ''}`);
};
D.act['fu-done'] = async el => { await D.api('followup', { id: Number(el.dataset.id), acao: 'feito' }); D.toast('Pronto ✓'); await D.refreshBadges(); D.show(); };
D.act['fu-snooze'] = el => {
  D.sheet('Adiar para quando?', `<div class="stack">${[[3, 'Daqui 3 dias'], [7, 'Daqui 1 semana'], [15, 'Daqui 15 dias'], [30, 'Daqui 30 dias']].map(([d, t]) => `<button class="btn sec2 block" data-act="fu-snz-go" data-id="${el.dataset.id}" data-d="${d}">${t}</button>`).join('')}</div>`);
};
D.act['fu-snz-go'] = async el => { await D.api('followup', { id: Number(el.dataset.id), acao: 'adiar', dias: Number(el.dataset.d) }); D.closeSheet(true); D.toast('Lembrete adiado ✓'); await D.refreshBadges(); D.show(); };
D.act['fu-resell'] = async el => {
  const v = (D.S.vendas || []).find(x => x.id === Number(el.dataset.id)); if (!v) return;
  const p = v.sku ? D.catBySku[v.sku] : null;
  await D.api('followup', { id: v.id, acao: 'feito' });
  openVenda({ cliente: v.cliente, whats: v.whatsapp ? D.fphone(v.whatsapp) : '', prod: p || (v.produto ? { s: '', n: v.produto, t: '', r: v.qtd ? v.valor / v.qtd : 0, m: 0, p: v.qtd ? v.pv / v.qtd : 0, c: 'Outro' } : null), qtd: v.qtd, valor: v.valor });
};

/* ================= ESTOQUE ================= */
const E = { itens: [], q: '' };
D.V.estoque = async m => {
  E.itens = (await D.api('estoque')).itens; drawEstoque(m);
};
function drawEstoque(m) {
  m = m || $('#main');
  const val = E.itens.reduce((a, i) => a + i.qtd * ((D.catBySku[i.sku] || {}).m || 0), 0), pv = E.itens.reduce((a, i) => a + i.qtd * ((D.catBySku[i.sku] || {}).p || 0), 0);
  const baixo = E.itens.filter(i => i.qtd <= i.minimo);
  const itens = E.q ? E.itens.filter(i => i.nome.toLowerCase().includes(E.q.toLowerCase())) : E.itens;
  m.innerHTML = D.page('Meu estoque', `
    <button class="btn block" data-act="est-add" style="min-height:64px;font-size:20px">＋ Adicionar produto</button>
    ${E.itens.length ? `<div class="card" style="margin-top:14px"><div class="kpis"><div class="kpi"><b>${E.itens.reduce((a, i) => a + i.qtd, 0)}</b><span>unidades</span></div><div class="kpi"><b>${D.brl(val)}</b><span>custo (preço membro)</span></div><div class="kpi"><b>${D.num(pv)}</b><span>PV em estoque</span></div></div></div>` : ''}
    ${baixo.length ? `<div class="card" style="margin-top:14px;background:var(--warnbg);border-color:#F4D9A8"><b>⚠️ Acabando ou zerado:</b><div class="small" style="margin-top:4px">${baixo.map(i => esc(i.nome) + ' (' + i.qtd + ')').join(' · ')}</div></div>` : ''}
    ${E.itens.length > 6 ? `<div class="field"><input id="estQ" type="search" placeholder="Buscar no meu estoque" value="${esc(E.q)}"></div>` : ''}
    <div class="list" style="margin-top:14px">${itens.map(i => `<div class="item" style="flex-wrap:wrap"><div class="t" style="flex-basis:100%"><b style="white-space:normal">${esc(i.nome)}</b>${i.qtd <= i.minimo ? `<span class="pill ${i.qtd === 0 ? 'bad' : 'warn'}">${i.qtd === 0 ? 'Acabou' : 'Acabando'}</span>` : ''}</div>
      <div class="qty"><button data-act="est-q" data-s="${esc(i.sku)}" data-d="-1" aria-label="Menos">−</button><b>${i.qtd}</b><button data-act="est-q" data-s="${esc(i.sku)}" data-d="1" aria-label="Mais">+</button></div>
      <div class="sp"></div><button class="btn sm ghost" data-act="est-edit" data-s="${esc(i.sku)}">Avisar abaixo de ${i.minimo}</button><button class="btn sm ghost" style="min-height:44px" data-act="est-del" data-s="${esc(i.sku)}" aria-label="Remover">🗑</button></div>`).join('') || (E.itens.length ? '<div class="empty">Nada encontrado.</div>' : '<div class="empty"><div class="em">📦</div>Seu estoque está vazio.<br>Adicione os óleos e produtos que você tem em casa.</div>')}</div>`);
  const q = $('#estQ'); if (q) { q.oninput = () => { E.q = q.value; drawEstoque(); const n = $('#estQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }; }
}
D.act['est-add'] = () => D.pickProduct(async p => {
  if (!p.s) { p = Object.assign({}, p, { s: 'X' + Date.now().toString(36) }); }
  const ex = E.itens.find(i => i.sku === p.s);
  const qtd = ex ? ex.qtd + 1 : 1;
  await D.api('estoque_salvar', { sku: p.s, nome: D.prodName(p), qtd, minimo: ex ? ex.minimo : 1 });
  D.toast(ex ? 'Mais uma unidade adicionada ✓' : 'Adicionado ao estoque ✓'); D.V.estoque($('#main')); D.refreshBadges();
});
D.act['est-q'] = async el => {
  const i = E.itens.find(x => x.sku === el.dataset.s); if (!i) return;
  const n = Math.max(0, Math.min(99999, i.qtd + Number(el.dataset.d))); if (n === i.qtd) return;
  i.qtd = n; drawEstoque();
  try { await D.api('estoque_salvar', { sku: i.sku, nome: i.nome, qtd: i.qtd, minimo: i.minimo }); D.refreshBadges(); } catch (e) { D.fail(e); D.V.estoque($('#main')); }
};
D.act['est-edit'] = el => {
  const i = E.itens.find(x => x.sku === el.dataset.s); if (!i) return;
  D.sheet('Avisar quando estiver acabando', `<p class="muted">${esc(i.nome)}</p><div class="field"><label for="estMin">Avisar quando tiver este número de unidades (ou menos):</label><input id="estMin" type="number" inputmode="numeric" min="0" max="999" value="${i.minimo}"></div><div class="err" id="err"></div><button class="btn block" style="margin-top:12px" data-act="est-min-save" data-s="${esc(i.sku)}">Salvar</button>`);
};
D.act['est-min-save'] = async el => {
  const i = E.itens.find(x => x.sku === el.dataset.s); const v = Number(D.val('estMin'));
  if (!isFinite(v) || v < 0) return D.setErr('Digite um número maior ou igual a zero.');
  await D.api('estoque_salvar', { sku: i.sku, nome: i.nome, qtd: i.qtd, minimo: Math.floor(v) }); D.closeSheet(true); D.V.estoque($('#main')); D.refreshBadges();
};
D.act['est-del'] = async el => {
  const i = E.itens.find(x => x.sku === el.dataset.s); if (!i) return;
  if (!await D.confirm('Remover do estoque?', i.nome, 'Remover', true)) return;
  await D.api('estoque_apagar', { sku: i.sku }); D.V.estoque($('#main')); D.refreshBadges();
};

/* ================= ANAMNESE (link + CRM + depoimentos) ================= */
const N = { itens: [], tab: 'resp', filtro: 'todas', depo: [] };
const CRM = { novo: ['Nova', ''], contatado: ['Contatada', 'warn'], conversando: ['Conversando', 'warn'], cliente: ['Virou cliente 💜', 'ok'], perdido: ['Sem retorno', 'bad'] };
D.V.anamnese = async m => {
  const [a, d] = await Promise.all([D.api('ana_lista'), D.api('depo_lista')]);
  N.itens = a.itens; N.depo = d.itens; drawAna(m); D.refreshBadges();
};
function drawAna(m) {
  m = m || $('#main');
  const link = D.anaLink(), comp = N.itens.filter(x => x.completo).length;
  const lista = N.itens.filter(x => N.filtro === 'todas' ? true : N.filtro === 'completas' ? x.completo : N.filtro === 'parciais' ? !x.completo : x.crm === N.filtro);
  const resp = `<div class="seg" style="margin-bottom:12px;overflow-x:auto"><button class="${N.filtro === 'todas' ? 'on' : ''}" data-act="ana-f" data-f="todas">Todas (${N.itens.length})</button><button class="${N.filtro === 'completas' ? 'on' : ''}" data-act="ana-f" data-f="completas">Completas (${comp})</button><button class="${N.filtro === 'parciais' ? 'on' : ''}" data-act="ana-f" data-f="parciais">Pararam (${N.itens.length - comp})</button></div>
    <div class="list">${lista.map(x => `<div class="item click" data-act="ana-open" data-id="${x.id}"><div class="av">${esc(D.initials(x.nome || '?'))}</div><div class="t"><b>${esc(x.nome || 'Sem nome')}</b><span>${x.completo ? '✅ Completou' : `⏸ Parou na pergunta ${Math.min((x.etapa || 0) + 1, x.total || 1)} de ${x.total || '?'}`} · há ${D.ago(x.atualizado)}</span></div><span class="pill ${CRM[x.crm][1]}">${CRM[x.crm][0]}</span></div>`).join('') || `<div class="empty"><div class="em">📋</div>${N.itens.length ? 'Nada neste filtro.' : 'Ninguém respondeu ainda.<br>Envie o seu link e as respostas aparecem aqui, mesmo as que ficaram pela metade.'}</div>`}</div>`;
  const TEMAS = ANA.TEMAS;
  const depo = `<p class="muted small">Depoimentos <b>reais</b> de clientes (com autorização deles) aparecem no resultado da anamnese, para quem tem o mesmo objetivo.</p>
    <div class="card"><div class="field" style="margin-top:0"><label for="dTema">Objetivo</label><select id="dTema">${Object.keys(TEMAS).map(k => `<option value="${k}">${TEMAS[k].icone} ${esc(TEMAS[k].rotulo)}</option>`).join('')}</select></div>
    <div class="field"><label for="dTxt">Depoimento</label><textarea id="dTxt" maxlength="500" placeholder="O que a pessoa disse, com as palavras dela…"></textarea></div>
    <div class="field"><label for="dAut">Nome (opcional)</label><input id="dAut" type="text" maxlength="60" placeholder="Ex.: Ana, 42 anos"></div><div class="err" id="err"></div><button class="btn block" style="margin-top:12px" data-act="depo-add">Adicionar depoimento</button></div>
    <div class="list" style="margin-top:14px">${N.depo.map(d => `<div class="item"><div class="t"><span class="pill">${TEMAS[d.tema] ? TEMAS[d.tema].icone + ' ' + esc(TEMAS[d.tema].rotulo) : esc(d.tema)}</span><div style="white-space:normal;margin-top:6px">“${esc(d.texto)}”</div>${d.autor ? `<span>— ${esc(d.autor)}</span>` : ''}</div><button class="btn sm ghost" data-act="depo-del" data-id="${d.id}" aria-label="Apagar">🗑</button></div>`).join('') || '<div class="empty">Nenhum depoimento ainda.</div>'}</div>`;
  m.innerHTML = D.page('Anamnese', `
    <div class="card tint"><div class="small muted">SEU LINK PERSONALIZADO</div><div style="word-break:break-all;font-weight:700;margin:6px 0 12px">${esc(link)}</div>
      <div class="row wrap"><button class="btn sec2 sp" data-act="ana-copy">Copiar link</button><button class="btn sec2 sp" data-act="ana-share">Compartilhar</button><a class="btn sec2 sp" href="${esc(link)}" target="_blank" rel="noopener">Ver como o cliente vê</a></div></div>
    <div class="card" style="margin-top:14px"><div class="kpis"><div class="kpi"><b>${N.itens.length}</b><span>pessoas começaram</span></div><div class="kpi"><b>${comp}</b><span>completaram</span></div><div class="kpi"><b>${N.itens.filter(x => x.crm === 'cliente').length}</b><span>viraram clientes</span></div></div></div>
    <div class="seg" style="margin:16px 0"><button class="${N.tab === 'resp' ? 'on' : ''}" data-act="ana-tab" data-t="resp">Respostas (CRM)</button><button class="${N.tab === 'depo' ? 'on' : ''}" data-act="ana-tab" data-t="depo">Depoimentos</button></div>
    ${N.tab === 'resp' ? resp : depo}`);
}
D.act['ana-tab'] = el => { N.tab = el.dataset.t; drawAna(); };
D.act['ana-f'] = el => { N.filtro = el.dataset.f; drawAna(); };
D.act['ana-copy'] = () => D.copy(D.anaLink(), 'Link copiado ✓');
D.act['ana-share'] = async () => { const link = D.anaLink(); if (navigator.share) { try { await navigator.share({ title: 'Quiz de óleos essenciais', text: 'Faça o quiz e descubra os óleos ideais para a sua rotina:', url: link }); } catch (e) { } } else D.copy(link, 'Link copiado ✓'); };
D.act['depo-add'] = async el => {
  const tema = D.val('dTema'), texto = D.val('dTxt').trim();
  if (texto.length < 10) return D.setErr('Escreva o depoimento completo (mínimo de 10 letras).');
  D.busy(el, true); await D.api('depo_salvar', { tema, texto, autor: D.val('dAut').trim() }); D.toast('Depoimento adicionado ✓'); D.V.anamnese($('#main'));
};
D.act['depo-del'] = async el => { if (!await D.confirm('Apagar depoimento?', 'Ele deixará de aparecer nos resultados.', 'Apagar', true)) return; await D.api('depo_apagar', { id: Number(el.dataset.id) }); D.V.anamnese($('#main')); };
function respostas(d) {
  const rows = [];
  ANA.QUIZ.forEach(et => et.perguntas.forEach(q => {
    let v = d[q.id]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
    if (q.id === 'nome' || q.id === 'whatsapp' || q.id === 'aceite') return;
    let t;
    if (q.opcoes) { const ids = Array.isArray(v) ? v : [v]; t = ids.map(i => (q.opcoes.find(o => o.v === i) || { t: i }).t).join(', '); }
    else t = q.tipo === 'escala' ? v + ' de ' + q.max : String(v);
    rows.push(`<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="small muted">${esc(q.label)}</div><div>${esc(t)}</div></div>`);
  }));
  return rows.join('') || '<p class="muted">Ainda sem respostas além do nome.</p>';
}
D.act['ana-open'] = el => {
  const x = N.itens.find(i => i.id === Number(el.dataset.id)); if (!x) return;
  const d = x.dados || {}, rec = ANA.Motor.recomendar(d), T = ANA.TEMAS, nome = D.first(x.nome);
  const nomes = l => l.map(o => o.nome).join(', ');
  const atencao = ((ANA.QUIZ.find(e => e.id === 'fisica') || { perguntas: [] }).perguntas.find(p => p.id === 'atencao') || { opcoes: [] }).opcoes;
  const flagsT = [...rec.flags].map(f => (atencao.find(o => o.flag === f) || { t: f }).t);
  const msg = x.completo ? `Oi, ${nome}! Aqui é ${D.first(D.S.user.nome)} 💜 Vi que você fez o quiz dos óleos! Os que mais combinaram com você foram: ${nomes(rec.kit)}. Quer que eu te explique como usar e já te ajude a começar?` : `Oi, ${nome}! Aqui é ${D.first(D.S.user.nome)} 💜 Vi que você começou o quiz dos óleos e parou no meio. Quer que eu te ajude a terminar? Leva só alguns minutinhos.`;
  const sh = D.sheet(x.nome || 'Respondente', `
    <div class="row wrap"><span class="pill ${x.completo ? 'ok' : 'warn'}">${x.completo ? 'Completou' : 'Parou na pergunta ' + Math.min((x.etapa || 0) + 1, x.total || 1)}</span><span class="small muted">${D.fdt(x.atualizado)}</span></div>
    ${x.whatsapp ? `<a class="btn wa block" style="margin-top:12px" target="_blank" rel="noopener" href="${D.wa(x.whatsapp, msg)}">💬 Chamar ${esc(nome)} · ${esc(D.fphone(x.whatsapp))}</a>` : '<p class="muted">Sem WhatsApp válido.</p>'}
    <h3 style="margin-top:18px">Andamento do contato</h3><div class="chips" id="crmch">${Object.keys(CRM).map(k => `<button class="chip ${x.crm === k ? 'on' : ''}" data-act="crm-pick" data-k="${k}">${CRM[k][0]}</button>`).join('')}</div>
    <div class="field" style="margin-top:4px"><label for="crmNota">Anotações</label><textarea id="crmNota" maxlength="800" placeholder="Ex.: pediu para eu ligar sábado…">${esc(x.nota)}</textarea></div>
    <button class="btn block" style="margin-top:10px" data-act="crm-save" data-id="${x.id}">Salvar andamento</button>
    ${x.completo || Object.keys(d).length > 4 ? `<h3 style="margin-top:22px">O que mais apareceu</h3><div>${rec.temasTop.map(t => T[t] ? `<span class="pill" style="margin:0 6px 6px 0">${T[t].icone} ${esc(T[t].rotulo)}</span>` : '').join('')}</div>
    ${flagsT.length ? `<div class="pill warn" style="margin-top:6px;white-space:normal">⚠️ Atenção especial: ${esc(flagsT.join(', '))}</div>` : ''}
    <h3 style="margin-top:14px">Kit Essencial sugerido</h3><div class="list">${rec.kit.map(o => `<div class="item"><div class="t"><b style="white-space:normal">${esc(o.nome)}</b><span>${esc(o.botanica)}</span></div></div>`).join('')}</div>
    <p class="small muted" style="margin-top:8px"><b>Protocolo completo:</b> ${esc(nomes(rec.protocolo))}${rec.apoio ? ' · precisa de ' + esc(rec.apoio.nome) : ''}${rec.temCrianca ? ' · uso também para criança (preferir roll-on já diluído)' : ''}</p>` : ''}
    <h3 style="margin-top:22px">Respostas</h3>${respostas(d)}
    <button class="btn ghost block sm" style="margin-top:18px" data-act="ana-del" data-id="${x.id}">Apagar este registro</button>`);
  sh._crm = x.crm; sh._id = x.id;
};
D.act['crm-pick'] = el => { const o = $('#ov'); o._crm = el.dataset.k; $$('#crmch .chip').forEach(c => c.classList.toggle('on', c === el)); };
D.act['crm-save'] = async el => {
  const o = $('#ov'), id = Number(el.dataset.id);
  await D.api('ana_crm', { id, crm: o._crm, nota: D.val('crmNota') });
  const x = N.itens.find(i => i.id === id); if (x) { x.crm = o._crm; x.nota = D.val('crmNota'); }
  D.closeSheet(true); D.toast('Salvo ✓'); drawAna(); D.refreshBadges();
};
D.act['ana-del'] = async el => {
  if (!await D.confirm('Apagar registro?', 'As respostas desta pessoa serão apagadas. Não tem volta.', 'Apagar', true)) return;
  await D.api('ana_apagar', { id: Number(el.dataset.id) }); D.toast('Apagado'); D.V.anamnese($('#main'));
};

/* ================= MINHA CONTA ================= */
D.V.conta = async m => {
  const u = D.S.user;
  m.innerHTML = D.page('Minha conta', `
    <div class="card"><h2>Meus dados</h2>
      <div class="field" style="margin-top:0"><label for="cNome">Nome completo</label><input id="cNome" type="text" value="${esc(u.nome)}" maxlength="120"></div>
      <div class="field"><label>E-mail de acesso</label><input type="email" value="${esc(u.email)}" disabled><div class="hint">Para trocar o e-mail, fale com o administrador.</div></div>
      <div class="field"><label for="cWa">WhatsApp</label><input id="cWa" type="tel" value="${esc(D.fphone(u.whatsapp))}"></div>
      <div class="field"><label>Meu rank</label><div class="rk" id="cRk">${D.RANKS.map(r => `<button type="button" class="${u.rank === r ? 'on' : ''}" data-act="c-rank" data-r="${r}">${r}</button>`).join('')}</div><div class="hint">Muda as suas metas diárias e o próximo rank.</div></div>
      <div class="err" id="err" role="alert"></div><button class="btn block" style="margin-top:12px" data-act="c-save">Salvar</button></div>
    <div class="card"><h2>Trocar senha</h2>
      <div class="field" style="margin-top:0"><label for="pAt">Senha atual</label><input id="pAt" type="password" autocomplete="current-password"></div>
      <div class="field"><label for="pNo">Nova senha</label><input id="pNo" type="password" autocomplete="new-password"><div class="hint">Mínimo de 8 caracteres, com letras e números.</div></div>
      <div class="err" id="err2" role="alert"></div><button class="btn block sec2" style="margin-top:12px" data-act="c-pw">Trocar senha</button></div>
    <div class="card"><h2>Instalar no celular</h2><p class="muted small" style="margin:0">Abra este app no navegador e use <b>“Adicionar à tela inicial”</b> (iPhone: botão de compartilhar; Android: menu ⋮). Ele passa a abrir como um aplicativo.</p></div>
    <button class="btn block ghost" style="margin-top:14px" data-act="logout">🚪 Sair da conta</button>`);
  D.C2 = { rank: u.rank };
};
D.act['c-rank'] = el => { D.C2.rank = el.dataset.r; $$('#cRk button').forEach(b => b.classList.toggle('on', b === el)); };
D.act['c-save'] = async el => {
  const nome = D.val('cNome').trim(), wa = D.val('cWa').trim();
  if (nome.split(/\s+/).filter(Boolean).length < 2) return D.setErr('Digite seu nome completo.');
  if (!D.phone(wa)) return D.setErr('WhatsApp inválido (use DDD).');
  D.setErr(''); D.busy(el, true);
  const r = await D.api('perfil_salvar', { nome, whatsapp: wa, rank: D.C2.rank }); D.S.user = r.user; D.busy(el, false); D.toast('Dados salvos ✓'); D.renderShell(); D.markNav(); D.refreshBadges();
};
D.act['c-pw'] = async el => {
  const a = D.val('pAt'), n = D.val('pNo');
  if (!a) return D.setErr('Digite a senha atual.', 'err2');
  if (n.length < 8 || !/[A-Za-zÀ-ÿ]/.test(n) || !/\d/.test(n)) return D.setErr('A nova senha precisa de 8+ caracteres, com letras e números.', 'err2');
  D.setErr('', 'err2'); D.busy(el, true);
  try { await D.api('senha_trocar', { atual: a, nova: n }); D.toast('Senha trocada ✓'); $('#pAt').value = ''; $('#pNo').value = ''; } catch (e) { D.setErr(e.message, 'err2'); }
  D.busy(el, false);
};
})();
