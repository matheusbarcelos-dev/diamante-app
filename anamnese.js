/* Diamante App - página pública da anamnese (quiz de óleos). Uma pergunta por tela. */
(function(){
  "use strict";

  /* arquivo antigo no servidor (envio incompleto): avisa em vez de ficar girando */
  if(!window.ANA || !window.ANA.QUIZ){
    document.addEventListener("DOMContentLoaded", () => {
      const a = document.getElementById("viewInicio"), e = document.getElementById("viewErro");
      if(a) a.hidden = true;
      if(e){ e.hidden = false; e.querySelector("h1").textContent = "Atualização incompleta"; e.querySelector("p").textContent = "Os arquivos do site foram enviados pela metade. Avise quem enviou este link."; }
    });
    return;
  }
  const { CONFIG, TEMAS, JA_DILUIDOS, QUIZ, DEPOIMENTOS, Motor } = window.ANA;
  const SLUG = new URLSearchParams(location.search).get("c") || "";
  const CHAVE = "quizOleos_" + SLUG;
  /* troca {consultor} pelo nome de quem enviou o convite */
  const T = s => String(s == null ? "" : s).replace(/\{consultor\}/g, CONFIG.consultor);

  const $  = (s, e = document) => e.querySelector(s);
  const $$ = (s, e = document) => Array.from(e.querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  /* Caminho de imagem. Na versão em pasta devolve o próprio caminho;
     na versão de arquivo único devolve a imagem embutida. */
  const imgSrc = p => p;

  /* ---------- ESTADO ---------- */
  function lerLocal(){ try{ return JSON.parse(localStorage.getItem(CHAVE) || "{}"); }catch(e){ return {}; } }
  const guardado = lerLocal();

  const estado = {
    indice: 0,
    respostas: guardado.respostas || {},
    leadId: guardado.leadId || gerarId(),
    recomendacao: null,
    depoimentos: [],
    avisoMostrado: false,
    finalizado: false
  };

  /* id da sessão: só letras e números, 24 caracteres */
  function gerarId(){
    const a = new Uint8Array(12);
    if(window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for(let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }

  function salvarLocal(){
    try{ localStorage.setItem(CHAVE, JSON.stringify({
      leadId: estado.leadId, respostas: estado.respostas, indice: estado.indice
    })); }catch(e){ /* sem armazenamento local: seguimos */ }
  }

  const primeiroNome = () => (estado.respostas.nome || "").trim().split(/\s+/)[0] || "";

  /* ---------- LISTA DE TELAS (uma pergunta cada) ---------- */
  function telasVisiveis(){
    const lista = [];
    QUIZ.forEach((etapa, ei) => {
      etapa.perguntas.forEach((p, pi) => {
        // quem nunca usou não precisa detalhar a experiência
        if(p.id === "experiencia" && estado.respostas.ja_usou === "nao") return;
        lista.push({ etapa, ei, p, primeiraDaEtapa: pi === 0 });
      });
    });
    return lista;
  }

  /* ---------- TROCA DE TELA ---------- */
  function irPara(view){
    ["viewInicio","viewErro","viewLanding","viewQuiz","viewDepoimentos","viewCarregando","viewResultado"]
      .forEach(id => { $("#" + id).hidden = (id !== view); });
    window.scrollTo(0, 0);
  }

  /* ---------- RENDERIZAÇÃO DE UMA PERGUNTA ---------- */
  function corpoPergunta(p){
    const val = estado.respostas[p.id];

    if(p.tipo === "campo"){
      const v = val !== undefined ? val : (p.valorPadrao || "");
      return `<input class="campo" type="${p.inputType||"text"}" id="c_${p.id}"
                placeholder="${esc(T(p.placeholder||""))}" value="${esc(v)}"
                ${p.autocomplete ? `autocomplete="${p.autocomplete}"` : ""}
                ${p.mascara ? `data-mascara="${p.mascara}"` : ""}
                ${p.inputType === "date" ? `max="${new Date().toISOString().slice(0,10)}"` : ""}
                ${p.inputType === "tel" ? 'inputmode="numeric"' : ""}>`;
    }

    if(p.tipo === "texto"){
      return `<textarea class="area" id="c_${p.id}" placeholder="${esc(T(p.placeholder||""))}">${esc(val||"")}</textarea>`;
    }

    if(p.tipo === "unica"){
      const curtas = p.opcoes.every(o => o.t.length <= 18);
      return `<div class="opcoes ${curtas ? "opcoes-duplas" : ""}" role="group">` + p.opcoes.map(o =>
        `<button type="button" class="opcao" data-p="${p.id}" data-v="${o.v}" aria-pressed="${val===o.v}">
           <span class="marca">${CHECK}</span><span>${esc(T(o.t))}</span>
         </button>`).join("") + `</div>`;
    }

    if(p.tipo === "multipla"){
      const arr = Array.isArray(val) ? val : [];
      return `<div class="opcoes" role="group">` + p.opcoes.map(o =>
        `<button type="button" class="opcao" data-p="${p.id}" data-v="${o.v}"
           ${p.exclusiva ? `data-exclusiva="${p.exclusiva}"` : ""}
           aria-pressed="${arr.includes(o.v)}">
           <span class="marca quadrada">${CHECK}</span><span>${esc(T(o.t))}</span>
         </button>`).join("") + `</div>`;
    }

    if(p.tipo === "escala"){
      const atual = val !== undefined ? Number(val) : p.padrao;
      let nums = "";
      for(let i = p.min; i <= p.max; i++){
        nums += `<button type="button" class="escala-num" data-p="${p.id}" data-v="${i}" aria-pressed="${atual===i}">${i}</button>`;
      }
      const pontas = p.legenda ? p.legenda.split("→") : null;
      return `<div class="escala">${nums}</div>` + (pontas
        ? `<div class="escala-legenda"><span>${esc(pontas[0].trim())}</span><span>${esc((pontas[1]||"").trim())}</span></div>`
        : `<div class="escala-legenda"><span>${p.min}</span><span>${p.max}</span></div>`);
    }
    return "";
  }

  function renderTela(){
    const telas = telasVisiveis();
    if(estado.indice >= telas.length) return concluirQuiz();
    if(estado.indice < 0) estado.indice = 0;

    const { etapa, p, primeiraDaEtapa } = telas[estado.indice];
    const nome = primeiroNome();

    /* Valores padrão precisam existir na resposta, não só na tela.
       Sem isto, um campo pré-preenchido (País = "Brasil") aparece
       preenchido mas reprova na validação até a pessoa digitar. */
    if(estado.respostas[p.id] === undefined){
      if(p.tipo === "escala") estado.respostas[p.id] = p.padrao;
      else if(p.valorPadrao) estado.respostas[p.id] = p.valorPadrao;
    }

    /* barra de topo */
    $("#quizEtapa").innerHTML = `${etapa.icone} <span>${esc(etapa.rotulo)}</span>`;
    $("#quizContador").textContent = `${estado.indice + 1} de ${telas.length}`;
    $("#barraProgresso").style.width = `${(estado.indice / telas.length) * 100}%`;
    $("#btnVoltar").disabled = estado.indice === 0;

    /* aviso de segurança: uma vez só, logo depois da pergunta de atenção */
    const flags = Motor.coletarFlags(estado.respostas);
    let aviso = "";
    if(flags.size > 0 && !estado.avisoMostrado && p.id !== "atencao"){
      estado.avisoMostrado = true;
      aviso = `<div class="aviso-seguranca">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
        <div>Anotado. Seu resultado já vai sair com os óleos filtrados para esse cuidado.</div>
      </div>`;
    }

    const intro = primeiraDaEtapa
      ? `<p class="tela-apoio">${esc(etapa.titulo(nome))}</p>` : "";

    $("#quizPalco").innerHTML = `
      <div class="tela revelar" data-pergunta="${p.id}">
        ${aviso}
        ${intro}
        <h2 class="tela-titulo">${esc(T(p.label))}</h2>
        ${corpoPergunta(p)}
        <div class="erro">Precisamos desta resposta para montar seu resultado.</div>
      </div>`;

    /* barra de ação: escolha única e escala avançam sozinhas */
    const automatico = p.tipo === "unica" || p.tipo === "escala";
    $("#btnAvancar").hidden = automatico;
    $("#dicaPular").textContent = automatico ? "Toque para escolher"
      : (p.id === "aceite" ? "" : p.tipo === "multipla" ? "Pode marcar mais de uma — ou nenhuma"
      : (p.obrigatorio ? "" : "Se preferir, deixe em branco"));
    $("#btnAvancar").textContent = (estado.indice === telas.length - 1) ? "Ver meu resultado ✨" : "Continuar";

    ligarEventos(p, automatico);
    salvarLocal();
    window.scrollTo(0, 0);
  }

  /* ---------- EVENTOS ---------- */
  function ligarEventos(p, automatico){
    const palco = $("#quizPalco");

    /* escolha única e escala */
    $$(".opcao, .escala-num", palco).forEach(b => {
      if(p.tipo === "multipla") return;
      b.addEventListener("click", () => {
        const grupo = b.closest(".tela");
        $$(`[data-p="${p.id}"]`, grupo).forEach(x => x.setAttribute("aria-pressed","false"));
        b.setAttribute("aria-pressed","true");
        estado.respostas[p.id] = b.classList.contains("escala-num") ? Number(b.dataset.v) : b.dataset.v;
        grupo.classList.remove("invalida");
        salvarLocal();
        enviarProgresso();
        if(automatico) setTimeout(avancar, 260);
      });
    });

    /* múltipla escolha */
    if(p.tipo === "multipla"){
      $$(".opcao", palco).forEach(b => {
        b.addEventListener("click", () => {
          const v = b.dataset.v;
          let arr = Array.isArray(estado.respostas[p.id]) ? estado.respostas[p.id].slice() : [];
          const exclusiva = b.dataset.exclusiva;

          if(arr.includes(v)) arr = arr.filter(x => x !== v); else arr.push(v);

          /* "Nenhuma destas" limpa o resto — e vice-versa */
          if(exclusiva){
            if(v === exclusiva && arr.includes(v)) arr = [exclusiva];
            else if(v !== exclusiva) arr = arr.filter(x => x !== exclusiva);
          }

          estado.respostas[p.id] = arr;
          $$(`[data-p="${p.id}"]`, palco).forEach(x =>
            x.setAttribute("aria-pressed", arr.includes(x.dataset.v)));
          salvarLocal();
          enviarProgresso();
        });
      });
    }

    /* campos de texto */
    $$(".campo, .area", palco).forEach(c => {
      c.addEventListener("input", () => {
        let v = c.value;
        if(c.dataset.mascara === "telefone"){ v = mascaraTelefone(v); c.value = v; }
        estado.respostas[p.id] = v;
        c.closest(".tela").classList.remove("invalida");
        salvarLocal();
      });
      c.addEventListener("blur", enviarProgresso);
      /* Enter avança em campos de uma linha */
      if(c.classList.contains("campo")){
        c.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); avancar(); } });
      }
    });
  }

  function mascaraTelefone(v){
    const d = v.replace(/\D/g,"").slice(0,11);
    if(d.length <= 2)  return d.length ? `(${d}` : "";
    if(d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if(d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  }

  /* ---------- NAVEGAÇÃO ---------- */
  function avancar(){
    const telas = telasVisiveis();
    const tela = telas[estado.indice];
    if(!tela) return concluirQuiz();
    const p = tela.p;
    const el = $(".tela");

    if(p.obrigatorio){
      const v = estado.respostas[p.id];
      const vazio = v === undefined || v === null ||
                    (typeof v === "string" && !v.trim()) ||
                    (Array.isArray(v) && !v.length);
      if(vazio){
        el.classList.add("invalida");
        el.querySelector(".erro").textContent = p.id === "aceite"
          ? "Marque a caixinha para continuar."
          : "Precisamos desta resposta para montar seu resultado.";
        return;
      }
    }

    if(p.id === "whatsapp"){
      const d = String(estado.respostas.whatsapp||"").replace(/\D/g,"");
      if(d.length < 10){
        el.classList.add("invalida");
        el.querySelector(".erro").textContent = "Digite o número com DDD — ex.: (62) 98134-7314.";
        return;
      }
    }

    enviarProgresso(true);

    if(estado.indice >= telas.length - 1) return concluirQuiz();
    estado.indice++;
    renderTela();
  }

  function voltar(){
    if(estado.indice === 0) return;
    estado.indice--;
    renderTela();
  }

  /* ---------- CONCLUSÃO ---------- */
  function concluirQuiz(){
    estado.recomendacao = Motor.recomendar(estado.respostas);
    estado.depoimentos = Motor.escolherDepoimentos(estado.recomendacao, 3);
    estado.finalizado = true;
    enviarProgresso(true);

    if(CONFIG.mostrarDepoimentos && estado.depoimentos.length){
      renderDepoimentos();
      irPara("viewDepoimentos");
    } else {
      mostrarResultado();
    }
  }

  function mostrarResultado(){
    irPara("viewCarregando");
    const passos = [
      "Cruzando suas respostas…",
      "Filtrando os óleos por segurança…",
      "Montando sua rotina da manhã…"
    ];
    let i = 0;
    $("#cargaDetalhe").textContent = passos[0];
    const t = setInterval(() => {
      i++;
      if(i < passos.length) $("#cargaDetalhe").textContent = passos[i];
    }, 550);

    setTimeout(() => {
      clearInterval(t);
      renderResultado();
      irPara("viewResultado");
      $("#btnFlutuante").classList.add("visivel");
    }, 1800);
  }

  /* ---------- SALVAMENTO NO SERVIDOR ----------
     Cada resposta é guardada na hora (com pequena espera para juntar
     respostas em sequência), mesmo que a pessoa pare no meio. */
  let timerEnvio = null, ultimoEnvio = "", enviando = false;

  function montarEnvio(){
    const telas = telasVisiveis();
    return {
      c: SLUG, sid: estado.leadId,
      etapa: estado.finalizado ? telas.length : Math.min(estado.indice, telas.length),
      total: telas.length,
      completo: estado.finalizado,
      dados: estado.respostas
    };
  }

  function enviarProgresso(imediato){
    clearTimeout(timerEnvio);
    const disparar = () => {
      /* só começa a guardar depois do aceite e do nome */
      if(!estado.respostas.nome || !(estado.respostas.aceite || []).includes("sim")) return;
      const corpo = JSON.stringify(montarEnvio());
      if(corpo === ultimoEnvio) return;               // nada mudou
      fetch("api.php?a=ana_salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "diamante" },
        body: corpo,
        keepalive: true
      }).then(r => r.json()).then(j => { if(j && j.ok) ultimoEnvio = corpo; })
        .catch(() => { /* tenta de novo no próximo envio */ });
    };
    if(imediato) disparar();
    else timerEnvio = setTimeout(disparar, (CONFIG.intervaloSalvamento || 3) * 1000);
  }

  /* última tentativa quando a pessoa fecha a aba no meio */
  window.addEventListener("pagehide", () => {
    if(estado.indice > 0 && !estado.finalizado) enviarProgresso(true);
  });

  /* ---------- DEPOIMENTOS ---------- */
  const RESSALVA = "Relato pessoal de cliente. Resultados variam de pessoa para pessoa. Não substitui orientação médica.";

  function cardDepoimento(d){
    /* print de conversa — é o formato do acervo */
    if(d.imagem){
      return `<figure class="depoimento depoimento-print">
        ${d.produto ? `<span class="depo-produto">${esc(d.produto)}</span>` : ""}
        <img src="${imgSrc("assets/img/depoimentos/" + d.imagem)}" alt="${esc(d.alt || "Depoimento de cliente")}" loading="lazy">
        <figcaption>${esc(RESSALVA)}</figcaption>
      </figure>`;
    }
    /* depoimento em texto */
    const inicial = (d.nome || "?").replace(/[^A-Za-zÀ-ÿ]/g,"").charAt(0).toUpperCase() || "•";
    return `<article class="depoimento">
      ${d.exemplo ? '<span class="tarja-exemplo">Exemplo</span>' : ""}
      <div class="aspas">"</div>
      <p>${esc(d.texto)}</p>
      <div class="assina">
        <span class="inicial">${esc(inicial)}</span>
        <span><b>${esc(d.nome)}</b><span>${esc(d.cidade || "")}</span></span>
      </div>
    </article>`;
  }

  function renderDepoimentos(){
    const nome = primeiroNome();
    const rec = estado.recomendacao;
    const tema = rec.temasTop[0] && TEMAS[rec.temasTop[0]]
      ? TEMAS[rec.temasTop[0]].rotulo.toLowerCase() : "bem-estar";

    $("#depoTopo").innerHTML = `
      <span class="etiqueta">Antes do seu resultado</span>
      <h2>${nome ? esc(nome) + ", v" : "V"}ocê não é a primeira pessoa aqui</h2>
      <p>Separei três relatos de quem chegou procurando a mesma coisa que você:
         <strong>${esc(tema)}</strong>.</p>`;

    $("#depoLista").innerHTML = estado.depoimentos.map(cardDepoimento).join("");
  }

  /* ---------- CARD DE ÓLEO ---------- */
  function cardOleo(o, etiqueta){
    const svg = Motor.frascoSVG(o.cor, o.slug.replace(/[^a-z]/g,""));
    const tema = TEMAS[o.temaPrincipal];
    const diluido = (window.JA_DILUIDOS||[]).includes(o.slug);
    const tag = etiqueta || (diluido ? "Já diluído" : null);
    return `<article class="oleo">
      <div class="oleo-figura">
        ${tag ? `<span class="oleo-tag${diluido && !etiqueta ? " diluido" : ""}">${esc(tag)}</span>` : ""}
        <img src="${imgSrc("assets/img/oleos/" + o.slug + ".jpg")}" alt="Óleo essencial ${esc(o.nome)} doTERRA"
             loading="lazy" data-rmerr>
        ${svg}
      </div>
      <div class="oleo-corpo">
        <h4 class="oleo-nome">${esc(o.nome)}</h4>
        <div class="oleo-botanica">${esc(o.botanica)}</div>
        <p class="oleo-aroma">${esc(o.aroma)}</p>
        ${tema ? `<div class="oleo-porque">${tema.icone} ${esc(tema.rotulo)}</div>` : ""}
      </div>
    </article>`;
  }

  /* ---------- RESULTADO ---------- */
  function renderResultado(){
    const r = estado.respostas, rec = estado.recomendacao;
    const nome = primeiroNome();
    const texto = Motor.mensagemWhatsApp(r, rec);
    const link = Motor.linkWhatsApp(texto);

    $$("[data-cta]").forEach(a => a.href = link);

    $("#resTopo").innerHTML = `
      <span class="selo"><span class="ponto"></span> Resultado personalizado</span>
      <h2>${nome ? esc(nome) + ", seu" : "Seu"} protocolo está pronto</h2>
      <p>Com base em tudo que você marcou, estes são os óleos que fazem sentido para a
         <strong>sua</strong> rotina — e só eles. Nada de comprar o que você não vai usar.</p>
      <div class="temas">
        ${rec.temasTop.map(t => TEMAS[t]
          ? `<span class="tema-chip">${TEMAS[t].icone} ${esc(TEMAS[t].rotulo)}</span>` : "").join("")}
      </div>`;

    /* kit essencial */
    $("#resKit").innerHTML = `
      <div class="cabecalho">
        <span class="etiqueta">Comece por aqui</span>
        <h2>Seu Kit Essencial</h2>
        <p>Os ${rec.kit.length} indispensáveis para começar imediatamente. Cobrem o que mais apareceu nas suas respostas e rendem meses.</p>
      </div>
      <div class="oleos">${rec.kit.map(o => cardOleo(o, "Kit base")).join("")}</div>`;

    /* óleo de coco */
    $("#resApoio").innerHTML = rec.apoio ? `
      <div class="apoio">
        <div class="apoio-figura">
          <img src="${imgSrc("assets/img/oleos/" + rec.apoio.slug + ".jpg")}" alt="${esc(rec.apoio.nome)}" loading="lazy" data-rmerr>
        </div>
        <div class="apoio-texto">
          <h4>Leve junto: ${esc(rec.apoio.nome)}</h4>
          <p>${esc(rec.apoio.porque)} ${rec.temCrianca ? "Com criança em casa ele é obrigatório — e os roll-on de 10 ml já vêm prontos para usar." : ""}</p>
        </div>
      </div>` : "";

    /* protocolo completo */
    const extras = rec.protocolo.filter(p => !rec.kit.find(k => k.slug === p.slug));
    $("#resProtocolo").innerHTML = `
      <div class="cabecalho">
        <span class="etiqueta">Versão completa</span>
        <h2>Seu protocolo completo</h2>
        <p>O kit acima mais ${extras.length} óleos que aprofundam o cuidado nos pontos que você marcou.</p>
      </div>
      <div class="oleos">${rec.protocolo.map(o =>
        cardOleo(o, rec.kit.find(k => k.slug === o.slug) ? "Kit base" : null)).join("")}</div>
      ${rec.excluidos.length ? `
        <div class="aviso-seguranca" style="max-width:680px;margin:1.5rem auto 0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 8v4"/><path d="M12 16h.01"/><circle cx="12" cy="12" r="10"/></svg>
          <div><strong>Filtramos para você.</strong> Por causa da atenção especial que você marcou,
          ${rec.excluidos.length} ${rec.excluidos.length === 1 ? "óleo foi retirado" : "óleos foram retirados"} da sua lista.
          ${esc(CONFIG.consultor)} explica quais e por quê na conversa.</div>
        </div>` : ""}`;

    /* rotina */
    const passoHTML = p => `<div class="passo">
        <div class="passo-hora">${esc(p.hora)}</div>
        <div class="passo-conteudo"><h4>${esc(p.titulo)}</h4><p>${p.texto}</p></div>
      </div>`;

    $("#painelManha").innerHTML = Motor.rotinaManha(rec, r).map(passoHTML).join("");

    [["Tarde","da tarde"],["Noite","da noite"]].forEach(([id, rotulo]) => {
      $("#painel" + id).innerHTML = `
        <div class="bloqueado">
          <div class="bloqueado-fundo">${Motor.previaBloqueada(id.toLowerCase()).map(passoHTML).join("")}</div>
          <div class="bloqueado-frente">
            <div class="bloqueado-icone">🔒</div>
            <h4>Rotina ${rotulo} bloqueada</h4>
            <p>Para desbloquear o acompanhamento completo da sua rotina, adquira qualquer
               óleo essencial com ${esc(CONFIG.consultor)}. Você recebe o protocolo inteiro — manhã, tarde e noite —
               e o acompanhamento de perto para usar cada gota na ordem certa.</p>
            <a class="btn btn-cta" data-cta href="${link}" target="_blank" rel="noopener">
              Desbloquear minha rotina completa
            </a>
          </div>
        </div>`;
    });

    /* CTA */
    $("#resCta").innerHTML = `
      <div class="cta-bloco">
        <h3>${nome ? esc(nome) + ", vamos" : "Vamos"} montar isso na prática?</h3>
        <p>Clique abaixo e sua mensagem já vai escrita, com seu resultado dentro. É só enviar.</p>
        <ul class="cta-beneficios">
          <li><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong>Preço de custo</strong>, direto de fábrica — o mesmo que eu pago.</span></li>
          <li><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong>Promoções exclusivas</strong> que não aparecem no site.</span></li>
          <li><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong>Acompanhamento de perto</strong> — só o que você realmente precisa.</span></li>
        </ul>
        <a class="btn btn-cta btn-bloco" data-cta href="${link}" target="_blank" rel="noopener">
          Quero adquirir a preço de custo
        </a>
        <p class="cta-rodape">Resposta pelo WhatsApp • Sem compromisso de compra</p>
      </div>`;

    /* abas */
    $$(".aba").forEach(aba => {
      aba.addEventListener("click", () => {
        $$(".aba").forEach(a => a.setAttribute("aria-selected","false"));
        $$(".painel").forEach(p => p.hidden = true);
        aba.setAttribute("aria-selected","true");
        $("#" + aba.dataset.painel).hidden = false;
      });
    });
  }

  /* ---------- INÍCIO ---------- */
  const TEMA_ANTIGO = { estresse:"calma", dor:"corpo", digestao:"digestivo", respiracao:"respiratorio",
                        desintoxicar:"metabolismo", emocional:"humor", recuperacao:"corpo" };

  function preencherConsultor(){
    $$(".js-consultor").forEach(e => e.textContent = CONFIG.consultor);
    $$(".js-inicial").forEach(e => e.textContent = (CONFIG.consultor || "D").charAt(0).toUpperCase());
    const rank = CONFIG.rank && CONFIG.rank !== "Consultor" ? CONFIG.rank : "";
    $$(".js-rank").forEach(e => e.textContent = rank ? "💎 " + rank : "💎 Consultor(a) doTERRA");
    document.title = "Transforme sua rotina com soluções naturais";
  }

  function iniciar(){
    $$(".ano").forEach(e => e.textContent = new Date().getFullYear());

    /* imagem que não carrega some, sem script inline (CSP) */
    document.addEventListener("error", e => {
      const t = e.target;
      if(t && t.tagName === "IMG" && t.hasAttribute("data-rmerr")) t.remove();
    }, true);

    $("#btnAvancar").addEventListener("click", avancar);
    $("#btnVoltar").addEventListener("click", voltar);
    $("#btnVerResultado").addEventListener("click", mostrarResultado);
    $$("[data-comecar]").forEach(b => b.addEventListener("click", () => {
      /* retoma de onde parou (o FAQ promete isso), sem passar do fim */
      const total = telasVisiveis().length;
      estado.indice = Math.max(0, Math.min(guardado.indice || 0, total - 1));
      irPara("viewQuiz");
      renderTela();
    }));

    fetch("api.php?a=ana_info&c=" + encodeURIComponent(SLUG))
      .then(r => r.json())
      .then(j => {
        if(!j || !j.ok) throw new Error("link");
        CONFIG.consultor = j.consultor || CONFIG.consultor;
        CONFIG.whatsapp  = String(j.whatsapp || "").replace(/\D/g, "");
        CONFIG.rank      = j.rank || "";
        /* depoimentos em texto escritos pelo próprio consultor */
        (j.depoimentos || []).forEach(d => DEPOIMENTOS.push({
          texto: d.texto, nome: d.autor || "Cliente", cidade: "",
          temas: [TEMA_ANTIGO[d.tema] || d.tema]
        }));
        preencherConsultor();

        /* depoimentos da landing: três de temas diferentes, para dar variedade */
        const vistos = new Set(), paraLanding = [];
        DEPOIMENTOS.forEach(d => {
          const t = (d.temas||[])[0] || "";
          if(paraLanding.length < 3 && !vistos.has(t)){ vistos.add(t); paraLanding.push(d); }
        });
        DEPOIMENTOS.forEach(d => { if(paraLanding.length < 3 && !paraLanding.includes(d)) paraLanding.push(d); });
        $("#depoimentosLanding").innerHTML = paraLanding.map(cardDepoimento).join("");

        irPara("viewLanding");
      })
      .catch(() => { irPara("viewErro"); });
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
