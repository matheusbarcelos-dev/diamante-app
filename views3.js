/* Diamante App - telas: Clube de Vantagens (link, QR Code, inscrições, meta semanal) e Histórico por mês */
(function () {
'use strict';
const D = window.D, esc = D.esc, $ = D.$, $$ = D.$$;

/* ================= CLUBE DE VANTAGENS ================= */
const CL = { itens: [], semana: null, semanas: [], filtro: 'todas', gen: false };
const CRM = { novo: ['Novo', ''], contatado: ['Contatado', 'warn'], conversando: ['Conversando', 'warn'], cliente: ['Ativado no Clube 💜', 'ok'], perdido: ['Sem retorno', 'bad'] };
const fCpf = c => String(c || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
const fCep = c => String(c || '').replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
const msgConvite = link => `Oi! Aqui é ${D.first(D.S.user.nome)} 💜 Quero te convidar para o Clube de Vantagens doTERRA: 25% de desconto em todos os produtos, cashback em pontos, um óleo grátis por mês e promoções exclusivas. Faça a sua inscrição por aqui: ${link}`;

D.V.clube = async m => {
  const r = await D.api('clube_lista');
  CL.itens = r.itens; CL.semana = r.semana; CL.semanas = r.semanas; drawClube(m); D.refreshBadges();
};
function drawClube(m) {
  m = m || $('#main');
  const s = CL.semana, link = D.clubeLink(), ok = s.concluidos >= s.meta;
  const dots = Array.from({ length: s.meta }, (_, i) => `<i class="${i < s.concluidos ? 'on' : ''}">${i < s.concluidos ? '✓' : i + 1}</i>`).join('');
  const comp = CL.itens.filter(x => x.completo).length;
  const lista = CL.itens.filter(x => CL.filtro === 'todas' ? true : CL.filtro === 'completas' ? x.completo : !x.completo);
  const gen = CL.gen ? `
    <div class="qrbox"><canvas id="qr" width="10" height="10" aria-label="QR Code do link de inscrição"></canvas></div>
    <div style="word-break:break-all;font-weight:700;margin:6px 0 12px;text-align:center">${esc(link)}</div>
    <div class="row wrap"><button class="btn sec2 sp" data-act="cl-copy">Copiar link</button><button class="btn sec2 sp" data-act="cl-share">Compartilhar</button></div>
    <div class="row wrap" style="margin-top:10px"><button class="btn sec2 sp" data-act="cl-qr">Baixar QR Code</button><a class="btn wa sp" target="_blank" rel="noopener" href="${D.wa('', msgConvite(link)).replace('wa.me/', 'wa.me/')}">Enviar no WhatsApp</a></div>
    <p class="small muted" style="margin-top:10px;text-align:center">Mostre o QR Code na tela ou imprima. Quem apontar a câmera do celular abre a inscrição.</p>
    <a class="small" style="display:block;text-align:center;margin-top:6px" href="${esc(link)}" target="_blank" rel="noopener">Ver como a pessoa vê</a>` : '';
  m.innerHTML = D.page('Clube de Vantagens', `
    <div class="card tint hero clubehero">
      <div class="small muted">META DA SEMANA · ${D.fdate(s.inicio)} a ${D.fdate(s.fim)}</div>
      <h1>Trazer ${s.meta} pessoas para o Clube</h1>
      <div class="wkdots">${dots}</div>
      <p style="margin:10px 0 0"><b>${s.concluidos} de ${s.meta}</b> ${ok ? '· 🎉 Meta da semana batida!' : `· faltam ${s.meta - s.concluidos}`}</p>
      <p class="small muted" style="margin:6px 0 0">Conta quando a pessoa termina a inscrição pelo seu link.</p>
    </div>
    <div class="card" style="margin-top:14px">
      <h2 style="margin-top:0">Convide pelo link</h2>
      <p class="muted small">Gere o seu link de inscrição no Clube de Vantagens doTERRA e o QR Code para enviar ou mostrar a quem você quer convidar.</p>
      ${CL.gen ? '' : '<button class="btn block" data-act="cl-gen">Gerar link e QR Code</button>'}${gen}
    </div>
    <div class="card" style="margin-top:14px"><div class="kpis"><div class="kpi"><b>${CL.itens.length}</b><span>pessoas começaram</span></div><div class="kpi"><b>${comp}</b><span>concluíram</span></div><div class="kpi"><b>${CL.itens.filter(x => x.crm === 'cliente').length}</b><span>ativados</span></div></div></div>
    <div class="card" style="margin-top:14px"><h2 style="margin-top:0">Últimas semanas</h2><div class="bars">${CL.semanas.map(w => `<div><b>${w.concluidos}</b><i style="height:${Math.round(Math.min(w.concluidos, 6) / 6 * 100)}%"></i>${D.fdate(w.inicio).slice(0, 5)}</div>`).join('')}</div></div>
    <div class="seg" style="margin:16px 0 12px"><button class="${CL.filtro === 'todas' ? 'on' : ''}" data-act="cl-f" data-f="todas">Todas (${CL.itens.length})</button><button class="${CL.filtro === 'completas' ? 'on' : ''}" data-act="cl-f" data-f="completas">Concluídas (${comp})</button><button class="${CL.filtro === 'parciais' ? 'on' : ''}" data-act="cl-f" data-f="parciais">Pararam no meio (${CL.itens.length - comp})</button></div>
    <div class="list">${lista.map(x => `<div class="item click" data-act="cl-open" data-id="${x.id}"><div class="av">${esc(D.initials(x.nome || '?'))}</div><div class="t"><b>${esc(x.nome || 'Sem nome')}</b><span>${x.completo ? '✅ Concluiu a inscrição' : `⏸ Parou na etapa ${Math.min((x.etapa || 0) + 1, x.total || 7)} de ${x.total || 7}`} · ${D.fdt(x.atualizado)}</span></div><span class="pill ${CRM[x.crm][1]}">${CRM[x.crm][0]}</span></div>`).join('') || '<div class="empty">Ninguém por aqui ainda.<br>Gere o link e convide a primeira pessoa 💜</div>'}</div>`);
  if (CL.gen) drawQr(link);
}
function drawQr(link) {
  const cv = $('#qr'); if (!cv || typeof qrcode !== 'function') return;
  const q = qrcode(0, 'M'); q.addData(link); q.make();
  const n = q.getModuleCount(), px = 8, pad = 4, size = (n + pad * 2) * px;
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#1D1B26';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + pad) * px, (r + pad) * px, px, px);
}
D.act['cl-gen'] = () => { CL.gen = true; drawClube(); D.toast('Link e QR Code gerados ✓'); };
D.act['cl-f'] = el => { CL.filtro = el.dataset.f; drawClube(); };
D.act['cl-copy'] = () => D.copy(D.clubeLink(), 'Link copiado ✓');
D.act['cl-share'] = async () => {
  const link = D.clubeLink();
  if (navigator.share) { try { await navigator.share({ title: 'Clube de Vantagens doTERRA', text: msgConvite(link) }); } catch (e) { } } else D.copy(msgConvite(link), 'Mensagem copiada ✓');
};
D.act['cl-qr'] = () => {
  const cv = $('#qr'); if (!cv) return;
  cv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qrcode-clube-de-vantagens-doterra.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png');
};
D.act['cl-open'] = el => {
  const x = CL.itens.find(i => i.id === Number(el.dataset.id)); if (!x) return;
  const nome = D.first(x.nome) || 'tudo bem';
  const msg = x.completo ? `Oi, ${nome}! Aqui é ${D.first(D.S.user.nome)} 💜 Recebi a sua inscrição no Clube de Vantagens doTERRA! Vou te ajudar com os próximos passos. Pode falar agora?` : `Oi, ${nome}! Aqui é ${D.first(D.S.user.nome)} 💜 Vi que você começou a sua inscrição no Clube de Vantagens doTERRA e parou no meio. Quer ajuda para terminar? Leva só mais um minutinho!`;
  const lin = (t, v) => v ? `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="small muted">${t}</div><div>${esc(v)}</div></div>` : '';
  const end = [x.rua && x.rua + (x.numero ? ', ' + x.numero : ''), x.complemento, x.bairro, [x.cidade, x.uf].filter(Boolean).join(' - '), x.cep && 'CEP ' + fCep(x.cep)].filter(Boolean).join(' · ');
  const sh = D.sheet(x.nome || 'Inscrição', `
    <div class="row wrap"><span class="pill ${x.completo ? 'ok' : 'warn'}">${x.completo ? 'Concluiu a inscrição' : 'Parou na etapa ' + Math.min((x.etapa || 0) + 1, x.total || 7)}</span><span class="small muted">${D.fdt(x.atualizado)}</span></div>
    ${x.telefone ? `<a class="btn wa block" style="margin-top:12px" target="_blank" rel="noopener" href="${D.wa(x.telefone, msg)}">💬 Chamar ${esc(nome)} · ${esc(D.fphone(x.telefone))}</a>` : '<p class="muted">Ainda sem telefone.</p>'}
    <h3 style="margin-top:18px">Andamento</h3><div class="chips" id="crmch">${Object.keys(CRM).map(k => `<button class="chip ${x.crm === k ? 'on' : ''}" data-act="cl-crm-pick" data-k="${k}">${CRM[k][0]}</button>`).join('')}</div>
    <div class="field" style="margin-top:4px"><label for="crmNota">Anotações</label><textarea id="crmNota" maxlength="800" placeholder="Ex.: vai fazer o primeiro pedido sexta…">${esc(x.nota)}</textarea></div>
    <button class="btn block" style="margin-top:10px" data-act="cl-crm-save" data-id="${x.id}">Salvar andamento</button>
    <h3 style="margin-top:22px">Dados da pessoa</h3>
    ${lin('Nome completo', x.nome)}${lin('Telefone', x.telefone && D.fphone(x.telefone))}${lin('E-mail', x.email)}${lin('Data de nascimento', x.nascimento && D.fdate(x.nascimento))}${lin('CPF', fCpf(x.cpf))}${lin('Endereço', end)}
    <p class="small muted" style="margin-top:12px">🔐 A senha criada pela pessoa é guardada de forma protegida e ninguém consegue vê-la (nem você, nem o administrador).</p>
    <button class="btn sec2 block" style="margin-top:10px" data-act="cl-copydados" data-id="${x.id}">Copiar dados (sem a senha)</button>
    <button class="btn ghost block sm" style="margin-top:14px" data-act="cl-del" data-id="${x.id}">Remover esta inscrição da lista</button>`);
  sh._crm = x.crm;
};
D.act['cl-crm-pick'] = el => { const o = $('#ov'); o._crm = el.dataset.k; $$('#crmch .chip').forEach(c => c.classList.toggle('on', c === el)); };
D.act['cl-crm-save'] = async el => {
  const o = $('#ov'), id = Number(el.dataset.id);
  await D.api('clube_crm', { id, crm: o._crm, nota: D.val('crmNota') });
  const x = CL.itens.find(i => i.id === id); if (x) { x.crm = o._crm; x.nota = D.val('crmNota'); }
  D.closeSheet(true); D.toast('Salvo ✓'); drawClube(); D.refreshBadges();
};
D.act['cl-copydados'] = el => {
  const x = CL.itens.find(i => i.id === Number(el.dataset.id)); if (!x) return;
  D.copy(['Nome: ' + x.nome, 'Telefone: ' + D.fphone(x.telefone), 'E-mail: ' + x.email, 'Nascimento: ' + (x.nascimento ? D.fdate(x.nascimento) : ''), 'CPF: ' + fCpf(x.cpf),
    'Endereço: ' + [x.rua, x.numero, x.complemento, x.bairro, x.cidade, x.uf].filter(Boolean).join(', '), 'CEP: ' + fCep(x.cep)].join('\n'), 'Dados copiados ✓');
};
D.act['cl-del'] = async el => {
  if (!await D.confirm('Remover da lista?', 'A inscrição sai da sua lista, mas uma cópia fica guardada para sempre no arquivo do sistema.', 'Remover', true)) return;
  await D.api('clube_apagar', { id: Number(el.dataset.id) }); D.toast('Removido da lista'); D.V.clube($('#main'));
};

/* ================= HISTÓRICO POR MÊS ================= */
D.mesNome = ym => { const [y, m] = String(ym).split('-').map(Number); const t = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
let HIST = [];
D.V.historico = async m => {
  HIST = (await D.api('historico')).meses; drawHist(m);
};
function drawHist(m) {
  m = m || $('#main');
  const card = x => `<div class="card" style="margin-top:14px"><h2 style="margin-top:0">${esc(D.mesNome(x.mes))}</h2>
    <div class="kpis"><div class="kpi"><b>${x.chamados}</b><span>contatos chamados</span></div><div class="kpi"><b>${x.interessados}</b><span>interessados</span></div><div class="kpi"><b>${x.vendas}</b><span>vendas · ${D.brl(x.valor)}</span></div></div>
    <div class="kpis" style="margin-top:10px"><div class="kpi"><b>${x.ana_ok}<small style="font-size:14px"> de ${x.ana}</small></b><span>anamneses completas</span></div><div class="kpi"><b>${x.clube_ok}</b><span>inscrições no Clube concluídas</span></div><div class="kpi"><b>${D.num(x.pv)}</b><span>PV das vendas</span></div></div></div>`;
  m.innerHTML = D.page('Histórico por mês', `<p class="muted">Tudo o que você fez fica guardado para sempre. Aqui está mês a mês, para consultar quando quiser.</p>
    <button class="btn sec2 block" data-act="hist-csv">⬇ Baixar o histórico (planilha)</button>${HIST.map(card).join('')}`);
}
D.act['hist-csv'] = () => {
  const head = ['Mês', 'Contatos chamados', 'Interessados', 'Vendas', 'Valor vendido', 'PV das vendas', 'Anamneses iniciadas', 'Anamneses completas', 'Inscrições no Clube iniciadas', 'Inscrições no Clube concluídas'];
  const rows = HIST.map(x => [x.mes, x.chamados, x.interessados, x.vendas, String(x.valor).replace('.', ','), x.pv, x.ana, x.ana_ok, x.clube, x.clube_ok]);
  D.download('historico-por-mes-' + D.today() + '.csv', head, rows);
};
/* planilha CSV segura (Excel BR: separador ;, acentos OK, sem injeção de fórmulas) */
D.download = (nome, head, rows) => {
  const safe = v => { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const csv = '﻿' + [head].concat(rows).map(r => r.map(safe).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nome;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
})();


/* ================= TUTORIAL ================= */
// Para incluir outra aula: publique o vídeo no YouTube (pode ser "não listado") e acrescente uma linha aqui com o código do vídeo (yt).
D.TUTORIAIS = [
  { id: '1119', titulo: 'Aula de início: conheça o Diamante App', desc: 'Assista com calma, de preferência nos seus primeiros 7 dias. Ela mostra o passo a passo para usar o app no dia a dia.', yt: 'u82cHlNBYcQ' }
];
D.TUT_DIAS = 7;
const tutKey = id => 'diamante_tut_' + ((D.S.user || {}).id || 0) + '_' + id;
const tutVisto = id => { try { return localStorage.getItem(tutKey(id)) === '1'; } catch (e) { return false; } };
const tutMarca = id => { try { localStorage.setItem(tutKey(id), '1'); } catch (e) { /* sem armazenamento: só não lembra */ } };
// Dias que ainda restam da janela de 7 dias desde o cadastro (0 = já passou)
D.tutRestam = () => {
  const c = (D.S.user || {}).criado; if (!c) return 0;
  const t = new Date(String(c).replace(' ', 'T')); if (isNaN(t)) return 0;
  const dias = Math.floor((Date.now() - t.getTime()) / 86400000);
  return Math.max(0, D.TUT_DIAS - dias);
};
D.tutCard = () => {
  const restam = D.tutRestam(); if (!restam) return '';
  const pend = D.TUTORIAIS.filter(a => !tutVisto(a.id)); if (!pend.length) return '';
  return `<button class="task" data-act="nav" data-v="tutorial" style="border-color:var(--l400,#7656D6)"><div class="ic">🎓</div><div class="t"><b>Assista ao Tutorial</b><span>Comece por aqui nos seus primeiros ${D.TUT_DIAS} dias${restam < D.TUT_DIAS ? ' · ainda ' + (restam === 1 ? 'resta 1 dia' : 'restam ' + restam + ' dias') : ''}</span></div><div class="go">›</div></button>`;
};
D.V.tutorial = async m => {
  const esc = D.esc || (x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const restam = D.tutRestam();
  m.innerHTML = D.page('Tutorial', `
    ${restam ? `<div class="card tint" style="margin-bottom:14px"><b>👋 Bem-vindo(a)!</b><p style="margin:6px 0 0">Assista à aula nos seus primeiros ${D.TUT_DIAS} dias de app${restam < D.TUT_DIAS ? ` (ainda ${restam === 1 ? 'resta 1 dia' : 'restam ' + restam + ' dias'})` : ''}. Você pode pausar e continuar quando quiser.</p></div>` : '<p class="muted">As aulas ficam sempre aqui para você rever quando quiser.</p>'}
    ${D.TUTORIAIS.map(a => `<div class="card" style="margin-top:14px">
      <h2 style="margin-top:0">${esc(a.titulo)}</h2>
      <div style="position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000"><iframe src="https://www.youtube-nocookie.com/embed/${esc(a.yt)}?rel=0&modestbranding=1" title="${esc(a.titulo)}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <a class="btn sm ghost block" style="margin-top:10px" href="https://youtu.be/${esc(a.yt)}" target="_blank" rel="noopener noreferrer">Abrir no YouTube ↗</a>
      <p class="muted" style="margin:10px 0 0">${esc(a.desc)}</p>
      <button class="btn sec2 block" style="margin-top:12px" data-act="tut-visto" data-id="${esc(a.id)}">${tutVisto(a.id) ? '✅ Já assisti' : 'Marcar como assistida'}</button>
    </div>`).join('')}`);
};
D.act['tut-visto'] = el => { tutMarca(el.dataset.id); el.textContent = '✅ Já assisti'; D.toast('Aula marcada como assistida ✓'); };
