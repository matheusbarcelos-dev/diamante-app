(function(){
'use strict';
/* Clube de Vantagens doTERRA - página pública de inscrição, uma etapa por tela. */
var params=new URLSearchParams(location.search), C=(params.get('c')||'').replace(/[^a-z0-9]/gi,'').slice(0,20);
var app=document.getElementById('app'), foot=document.getElementById('foot'), footin=document.getElementById('footin');
var KEY='diamante_clube_'+C;
var BEN=[
  ['%','25% de desconto','Sobre o preço de varejo de TODOS os produtos.'],
  ['🪙','Cashback de até 30%','Em pontos para trocar por produtos.'],
  ['🎁','Todo mês, um óleo grátis','Em pedido único de 125 PV ou mais, até o dia 15.'],
  ['🏷️','Promoções exclusivas','Aproveite as condições de cada campanha.'],
  ['📅','Você não precisa comprar todos os meses!','Autoenvio opcional. Compre conforme sua necessidade.']];
var UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
/* i=0 é a tela de boas-vindas; as etapas começam em 1 */
var STEPS=[
  {ic:'👤',rot:'Nome',t:function(){return 'Qual é o seu nome completo?'},campos:['nome']},
  {ic:'📱',rot:'Telefone',t:function(n){return (n?n+', qual':'Qual')+' é o seu telefone?'},campos:['telefone']},
  {ic:'✉️',rot:'E-mail',t:function(){return 'Qual é o seu e-mail?'},campos:['email']},
  {ic:'🎂',rot:'Data de nascimento',t:function(){return 'Quando você nasceu?'},campos:['nascimento']},
  {ic:'🔐',rot:'Senha',t:function(){return 'Crie uma senha para acessar os seus pedidos'},campos:['senha','senha2']},
  {ic:'🪪',rot:'CPF',t:function(){return 'Qual é o seu CPF?'},campos:['cpf']},
  {ic:'🏠',rot:'Endereço',t:function(){return 'Onde você quer receber os seus pedidos?'},campos:['cep','rua','numero','complemento','bairro','cidade','uf']}];
var TOTAL=STEPS.length;
var S={info:null,i:0,d:{},sid:'',done:false,consent:false,senhaOk:false,pw:'',busy:false};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function rid(){var a=new Uint8Array(12);(window.crypto||window.msCrypto).getRandomValues(a);return Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}
function phoneOk(v){var d=String(v||'').replace(/\D+/g,'').replace(/^0+/,'');if(d.length===10||d.length===11)d='55'+d;return d.length>=12&&d.length<=13&&d.indexOf('55')===0?d:''}
function fmtTel(v){var d=String(v).replace(/\D/g,'').slice(0,11);if(d.length>6)return '('+d.slice(0,2)+') '+d.slice(2,d.length-4)+'-'+d.slice(-4);if(d.length>2)return '('+d.slice(0,2)+') '+d.slice(2);return d}
function fmtCpf(v){var d=String(v).replace(/\D/g,'').slice(0,11);return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2')}
function fmtCep(v){var d=String(v).replace(/\D/g,'').slice(0,8);return d.length>5?d.slice(0,5)+'-'+d.slice(5):d}
function cpfOk(v){var c=String(v||'').replace(/\D/g,'');if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;
  for(var t=9;t<11;t++){var s=0;for(var i=0;i<t;i++)s+=Number(c[i])*(t+1-i);if(Number(c[t])!==((10*s)%11)%10)return false}return true}
function idade(iso){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');if(!m)return -1;var y=+m[1],mo=+m[2],d=+m[3],dt=new Date(y,mo-1,d);
  if(dt.getFullYear()!==y||dt.getMonth()!==mo-1||dt.getDate()!==d)return -1;var h=new Date(),a=h.getFullYear()-y;if(h.getMonth()+1<mo||(h.getMonth()+1===mo&&h.getDate()<d))a--;return a}
function nomeOk(v){return String(v||'').trim().split(/\s+/).filter(Boolean).length>=2}
function firstName(){return (S.d.nome||'').trim().split(/\s+/)[0]||''}

/* Só guardamos no aparelho o necessário para retomar. A senha NUNCA é guardada. Ao concluir, apagamos os dados pessoais do aparelho. */
function load(){try{var j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&j.sid){S.sid=j.sid;S.d=j.d||{};S.i=Math.min(j.i||0,TOTAL);S.done=!!j.done;S.consent=!!j.consent;S.senhaOk=!!j.senhaOk}}catch(e){}if(!S.sid)S.sid=rid()}
function persist(){try{
  if(S.done){localStorage.setItem(KEY,JSON.stringify({sid:S.sid,d:{nome:S.d.nome||''},i:TOTAL,done:true,consent:true,senhaOk:true}));return}
  localStorage.setItem(KEY,JSON.stringify({sid:S.sid,d:S.d,i:S.i,done:false,consent:S.consent,senhaOk:S.senhaOk}))}catch(e){}}

/* ---- salvar no servidor: a cada etapa e (com pequeno atraso) a cada resposta, mesmo se a pessoa parar no meio ---- */
var tmr=null;
function payload(completo){
  var d={};Object.keys(S.d).forEach(function(k){if(k!=='senha'&&k!=='senha2')d[k]=S.d[k]});
  var p={c:C,sid:S.sid,etapa:S.done?TOTAL:Math.max(0,S.i-1),total:TOTAL,completo:!!completo,consent:S.consent,dados:d};
  if(S.pw)p.senha=S.pw;
  return p;
}
function post(completo){
  return fetch('api.php?a=clube_salvar',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'diamante'},body:JSON.stringify(payload(completo))})
    .then(function(r){return r.json()}).then(function(j){if(j.ok&&j.tem_senha){S.senhaOk=true;S.pw='';persist()}return j});
}
function save(completo,imediato){
  persist();
  if(!S.consent||!nomeOk(S.d.nome))return Promise.resolve({ok:true,skip:true});
  clearTimeout(tmr);
  if(imediato)return post(completo).catch(function(){return {ok:false,erro:'Sem conexão. Verifique a internet e tente de novo.'}});
  tmr=setTimeout(function(){post(false).then(function(j){setSaved(j.ok?'Salvo ✓':'')}).catch(function(){setSaved('')})},1000);
  return Promise.resolve({ok:true});
}
function setSaved(t){var e=document.getElementById('saved');if(e)e.textContent=t}

/* ---- telas ---- */
function benHTML(){return '<div class="ben">'+BEN.map(function(b){return '<div><div class="i">'+b[0]+'</div><div><b>'+esc(b[1])+'</b><span>'+esc(b[2])+'</span></div></div>'}).join('')+'</div>'}
function head(sub){return '<div class="top"><img src="icon-192.png" alt=""><div><b>Clube de Vantagens doTERRA</b><span>'+esc(sub)+'</span></div></div>'}

function renderWelcome(){
  window.scrollTo(0,0);
  app.innerHTML='<div class="card"><img class="logo" src="logo.png" alt="doTERRA"><h1 class="center">Seja bem-vindo ao Clube de Vantagens doTERRA</h1>'+benHTML()+
    '<label class="chk"><input type="checkbox" id="consent"'+(S.consent?' checked':'')+'><span>Autorizo o uso dos meus dados para a minha inscrição no Clube de Vantagens doTERRA e para o contato de <b>'+esc(S.info.consultor)+'</b>. Posso pedir a exclusão a qualquer momento.</span></label>'+
    '<div class="err" id="err" role="alert"></div></div><p class="fine">Convite de <b>'+esc(S.info.consultor)+'</b>, consultor(a) de bem-estar doTERRA.</p>';
  foot.hidden=false;
  footin.innerHTML='<button class="btn" id="go">'+(S.i>0?'Continuar minha inscrição':'Quero fazer a minha inscrição')+'</button>';
  document.getElementById('go').onclick=function(){
    if(!document.getElementById('consent').checked){var e=document.getElementById('err');e.textContent='Marque a caixinha para continuar.';return}
    S.consent=true;if(S.i===0)S.i=1;persist();render();
  };
}
function fld(id,label,type,opts){
  opts=opts||{};var v=S.d[id]||'';
  var inp='<input id="f_'+id+'" data-f="'+id+'" type="'+type+'"'+(opts.mode?' inputmode="'+opts.mode+'"':'')+' placeholder="'+esc(opts.ph||'')+'" autocomplete="'+(opts.auto||'off')+'" maxlength="'+(opts.max||80)+'"'+(opts.extra||'')+' value="'+esc(v)+'">';
  if(type==='password')inp='<div class="pw">'+inp+'<button type="button" data-show="'+id+'">Mostrar</button></div>';
  return '<div class="q"><label for="f_'+id+'">'+esc(label)+'</label>'+(opts.dica?'<div class="dica">'+esc(opts.dica)+'</div>':'')+inp+'</div>';
}
function campos(id){
  switch(id){
    case 'nome':return fld('nome','Nome e sobrenome','text',{ph:'Ex.: Maria Souza Lima',auto:'name',max:120});
    case 'telefone':return fld('telefone','Telefone com DDD','tel',{ph:'(62) 99999-9999',auto:'tel-national',mode:'tel',max:16,dica:'De preferência o seu WhatsApp.'});
    case 'email':return fld('email','E-mail','email',{ph:'voce@email.com',auto:'email',mode:'email',max:160});
    case 'nascimento':{var h=new Date();var max=(h.getFullYear()-18)+'-'+('0'+(h.getMonth()+1)).slice(-2)+'-'+('0'+h.getDate()).slice(-2);
      return fld('nascimento','Data de nascimento','date',{auto:'bday',max:10,extra:' max="'+max+'" min="1900-01-01"',dica:'É preciso ter 18 anos ou mais.'})}
    case 'senha':return fld('senha','Senha','password',{auto:'new-password',max:100,dica:'Mínimo de 8 caracteres, com letras e números.'});
    case 'senha2':return fld('senha2','Repita a senha','password',{auto:'new-password',max:100});
    case 'cpf':return fld('cpf','CPF','text',{ph:'000.000.000-00',mode:'numeric',max:14,auto:'off'});
    case 'cep':return fld('cep','CEP','text',{ph:'00000-000',mode:'numeric',max:9,auto:'postal-code',dica:'Ao digitar o CEP, preenchemos o endereço para você.'});
    case 'rua':return fld('rua','Rua, avenida…','text',{auto:'address-line1',max:120});
    case 'numero':return '<div class="row2">'+fld('numero','Número','text',{max:20,auto:'off'})+fld('complemento','Complemento (opcional)','text',{max:80,auto:'address-line2'})+'</div>';
    case 'complemento':return '';
    case 'bairro':return fld('bairro','Bairro','text',{max:80,auto:'off'});
    case 'cidade':return fld('cidade','Cidade','text',{max:80,auto:'address-level2'});
    case 'uf':return '<div class="q"><label for="f_uf">Estado</label><select id="f_uf" data-f="uf" autocomplete="address-level1"><option value="">Escolha…</option>'+UFS.map(function(u){return '<option'+(S.d.uf===u?' selected':'')+'>'+u+'</option>'}).join('')+'</select></div>';
  }
  return '';
}
function render(){
  if(S.done)return renderDone();
  if(S.i===0)return renderWelcome();
  window.scrollTo(0,0);
  var st=STEPS[S.i-1], pct=Math.round((S.i-1)/TOTAL*100);
  app.innerHTML=head('Inscrição')+'<div class="bar" role="progressbar" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+Math.max(6,pct)+'%"></i></div>'+
    '<div class="card"><div class="ico">'+st.ic+'</div><h1>'+esc(st.t(firstName()))+'</h1><p class="sub">Etapa '+S.i+' de '+TOTAL+' · '+esc(st.rot)+'</p>'+
    st.campos.map(campos).join('')+
    '<div class="err" id="err" role="alert"></div><div class="saved" id="saved"></div></div><p class="fine">Seus dados ficam protegidos e são usados só para a sua inscrição no Clube de Vantagens doTERRA.</p>';
  foot.hidden=false;
  footin.innerHTML='<button class="btn sec" id="back">Voltar</button><button class="btn" id="next">'+(S.i===TOTAL?'Concluir minha inscrição ✨':'Continuar')+'</button>';
  document.getElementById('next').onclick=next;
  document.getElementById('back').onclick=function(){S.i--;persist();render()};
  var f=app.querySelector('input:not([type=date])');if(f&&!f.value)setTimeout(function(){try{f.focus({preventScroll:true})}catch(e){}},50);
}
function validate(){
  var d=S.d;
  switch(S.i){
    case 1:return nomeOk(d.nome)?'':'Digite o seu nome completo (nome e sobrenome).';
    case 2:return phoneOk(d.telefone)?'':'Digite o telefone com DDD, por exemplo (62) 99999-9999.';
    case 3:return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email||'').trim())?'':'Esse e-mail parece incorreto. Confira e tente de novo.';
    case 4:{var a=idade(d.nascimento);return a<0?'Informe uma data de nascimento válida.':a<18?'É preciso ter 18 anos ou mais para entrar no Clube.':a>110?'Confira a data de nascimento.':''}
    case 5:{if(S.senhaOk&&!d.senha&&!d.senha2)return '';var p=String(d.senha||'');
      if(p.length<8)return 'A senha precisa ter pelo menos 8 caracteres.';if(!/[A-Za-zÀ-ÿ]/.test(p)||!/\d/.test(p))return 'Use letras e números na senha.';
      if(p!==String(d.senha2||''))return 'As duas senhas precisam ser iguais.';return ''}
    case 6:return cpfOk(d.cpf)?'':'Esse CPF parece incorreto. Confira os números.';
    case 7:{if(String(d.cep||'').replace(/\D/g,'').length!==8)return 'Digite o CEP com 8 números.';
      if(!String(d.rua||'').trim())return 'Digite a rua.';if(!String(d.numero||'').trim())return 'Digite o número (ou S/N, se não tiver).';
      if(!String(d.bairro||'').trim())return 'Digite o bairro.';if(!String(d.cidade||'').trim())return 'Digite a cidade.';if(!d.uf)return 'Escolha o estado.';return ''}
  }
  return '';
}
function showErr(m){var e=document.getElementById('err');if(e){e.textContent=m;e.scrollIntoView({behavior:'smooth',block:'center'})}}
function next(){
  if(S.busy)return;
  var m=validate();if(m)return showErr(m);
  showErr('');
  var btn=document.getElementById('next');
  if(S.i===5&&S.d.senha){S.pw=S.d.senha}
  var last=S.i===TOTAL;
  S.busy=true;btn.disabled=true;btn.textContent='Aguarde…';
  var sai=function(){S.busy=false};
  /* a senha e a conclusão só avançam quando o servidor confirma */
  var precisaConfirmar=(S.i===5&&S.pw)||last;
  if(S.i===5){delete S.d.senha;delete S.d.senha2}
  save(last,true).then(function(j){
    sai();
    if(precisaConfirmar&&!j.ok){
      if(S.i===5)S.d.senha=S.pw; 
      showErr(j.erro||'Não foi possível salvar agora. Tente de novo.');var b=document.getElementById('next');if(b){b.disabled=false;b.textContent=last?'Concluir minha inscrição ✨':'Continuar'}return}
    if(last){S.done=true;S.i=TOTAL;persist();render();return}
    S.i++;persist();render();
  });
}

/* ---- eventos ---- */
app.addEventListener('input',function(ev){
  var t=ev.target;if(t.id==='consent')return;var f=t.dataset&&t.dataset.f;if(!f)return;
  if(f==='telefone')t.value=fmtTel(t.value);
  if(f==='cpf')t.value=fmtCpf(t.value);
  if(f==='cep'){t.value=fmtCep(t.value);if(t.value.replace(/\D/g,'').length===8)buscaCep(t.value)}
  if(f==='uf')t.value=t.value.toUpperCase();
  S.d[f]=t.value;
  if(f!=='senha'&&f!=='senha2')save(false);else persist();
});
app.addEventListener('change',function(ev){var t=ev.target;if(t.dataset&&t.dataset.f==='uf'){S.d.uf=t.value;save(false)}if(t.dataset&&t.dataset.f==='nascimento'){S.d.nascimento=t.value;save(false)}});
app.addEventListener('click',function(ev){
  var b=ev.target.closest('button[data-show]');if(!b)return;
  var i=document.getElementById('f_'+b.dataset.show);if(!i)return;
  var mostrar=i.type==='password';i.type=mostrar?'text':'password';b.textContent=mostrar?'Ocultar':'Mostrar';
});
var ultimoCep='';
function buscaCep(v){
  var c=v.replace(/\D/g,'');if(c===ultimoCep)return;ultimoCep=c;
  fetch('api.php?a=clube_cep',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'diamante'},body:JSON.stringify({cep:c})})
    .then(function(r){return r.json()}).then(function(j){
      if(!j.ok||S.i!==TOTAL)return;
      ['rua','bairro','cidade','uf'].forEach(function(k){if(j[k]&&!S.d[k]){S.d[k]=j[k];var e=document.getElementById('f_'+k);if(e)e.value=j[k]}});
      save(false);
    }).catch(function(){});
}

/* ---- final ---- */
function renderDone(){
  window.scrollTo(0,0);foot.hidden=false;
  var n=firstName(),wa=phoneOk(S.info.whatsapp);
  var msg='Oi, '+S.info.consultor+'! Acabei de fazer a minha inscrição no Clube de Vantagens doTERRA. 💜';
  app.innerHTML=head('Inscrição concluída')+'<div class="bar"><i style="width:100%"></i></div><div class="card"><div class="hero"><div class="big">🎉</div><h1>Bem-vindo'+(n?', '+esc(n):'')+', ao Clube de Vantagens doTERRA!</h1>'+
    '<p class="sub">Recebemos a sua inscrição. <b>'+esc(S.info.consultor)+'</b> vai falar com você pelo WhatsApp para te ajudar com os próximos passos.</p></div>'+
    '<h2>Suas vantagens de ser do Clube</h2>'+benHTML()+
    (wa?'<div style="margin-top:22px"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/'+wa+'?text='+encodeURIComponent(msg)+'">Falar com '+esc(S.info.consultor)+' no WhatsApp</a></div>':'')+'</div>'+
    '<p class="fine">Obrigado por fazer parte! 💜</p>';
  footin.innerHTML='';foot.hidden=true;
}

/* ---- início ---- */
function init(){
  if(!C){app.innerHTML='<div class="card"><h1>Link incompleto</h1><p class="sub">Peça ao seu consultor para reenviar o link.</p></div>';return}
  load();
  fetch('api.php?a=clube_info&c='+encodeURIComponent(C)).then(function(r){return r.json()}).then(function(j){
    if(!j.ok)throw new Error(j.erro||'Link inválido');
    S.info=j;render();
  }).catch(function(e){app.innerHTML='<div class="card"><h1>Ops!</h1><p class="sub">'+esc(e.message||'Não foi possível abrir agora.')+' Peça ao seu consultor para reenviar o link.</p></div>'});
}
init();
})();
