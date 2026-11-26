/* Diamante App - painel do administrador: produção de todos, histórico por mês, backup, senhas e e-mails */
(function () {
'use strict';
const D = window.D, esc = D.esc, $ = D.$, $$ = D.$$;
const AD = { users: [], q: '', ord: 'nome', tab: 'users', hist: null, clube: null, mes: '', meses: [], bk: null };

D.V.admin = async m => {
  if (D.S.user.role !== 'admin') { D.go('home'); return; }
  AD.users = (await D.api('admin_users')).usuarios; drawAdmin(m);
};
function drawAdmin(m) {
  m = m || $('#main');
  const us = AD.users, ativos = us.filter(u => u.ativo);
  const sum = k => ativos.reduce((a, u) => a + (u[k] || 0), 0);
  const q = AD.q.toLowerCase();
  let list = us.filter(u => !q || (u.nome + ' ' + u.email + ' ' + u.rank).toLowerCase().includes(q));
  const ord = { nome: (a, b) => a.nome.localeCompare(b.nome), chamados: (a, b) => b.chamados_30d - a.chamados_30d, vendas: (a, b) => b.valor_mes - a.valor_mes, login: (a, b) => (b.ultimo_login || '').localeCompare(a.ultimo_login || ''), parados: (a, b) => a.chamados_30d - b.chamados_30d }[AD.ord];
  list = list.slice().sort(ord);
  const users = `
    <div class="card"><div class="kpis"><div class="kpi"><b>${ativos.length}</b><span>contas ativas</span></div><div class="kpi"><b>${sum('chamados_hoje')}</b><span>chamados hoje</span></div><div class="kpi"><b>${sum('chamados_30d')}</b><span>chamados em 30 dias</span></div><div class="kpi"><b>${D.brl(sum('valor_mes'))}</b><span>vendas no mês</span></div><div class="kpi"><b>${D.num(sum('pv_mes'))}</b><span>PV no mês</span></div><div class="kpi"><b>${sum('ana_completas')}</b><span>anamneses completas</span></div></div></div>
    <div class="row wrap" style="margin:14px 0"><input id="adQ" type="search" placeholder="Buscar por nome, e-mail ou rank" value="${esc(AD.q)}" style="flex:2;min-width:200px"><select id="adOrd" style="flex:1;min-width:150px">${[['nome', 'Ordem alfabética'], ['chamados', 'Mais chamadas (30d)'], ['parados', 'Menos chamadas (30d)'], ['vendas', 'Maior venda no mês'], ['login', 'Último acesso']].map(([v, t]) => `<option value="${v}" ${AD.ord === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="list">${list.map(u => `<div class="item click" data-act="ad-open" data-id="${u.id}" style="${u.ativo ? '' : 'opacity:.55'}"><div class="av">${esc(D.initials(u.nome))}</div><div class="t"><b>${esc(u.nome)} ${u.role === 'admin' ? '<span class="pill">admin</span>' : ''}${u.ativo ? '' : '<span class="pill bad">desativada</span>'}</b><span>${esc(u.rank)} · hoje ${u.chamados_hoje} · 30d: ${u.chamados_30d} chamados, ${u.interessados_30d} interessados, ${u.vendas_30d} vendas</span><span style="display:block">Mês: ${D.brl(u.valor_mes)} · ${D.num(u.pv_mes)} PV · anamneses ${u.ana_completas}/${u.ana_total} · acesso ${D.ago(u.ultimo_login) ? 'há ' + D.ago(u.ultimo_login) : 'nunca'}</span></div><span style="font-size:22px;color:var(--l600)">›</span></div>`).join('') || '<div class="empty">Ninguém encontrado.</div>'}</div>
    <button class="btn block ghost" style="margin-top:16px" data-act="ad-csv">⬇ Baixar planilha da produção (CSV)</button>`;
  const meses = AD.meses || [];
  const hist = AD.hist ? `
    <div class="row wrap" style="margin-bottom:12px"><select id="adMes" style="flex:1;min-width:180px">${meses.map(x => `<option value="${x}" ${x === AD.mes ? 'selected' : ''}>${esc(D.mesNome(x))}</option>`).join('')}</select><button class="btn sec2" data-act="hist-csv-adm">⬇ Planilha do mês</button></div>
    <div class="card scrollx"><table class="tbl"><thead><tr><th>Consultor</th><th>Chamados</th><th>Interessados</th><th>Vendas</th><th>Valor</th><th>Anamneses</th><th>Clube</th></tr></thead><tbody>${AD.hist.map(u => `<tr><td><b>${esc(u.nome)}</b><div class="small muted">${esc(u.rank)}${u.ativo ? '' : ' · desativada'}</div></td><td>${u.chamados}</td><td>${u.interessados}</td><td>${u.vendas}</td><td>${D.brl(u.valor)}</td><td>${u.ana_ok}/${u.ana}</td><td>${u.clube_ok}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin-top:10px">Anamneses: completas/iniciadas no mês. Clube: inscrições concluídas no mês. Todos os meses ficam guardados para sempre.</p>` : '<div class="empty">Carregando…</div>';
  const cl = AD.clube;
  const clube = !cl ? '<div class="empty">Carregando…</div>' : `
    <p class="muted small">Todas as inscrições do Clube de Vantagens, de todos os consultores. A senha escolhida pela pessoa só aparece para você, ao tocar em "Ver senha".${cl.chave_ok ? '' : '<br><span style="color:var(--warn)">⚠️ Falta a DADOS_KEY no config.local.php: as senhas novas não estão sendo guardadas de forma legível. Veja o LEIA-ME.</span>'}</p>
    <div class="list">${cl.itens.map(x => `<div class="item"><div class="av">${esc(D.initials(x.nome || '?'))}</div><div class="t"><b>${esc(x.nome || 'Sem nome')}</b><span>${x.completo ? '✅ Concluiu' : '⏸ Parou na etapa ' + Math.min((x.etapa || 0) + 1, x.total || 7)} · convite de ${esc(x.consultor)} · ${D.fdt(x.atualizado)}</span><span>${esc(D.fphone(x.telefone))} · ${esc(x.email)}</span></div>${x.tem_senha ? `<button class="btn sm sec2" data-act="ad-senha-ver" data-id="${x.id}">🔑 Ver senha</button>` : `<span class="pill">${x.definiu_senha ? 'senha indisponível' : 'sem senha ainda'}</span>`}</div>`).join('') || '<div class="empty">Ninguém se inscreveu ainda.</div>'}</div>`;
  const bk = AD.bk;
  const backup = `
    <div class="card"><h2 style="margin-top:0">Backup fora da Hostinger</h2>
      <p class="muted small">Os dados ficam guardados para sempre no servidor. Para ter uma cópia fora dele (no seu computador ou no Google Drive), use o backup. O arquivo traz o banco completo e planilhas separadas por mês.</p>
      <a class="btn block" href="api.php?a=admin_backup">⬇ Baixar backup agora</a>
      <p class="small muted" style="margin-top:12px">Último backup automático: <b>${bk && bk.ultimo_auto ? D.fdt(bk.ultimo_auto) : 'nenhum ainda'}</b>${bk && !bk.token_ok ? '<br><span style="color:var(--warn)">⚠️ O backup automático está desligado: falta definir o BACKUP_TOKEN no config.local.php. Veja o LEIA-ME.</span>' : ''}</p></div>
    <div class="card" style="margin-top:14px"><h3 style="margin-top:0">Backup automático (recomendado)</h3>
      <p class="small muted">Na pasta <b>Diamante App - Backup</b>, no seu computador, há dois programinhas prontos: um baixa a cópia todo dia para o seu PC e outro salva no seu Google Drive. Os passos estão no arquivo LEIA-ME-BACKUP.txt dessa pasta.</p></div>`;
  m.innerHTML = D.page('Administração', `<div class="seg" style="margin-bottom:14px"><button class="${AD.tab === 'users' ? 'on' : ''}" data-act="ad-tab" data-t="users">Usuários</button><button class="${AD.tab === 'hist' ? 'on' : ''}" data-act="ad-tab" data-t="hist">Histórico por mês</button><button class="${AD.tab === 'clube' ? 'on' : ''}" data-act="ad-tab" data-t="clube">Clube</button><button class="${AD.tab === 'backup' ? 'on' : ''}" data-act="ad-tab" data-t="backup">Backup</button></div>${AD.tab === 'users' ? users : AD.tab === 'hist' ? hist : AD.tab === 'clube' ? clube : backup}`);
  const im = $('#adMes'); if (im) im.onchange = () => loadHist(im.value);
  const iq = $('#adQ'); if (iq) iq.oninput = () => { AD.q = iq.value; drawAdmin(); const n = $('#adQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  const io = $('#adOrd'); if (io) io.onchange = () => { AD.ord = io.value; drawAdmin(); };
}
D.act['ad-tab'] = async el => {
  AD.tab = el.dataset.t; drawAdmin();
  if (AD.tab === 'hist' && !AD.hist) await loadHist(AD.mes || '');
  if (AD.tab === 'clube') { try { AD.clube = await D.api('admin_clube'); } catch (e) { } drawAdmin(); }
  if (AD.tab === 'backup') { try { AD.bk = await D.api('admin_backup_status'); } catch (e) { } drawAdmin(); }
};
D.act['ad-senha-ver'] = async el => {
  const r = await D.api('admin_clube_senha', { id: Number(el.dataset.id) });
  D.sheet('Senha de ' + (r.nome || 'inscrito'), `<p class="muted small">Senha escolhida pela própria pessoa no Clube de Vantagens. Não compartilhe nem anote em lugares abertos.</p>
    <div class="card tint" style="text-align:center"><div style="font-size:26px;font-weight:700;letter-spacing:.04em;word-break:break-all" id="sv">${esc(r.senha)}</div></div>
    <button class="btn block" style="margin-top:12px" data-act="ad-senha-copy">Copiar senha</button>`);
};
D.act['ad-senha-copy'] = () => D.copy(($('#sv') || {}).textContent || '', 'Senha copiada ✓');
async function loadHist(mes) {
  const r = await D.api('admin_historico', { mes: mes || undefined });
  AD.mes = r.mes; AD.meses = r.meses.includes(r.mes) ? r.meses : [r.mes].concat(r.meses); AD.hist = r.usuarios; drawAdmin();
}
D.act['hist-csv-adm'] = () => {
  const head = ['Consultor', 'E-mail', 'Rank', 'Contatos chamados', 'Interessados', 'Vendas', 'Valor vendido', 'PV das vendas', 'Anamneses iniciadas', 'Anamneses completas', 'Inscrições no Clube iniciadas', 'Inscrições no Clube concluídas'];
  D.download('producao-' + AD.mes + '.csv', head, (AD.hist || []).map(u => [u.nome, u.email, u.rank, u.chamados, u.interessados, u.vendas, String(u.valor).replace('.', ','), u.pv, u.ana, u.ana_ok, u.clube, u.clube_ok]));
};
D.act['ad-csv'] = () => {
  const head = ['Nome', 'E-mail', 'WhatsApp', 'Rank', 'Ativa', 'Chamados hoje', 'Chamados 30d', 'Interessados 30d', 'Vendas 30d', 'Valor vendido no mês', 'PV no mês', 'Clube na semana', 'Clube no total', 'Contatos importados', 'Anamneses', 'Anamneses completas', 'Último acesso'];
  const rows = AD.users.map(u => [u.nome, u.email, u.whatsapp, u.rank, u.ativo ? 'sim' : 'não', u.chamados_hoje, u.chamados_30d, u.interessados_30d, u.vendas_30d, String(u.valor_mes).replace('.', ','), u.pv_mes, u.clube_semana, u.clube_total, u.contatos, u.ana_total, u.ana_completas, u.ultimo_login || '']);
  const safe = v => { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const csv = '﻿' + [head].concat(rows).map(r => r.map(safe).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'producao-diamante-' + D.today() + '.csv';
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};

D.act['ad-open'] = async el => {
  const id = Number(el.dataset.id), r = await D.api('admin_user', { id }), u = r.user;
  const me = u.id === D.S.user.id;
  const dias = r.dias.slice(0, 14);
  D.sheet(u.nome, `
    <div class="row wrap"><span class="pill">${esc(u.rank)}</span><span class="small muted">Conta criada em ${D.fdate(u.criado)} · último acesso ${u.ultimo_login ? D.fdt(u.ultimo_login) : 'nunca'}</span></div>
    <h3 style="margin-top:16px">Dados da conta</h3>
    <div class="field" style="margin-top:6px"><label for="aNome">Nome completo</label><input id="aNome" type="text" value="${esc(u.nome)}"></div>
    <div class="field"><label for="aEmail">E-mail (login)</label><input id="aEmail" type="email" value="${esc(u.email)}" autocapitalize="none"></div>
    <div class="field"><label for="aWa">WhatsApp</label><input id="aWa" type="tel" value="${esc(D.fphone(u.whatsapp))}"></div>
    <div class="field"><label for="aRk">Rank</label><select id="aRk">${D.RANKS.map(x => `<option ${x === u.rank ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <label class="row" style="margin-top:14px;cursor:pointer"><input type="checkbox" id="aAtivo" ${u.ativo ? 'checked' : ''} ${me ? 'disabled' : ''} style="width:26px;height:26px;accent-color:var(--l600)"><span>Conta ativa (pode entrar)</span></label>
    <label class="row" style="margin-top:10px;cursor:pointer"><input type="checkbox" id="aAdm" ${u.role === 'admin' ? 'checked' : ''} ${me ? 'disabled' : ''} style="width:26px;height:26px;accent-color:var(--l600)"><span>Também é administrador</span></label>
    <div class="err" id="err" role="alert"></div><button class="btn block" style="margin-top:10px" data-act="ad-save" data-id="${u.id}">Salvar dados</button>
    <h3 style="margin-top:24px">Definir nova senha</h3><p class="small muted">A pessoa será desconectada e entra com a nova senha.</p>
    <div class="row"><input id="aPw" type="text" autocomplete="off" placeholder="Nova senha (8+, letras e números)" style="flex:1"><button class="btn sec2" data-act="ad-gen" aria-label="Gerar senha">Gerar</button></div>
    <div class="err" id="err2" role="alert"></div><button class="btn block sec2" style="margin-top:10px" data-act="ad-pw" data-id="${u.id}">Trocar senha</button>
    <h3 style="margin-top:24px">Produção (últimos dias)</h3>
    ${dias.length ? `<div class="scrollx"><table class="tbl"><thead><tr><th>Dia</th><th>Chamou</th><th>Interessou</th><th>Vendas</th></tr></thead><tbody>${dias.map(d => `<tr><td>${D.fdate(d.dia)}</td><td>${d.chamados}</td><td>${d.interessados}</td><td>${d.vendas}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sem atividade registrada.</p>'}
    <h3 style="margin-top:20px">Últimas vendas</h3>
    ${r.vendas.length ? `<div class="scrollx"><table class="tbl"><tbody>${r.vendas.slice(0, 10).map(v => `<tr><td>${D.fdate(v.data)}</td><td>${esc(v.cliente)}</td><td>${esc(v.produto)}</td><td>${D.brl(v.valor)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nenhuma venda.</p>'}
    <h3 style="margin-top:20px">Listas de contatos</h3>
    ${r.listas.length ? r.listas.map(l => `<div class="small">${esc(l.nome)}: ${l.trabalhados} de ${l.total} contatos trabalhados</div>`).join('') : '<p class="muted">Nenhuma lista.</p>'}
    <h3 style="margin-top:20px">Anamneses</h3>
    ${r.ana.length ? r.ana.slice(0, 10).map(a => `<div class="small">${esc(a.nome || 'Sem nome')} — ${a.completo ? 'completa' : 'parou na etapa ' + Math.min((a.etapa || 0) + 1, a.total || 6)} · ${D.fdate(a.atualizado)}</div>`).join('') : '<p class="muted">Nenhuma.</p>'}
    <p class="small muted" style="margin-top:20px">Contas nunca são apagadas: os dados ficam guardados para sempre. Para tirar o acesso, desmarque “Conta ativa”.</p>`);
};
D.act['ad-gen'] = () => {
  const L = 'abcdefghjkmnpqrstuvwxyz', N = '23456789'; const rnd = s => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  let p = ''; for (let i = 0; i < 6; i++) p += rnd(L); p += rnd(L).toUpperCase(); for (let i = 0; i < 3; i++) p += rnd(N);
  $('#aPw').value = p;
};
D.act['ad-save'] = async el => {
  const id = Number(el.dataset.id);
  const d = { id, nome: D.val('aNome').trim(), email: D.val('aEmail').trim(), whatsapp: D.val('aWa').trim(), rank: D.val('aRk'), ativo: $('#aAtivo').checked, role: $('#aAdm').checked ? 'admin' : 'user' };
  if (d.nome.split(/\s+/).filter(Boolean).length < 2) return D.setErr('Nome completo, por favor.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return D.setErr('E-mail inválido.');
  if (!D.phone(d.whatsapp)) return D.setErr('WhatsApp inválido (use DDD).');
  D.setErr(''); D.busy(el, true);
  try { await D.api('admin_salvar', d); } catch (e) { D.busy(el, false); return D.setErr(e.message); }
  D.closeSheet(true); D.toast('Dados salvos ✓'); D.V.admin($('#main'));
};
D.act['ad-pw'] = async el => {
  const pw = D.val('aPw').trim();
  if (pw.length < 8 || !/[A-Za-zÀ-ÿ]/.test(pw) || !/\d/.test(pw)) return D.setErr('A senha precisa de 8+ caracteres, com letras e números.', 'err2');
  D.setErr('', 'err2'); D.busy(el, true);
  try { await D.api('admin_senha', { id: Number(el.dataset.id), senha: pw }); } catch (e) { D.busy(el, false); return D.setErr(e.message, 'err2'); }
  D.busy(el, false); D.toast('Senha trocada ✓ Envie a nova senha para a pessoa.');
};
})();
