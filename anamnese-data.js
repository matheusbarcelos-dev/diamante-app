/* Diamante App - base de dados e motor do quiz de óleos (anamnese).
   Usado pela página pública (anamnese.html) e pelo CRM dentro do app (via window.ANA).
   Linguagem: descrições sensoriais e de rotina, nunca efeito sobre doença. */
(function () {
"use strict";

/* ============================================================
   CONFIGURAÇÃO — edite apenas este arquivo no dia a dia.
   ============================================================ */

const CONFIG = {
  /* preenchidos pelo servidor (api.php?a=ana_info) a partir da conta do consultor */
  whatsapp: "",
  consultor: "seu consultor",
  rank: "",

  /* Segundos de espera antes de mandar um salvamento parcial.
     Respostas rápidas em sequência viram um envio só. */
  intervaloSalvamento: 3,

  /* Frase de posicionamento — repetida ao longo da página */
  promessa: "Adquira a preço de custo, participe de promoções exclusivas e receba acompanhamento de perto usando apenas os óleos que você realmente precisa.",

  /* Quantidade de óleos em cada bloco do resultado */
  tamanhoKitBasico: 4,
  tamanhoProtocolo: 9,

  /* Mostrar a tela de depoimentos antes do resultado */
  mostrarDepoimentos: false
};

/* ============================================================
   BASE DE DADOS — óleos essenciais e perguntas do quiz.

   Para trocar textos, editar aqui. Nada de lógica neste arquivo.

   LINGUAGEM: descrições sensoriais e de rotina apenas.
   Não descrevemos efeito sobre doença ou sintoma — ver README,
   seção "Compliance".
   ============================================================ */

/* ---------- TEMAS DE ROTINA ----------
   Chaves internas usadas para casar respostas com óleos.
   O rótulo é o que aparece na tela para o lead.            */
const TEMAS = {
  calma:      { rotulo: "Pausa e calma durante o dia",        icone: "🌿" },
  sono:       { rotulo: "Ritual da noite e descanso",         icone: "🌙" },
  energia:    { rotulo: "Disposição pela manhã",              icone: "☀️" },
  foco:       { rotulo: "Foco e clareza",                     icone: "🎯" },
  corpo:      { rotulo: "Rotina de recuperação do corpo",     icone: "💪" },
  digestivo:  { rotulo: "Conforto depois das refeições",      icone: "🍋" },
  imunidade:  { rotulo: "Cuidado diário e ambiente da casa",  icone: "🛡️" },
  respiratorio:{ rotulo: "Sensação de respiração livre",      icone: "🌬️" },
  pele:       { rotulo: "Cuidado com a pele",                 icone: "✨" },
  cabelo:     { rotulo: "Cuidado com o cabelo",               icone: "💇" },
  hormonal:   { rotulo: "Bem-estar feminino",                 icone: "🌸" },
  metabolismo:{ rotulo: "Rotina de movimento e alimentação",  icone: "🏃" },
  humor:      { rotulo: "Aroma que levanta o astral",         icone: "🧡" },
  familia:    { rotulo: "Cuidado com a família",              icone: "👨‍👩‍👧" }
};

/* ---------- ÓLEOS ----------
   cor        = cor do rótulo, usada no card desenhado
   temas      = onde o óleo entra
   momentos   = manha | tarde | noite
   evitar     = marcadores de atenção especial (ver QUIZ etapa 2)
   base       = candidato ao Kit Essencial (uso amplo, fácil de começar)
*/
const OLEOS = [
  { slug:"lavanda", nome:"Lavanda", en:"Lavender", botanica:"Lavandula angustifolia", cor:"#7C6BB0", tipo:"oleo", base:true,
    aroma:"Floral, suave e limpo. O clássico do fim do dia e do cuidado com a pele.",
    temas:["calma","sono","pele","familia"], momentos:["tarde","noite"], evitar:[] },

  { slug:"hortela-pimenta", nome:"Hortelã-Pimenta", en:"Peppermint", botanica:"Mentha piperita", cor:"#2E8B7A", tipo:"oleo", base:true,
    aroma:"Mentolado e gelado. Refresca o ambiente e desperta na hora.",
    temas:["energia","foco","corpo","respiratorio","digestivo"], momentos:["manha","tarde"], evitar:["crianca0","lactante"] },

  { slug:"limao", nome:"Limão", en:"Lemon", botanica:"Citrus limon", cor:"#E8C33D", tipo:"oleo", base:true,
    aroma:"Cítrico vibrante. Deixa a casa com cheiro de limpo e a água mais saborosa.",
    temas:["energia","imunidade","humor","metabolismo"], momentos:["manha"], evitar:[] },

  { slug:"melaleuca", nome:"Melaleuca", en:"Tea Tree", botanica:"Melaleuca alternifolia", cor:"#4F8F5B", tipo:"oleo", base:true,
    aroma:"Herbal e marcante. Presença constante no cuidado com pele e couro cabeludo.",
    temas:["pele","imunidade","cabelo"], momentos:["manha","noite"], evitar:[] },

  { slug:"oregano", nome:"Orégano", en:"Oregano", botanica:"Origanum vulgare", cor:"#8C5A3C", tipo:"oleo", base:false,
    aroma:"Quente e picante. Muito usado na cozinha e na rotina de cuidado da casa.",
    temas:["imunidade"], momentos:["manha"], evitar:["gestante","crianca0","crianca3","hipertensao"] },

  { slug:"incenso", nome:"Incenso", en:"Frankincense", botanica:"Boswellia carterii", cor:"#B08D57", tipo:"oleo", base:true,
    aroma:"Amadeirado e resinoso. Aroma de centramento — o preferido para meditar.",
    temas:["calma","pele","foco"], momentos:["manha","noite"], evitar:[] },

  { slug:"copaiba", nome:"Copaíba", en:"Copaiba", botanica:"Copaifera reticulata", cor:"#9C7B4A", tipo:"oleo", base:true,
    aroma:"Amadeirado e macio, quase sem cheiro. Brasileiríssimo, entra em qualquer mistura.",
    temas:["corpo","calma","pele"], momentos:["tarde","noite"], evitar:[] },

  { slug:"ylang-ylang", nome:"Ylang Ylang", en:"Ylang Ylang", botanica:"Cananga odorata", cor:"#E0B84C", tipo:"oleo", base:false,
    aroma:"Floral intenso e adocicado. Aroma de ritual e de autocuidado.",
    temas:["humor","hormonal","cabelo","calma"], momentos:["tarde","noite"], evitar:["hipertensao"] },

  { slug:"geranio", nome:"Gerânio", en:"Geranium", botanica:"Pelargonium graveolens", cor:"#C96F86", tipo:"oleo", base:false,
    aroma:"Floral e aveludado. Queridinho das receitas de pele e cabelo.",
    temas:["pele","hormonal","cabelo"], momentos:["noite"], evitar:["gestante"] },

  { slug:"bergamota", nome:"Bergamota", en:"Bergamot", botanica:"Citrus bergamia", cor:"#9BBF3F", tipo:"oleo", base:false,
    aroma:"Cítrico floral, o mais delicado dos cítricos. Aroma de respiro no meio do dia.",
    temas:["humor","calma","pele"], momentos:["tarde"], evitar:[] },

  { slug:"laranja-silvestre", nome:"Laranja Silvestre", en:"Wild Orange", botanica:"Citrus sinensis", cor:"#E88B2E", tipo:"oleo", base:true,
    aroma:"Doce, alegre e universal. Ninguém resiste — a casa inteira gosta.",
    temas:["humor","energia","familia","metabolismo"], momentos:["manha","tarde"], evitar:[] },

  { slug:"cedro", nome:"Cedro", en:"Cedarwood", botanica:"Juniperus virginiana", cor:"#8A6F52", tipo:"oleo", base:false,
    aroma:"Amadeirado seco e aconchegante. Cheiro de quarto pronto para dormir.",
    temas:["sono","cabelo","calma"], momentos:["noite"], evitar:[] },

  { slug:"vetiver", nome:"Vetiver", en:"Vetiver", botanica:"Vetiveria zizanioides", cor:"#6B5B45", tipo:"oleo", base:false,
    aroma:"Terroso, denso e profundo. Uma gota basta. Aroma de aterramento.",
    temas:["sono","foco","calma"], momentos:["noite"], evitar:[] },

  { slug:"camomila-romana", nome:"Camomila Romana", en:"Roman Chamomile", botanica:"Anthemis nobilis", cor:"#D9C36B", tipo:"oleo", base:false,
    aroma:"Floral herbal, suave e reconfortante. Delicado o bastante para a família toda.",
    temas:["sono","calma","pele","familia"], momentos:["noite"], evitar:[] },

  { slug:"salvia-esclareia", nome:"Sálvia Esclareia", en:"Clary Sage", botanica:"Salvia sclarea", cor:"#A3B18A", tipo:"oleo", base:false,
    aroma:"Herbal e envolvente. Tradicional no autocuidado feminino.",
    temas:["hormonal","sono","calma"], momentos:["noite"], evitar:["gestante","epilepsia","lactante"] },

  { slug:"erva-doce", nome:"Erva-doce", en:"Fennel", botanica:"Foeniculum vulgare", cor:"#C7D66B", tipo:"oleo", base:false,
    aroma:"Adocicado, lembra anis. Clássico do chá — aqui em versão concentrada.",
    temas:["digestivo","hormonal"], momentos:["tarde"], evitar:["gestante","epilepsia","crianca0"] },

  { slug:"gengibre", nome:"Gengibre", en:"Ginger", botanica:"Zingiber officinale", cor:"#C98A3C", tipo:"oleo", base:false,
    aroma:"Quente, picante e terroso. Aroma de cozinha e de conforto.",
    temas:["digestivo","corpo"], momentos:["tarde"], evitar:[] },

  { slug:"cardamomo", nome:"Cardamomo", en:"Cardamom", botanica:"Elettaria cardamomum", cor:"#8FA35E", tipo:"oleo", base:false,
    aroma:"Especiado e cremoso. Suaviza qualquer mistura.",
    temas:["digestivo","respiratorio"], momentos:["tarde"], evitar:[] },

  { slug:"eucalipto", nome:"Eucalipto", en:"Eucalyptus", botanica:"Eucalyptus radiata", cor:"#5FA8A0", tipo:"oleo", base:false,
    aroma:"Fresco e penetrante. Cheiro de banho quente e ar livre.",
    temas:["respiratorio","corpo"], momentos:["manha"], evitar:["epilepsia","crianca0","crianca3"] },

  { slug:"alecrim", nome:"Alecrim", en:"Rosemary", botanica:"Rosmarinus officinalis", cor:"#6E8B6B", tipo:"oleo", base:false,
    aroma:"Herbal forte e estimulante. Da horta direto para a rotina de estudo.",
    temas:["foco","cabelo","energia"], momentos:["manha"], evitar:["gestante","epilepsia","hipertensao","crianca0","crianca3"] },

  { slug:"manjericao", nome:"Manjericão", en:"Basil", botanica:"Ocimum basilicum", cor:"#5C8A4A", tipo:"oleo", base:false,
    aroma:"Herbal fresco e vivo. Aroma de pausa para recomeçar a tarefa.",
    temas:["foco","calma"], momentos:["manha","tarde"], evitar:["gestante","epilepsia"] },

  { slug:"cipreste", nome:"Cipreste", en:"Cypress", botanica:"Cupressus sempervirens", cor:"#6F8F7C", tipo:"oleo", base:false,
    aroma:"Verde e amadeirado. Sensação de pernas leves depois do dia.",
    temas:["corpo","cabelo"], momentos:["tarde","noite"], evitar:["gestante"] },

  { slug:"zimbro", nome:"Zimbro", en:"Juniper Berry", botanica:"Juniperus communis", cor:"#5D6E8C", tipo:"oleo", base:false,
    aroma:"Amadeirado e levemente frutado. Aroma de recomeço e de limpeza.",
    temas:["pele","calma","metabolismo"], momentos:["noite"], evitar:["gestante"] },

  { slug:"toranja", nome:"Toranja", en:"Grapefruit", botanica:"Citrus paradisi", cor:"#E56B6F", tipo:"oleo", base:false,
    aroma:"Cítrico amargo e refrescante. Companhia da garrafinha de água.",
    temas:["metabolismo","humor","pele"], momentos:["manha","tarde"], evitar:[] },

  /* ---- BLENDS ---- */
  { slug:"deep-blue", nome:"Deep Blue", en:"Deep Blue", botanica:"Mistura Reconfortante", cor:"#2F5D8C", tipo:"blend", base:false,
    aroma:"Mentolado e gelado. O companheiro do pós-treino e do fim de expediente.",
    temas:["corpo"], momentos:["tarde","noite"], evitar:["crianca0"] },

  { slug:"zengest", nome:"ZenGest", en:"DigestZen", botanica:"Mistura Digestiva", cor:"#7FA85C", tipo:"blend", base:true,
    aroma:"Especiado com erva-doce e gengibre. O aroma de depois do almoço.",
    temas:["digestivo"], momentos:["tarde"], evitar:["gestante"] },

  { slug:"on-guard", nome:"On Guard", en:"On Guard", botanica:"Mistura Protetora", cor:"#C2703A", tipo:"blend", base:true,
    aroma:"Canela, cravo e laranja. Cheiro de casa cuidada — e de inverno.",
    temas:["imunidade","familia"], momentos:["manha"], evitar:["gestante","crianca0"] },

  { slug:"air", nome:"Air", en:"Breathe", botanica:"Mistura Respiratória", cor:"#5AA9C4", tipo:"blend", base:true,
    aroma:"Eucalipto e hortelã. Sensação de ar livre dentro de casa.",
    temas:["respiratorio","sono"], momentos:["manha","noite"], evitar:[] },

  { slug:"balance", nome:"Balance", en:"Balance", botanica:"Mistura de Ancoragem", cor:"#4A7C6F", tipo:"blend", base:true,
    aroma:"Amadeirado e sereno. Uma gota nos pulsos antes de começar o dia.",
    temas:["calma","foco"], momentos:["manha","tarde"], evitar:[] },

  { slug:"serenity", nome:"Serenity", en:"Serenity", botanica:"Mistura Reconfortante", cor:"#6A76B5", tipo:"blend", base:true,
    aroma:"Lavanda e cedro. Feito para o último passo da noite.",
    temas:["sono","calma"], momentos:["noite"], evitar:[] },

  { slug:"adaptiv", nome:"Adaptiv", en:"Adaptiv", botanica:"Mistura de Equilíbrio", cor:"#8E7CB8", tipo:"blend", base:false,
    aroma:"Cítrico floral e macio. Aroma de dia cheio que continua leve.",
    temas:["calma","foco","humor"], momentos:["manha","tarde"], evitar:[] },

  { slug:"motivate", nome:"Motivate", en:"Motivate", botanica:"Mistura Encorajadora", cor:"#7FB03F", tipo:"blend", base:false,
    aroma:"Cítrico com hortelã. O aroma de antes de sentar para trabalhar.",
    temas:["foco","humor","energia"], momentos:["manha"], evitar:[] },

  { slug:"elevation", nome:"Elevation", en:"Elevation", botanica:"Mistura Vigorizante", cor:"#E0A32E", tipo:"blend", base:false,
    aroma:"Floral cítrico e solar. Difunda e a casa muda de humor.",
    temas:["humor","energia"], momentos:["manha"], evitar:[] },

  { slug:"citrus-bliss", nome:"Citrus Bliss", en:"Citrus Bliss", botanica:"Mistura Revigorante", cor:"#F0A03C", tipo:"blend", base:false,
    aroma:"Todos os cítricos com baunilha. Aroma de casa alegre.",
    temas:["humor","familia","energia"], momentos:["manha","tarde"], evitar:[] },

  { slug:"pastense", nome:"PastTense", en:"PastTense", botanica:"Mistura Reconfortante", cor:"#3E7F8C", tipo:"blend", base:false,
    aroma:"Fresco e mentolado em roll-on. Vai na bolsa, usa na nuca.",
    temas:["corpo","calma"], momentos:["tarde"], evitar:["gestante"] },

  { slug:"clarycalm", nome:"ClaryCalm", en:"ClaryCalm", botanica:"Mistura Feminina", cor:"#C77FA3", tipo:"blend", base:false,
    aroma:"Floral herbal em roll-on. Pensado para o autocuidado feminino.",
    temas:["hormonal","calma"], momentos:["tarde","noite"], evitar:["gestante"] },

  { slug:"smart-sassy", nome:"Smart & Sassy", en:"Smart & Sassy", botanica:"Mistura Metabólica", cor:"#D98C3F", tipo:"blend", base:false,
    aroma:"Cítrico com canela e hortelã. Vai na garrafinha do dia.",
    temas:["metabolismo","energia"], momentos:["manha","tarde"], evitar:["gestante","lactante","crianca0","crianca3"] },

  { slug:"zendocrine", nome:"Zendocrine", en:"Zendocrine", botanica:"Mistura Depurativa", cor:"#7A9C4E", tipo:"blend", base:false,
    aroma:"Herbal cítrico e verde. Entra na virada de estação.",
    temas:["metabolismo","pele"], momentos:["manha"], evitar:["gestante","lactante"] },

  { slug:"console", nome:"Console", en:"Console", botanica:"Mistura Reconfortante", cor:"#B58AA8", tipo:"blend", base:false,
    aroma:"Floral amadeirado e acolhedor. Para os dias mais pesados.",
    temas:["humor","calma"], momentos:["noite"], evitar:[] },

  { slug:"yarrow-pom", nome:"Yarrow | Pom", en:"Yarrow Pom", botanica:"Achillea + Punica", cor:"#4C7A8C", tipo:"blend", base:false,
    aroma:"Herbal e frutado. Duas gotas no sérum da noite.",
    temas:["pele"], momentos:["noite"], evitar:["gestante"] },

  { slug:"hd-clear", nome:"HD Clear", en:"HD Clear", botanica:"Mistura para a Pele", cor:"#5E9C8C", tipo:"blend", base:false,
    aroma:"Herbal fresco em roll-on. Feito para a rotina de pele do rosto.",
    temas:["pele"], momentos:["manha","noite"], evitar:[] },

  /* ---- LINHA KIDS ---- */
  { slug:"calmer", nome:"Calmer", en:"Calmer", botanica:"Mistura Kids — Descanso", cor:"#7E63C9", tipo:"kids", base:false,
    aroma:"Lavanda e camomila já diluídos em roll-on. Feito para a hora de dormir das crianças.",
    temas:["sono","calma","familia"], momentos:["noite"], evitar:[] },

  { slug:"thinker", nome:"Thinker", en:"Thinker", botanica:"Mistura Kids — Foco", cor:"#E8A33D", tipo:"kids", base:false,
    aroma:"Cítrico e alegre em roll-on. Vai junto com o material da escola.",
    temas:["foco","familia"], momentos:["manha"], evitar:[] },

  { slug:"steady", nome:"Steady", en:"Steady", botanica:"Mistura Kids — Equilíbrio", cor:"#4E9BB5", tipo:"kids", base:false,
    aroma:"Amadeirado suave em roll-on. Para as transições do dia da criança.",
    temas:["calma","familia"], momentos:["tarde"], evitar:[] },

  { slug:"brave", nome:"Brave", en:"Brave", botanica:"Mistura Kids — Coragem", cor:"#D96A4F", tipo:"kids", base:false,
    aroma:"Cítrico e amadeirado em roll-on. Antes da prova, da consulta, do palco.",
    temas:["humor","familia"], momentos:["manha"], evitar:[] },

  { slug:"stronger", nome:"Stronger", en:"Stronger", botanica:"Mistura Kids — Cuidado", cor:"#5FA86E", tipo:"kids", base:false,
    aroma:"Amadeirado cítrico em roll-on. Parte do cuidado diário dos pequenos.",
    temas:["imunidade","familia","pele"], momentos:["noite"], evitar:[] }
];

/* ---------- ÓLEOS QUE JÁ VÊM DILUÍDOS (roll-on 10 ml) ----------
   Prontos para passar na pele sem preparo. São a porta de entrada
   mais segura para criança e para quem está começando.            */
const JA_DILUIDOS = [
  "calmer","thinker","steady","brave","stronger",
  "pastense","clarycalm","hd-clear"
];

/* ---------- ITEM DE APOIO ----------
   Não é óleo essencial: é o veículo que permite usar os óleos
   concentrados na pele com segurança. Entra sempre no resultado. */
const APOIO = {
  slug:"oleo-de-coco", nome:"Óleo de Coco Fracionado", en:"Fractionated Coconut Oil",
  botanica:"Cocos nucifera · 115 ml", cor:"#D8CDB8", tipo:"apoio",
  aroma:"Sem cheiro, leve e não mancha tecido. É ele que dilui os óleos concentrados para uso na pele.",
  porque:"Indispensável para usar qualquer óleo concentrado na pele com segurança."
};


/* ============================================================
   QUIZ — as etapas são exatamente as dos prints de referência.
   tipo: "unica" (uma escolha) | "multipla" (várias) | "texto" |
         "escala" (1..N) | "campo" (input)
   temas: pontuação aplicada quando a opção é marcada
   flag:  marcador de atenção especial (segurança)
   ============================================================ */
const QUIZ = [

  /* ---------- ETAPA 1 ---------- */
  {
    id: "inicio",
    rotulo: "Início",
    icone: "🌱",
    titulo: nome => `Vamos começar${nome ? `, ${nome}` : ""}!`,
    perguntas: [
      { id:"aceite", tipo:"multipla", label:"Antes de começar", obrigatorio:true,
        opcoes:[ {v:"sim", t:"Autorizo o uso das minhas respostas para montar o meu protocolo e para o contato de {consultor} pelo WhatsApp. Posso pedir a exclusão quando quiser."} ] },
      { id:"nome", tipo:"campo", label:"Como você se chama?", placeholder:"Seu primeiro nome", inputType:"text", obrigatorio:true, autocomplete:"given-name" },
      { id:"ja_usou", tipo:"unica", label:"Você já usou óleos essenciais anteriormente?", obrigatorio:true,
        opcoes:[ {v:"sim", t:"Sim"}, {v:"nao", t:"Não"} ] }
    ]
  },

  /* ---------- ETAPA 2 ---------- */
  {
    id: "fisica",
    rotulo: "Saúde Física",
    icone: "🫀",
    titulo: nome => `Ótimo começo${nome ? `, ${nome}` : ""}! Como está a sua Saúde Física?`,
    perguntas: [
      { id:"atencao", tipo:"multipla", label:"Atenção especial: O uso será para alguém com alguma destas condições?", exclusiva:"nenhuma",
        opcoes:[
          {v:"gestante", t:"Gestante", flag:"gestante"},
          {v:"lactante", t:"Lactante", flag:"lactante"},
          {v:"crianca0", t:"Criança (menor de 3 anos)", flag:"crianca0", temas:["familia"]},
          {v:"crianca3", t:"Criança (entre 3 e 12 anos)", flag:"crianca3", temas:["familia"]},
          {v:"epilepsia", t:"Epilepsia", flag:"epilepsia"},
          {v:"hipertensao", t:"Hipertensão (Pressão Alta)", flag:"hipertensao"},
          {v:"nenhuma", t:"Nenhuma destas"}
        ] },

      { id:"medicamentos", tipo:"texto", label:"Medicamentos ou suplementos em uso contínuo?", placeholder:"Liste medicamentos e suplementos (ou deixe em branco)" },

      { id:"sintomas_fisicos", tipo:"multipla", label:"Sintomas físicos frequentes",
        opcoes:[
          {v:"dor_cabeca", t:"Dores de cabeça frequentes", temas:["corpo","calma"]},
          {v:"enxaqueca", t:"Enxaqueca", temas:["corpo","calma"]},
          {v:"dores_musc", t:"Dores musculares", temas:["corpo"]},
          {v:"articulacoes", t:"Dores nas articulações", temas:["corpo"]},
          {v:"costas", t:"Dor nas costas", temas:["corpo"]},
          {v:"pressao_alta", t:"Pressão alta", temas:["calma"], flag:"hipertensao"},
          {v:"pressao_baixa", t:"Pressão baixa", temas:["energia"]},
          {v:"falta_ar", t:"Falta de ar", temas:["respiratorio"]},
          {v:"sinusite", t:"Sinusite / Rinite", temas:["respiratorio"]},
          {v:"alergias", t:"Alergias frequentes", temas:["respiratorio","imunidade"]},
          {v:"gripes", t:"Gripes frequentes", temas:["imunidade","respiratorio"]},
          {v:"queda_cabelo", t:"Queda de cabelo", temas:["cabelo"]},
          {v:"unhas", t:"Unhas fracas", temas:["pele"]},
          {v:"infeccoes", t:"Infecções frequentes", temas:["imunidade"]},
          {v:"inchaco_pernas", t:"Inchaço nas pernas", temas:["corpo","metabolismo"]}
        ] },

      { id:"digestivos", tipo:"multipla", label:"Problemas digestivos",
        opcoes:[
          {v:"refluxo", t:"Refluxo / Azia", temas:["digestivo"]},
          {v:"gastrite", t:"Gastrite", temas:["digestivo"]},
          {v:"inchaco_abd", t:"Inchaço abdominal", temas:["digestivo"]},
          {v:"gases", t:"Gases excessivos", temas:["digestivo"]},
          {v:"constipacao", t:"Constipação", temas:["digestivo"]},
          {v:"diarreia", t:"Diarreia frequente", temas:["digestivo"]},
          {v:"intestino_irrit", t:"Intestino irritável", temas:["digestivo","calma"]},
          {v:"nauseas", t:"Náuseas", temas:["digestivo"]},
          {v:"lactose", t:"Intolerância à lactose", temas:["digestivo"]},
          {v:"gluten", t:"Sensibilidade ao glúten", temas:["digestivo"]},
          {v:"figado", t:"Fígado sobrecarregado", temas:["metabolismo","digestivo"]},
          {v:"compulsao", t:"Compulsão alimentar / Vontade de doces", temas:["metabolismo","humor"]}
        ] },

      { id:"hormonal", tipo:"multipla", label:"Saúde hormonal",
        opcoes:[
          {v:"colicas", t:"Cólicas menstruais intensas", temas:["hormonal","corpo"]},
          {v:"ciclo_irreg", t:"Ciclo irregular", temas:["hormonal"]},
          {v:"tpm", t:"TPM intensa", temas:["hormonal","humor"]},
          {v:"endometriose", t:"Endometriose", temas:["hormonal","corpo"]},
          {v:"sop", t:"SOP", temas:["hormonal","metabolismo"]},
          {v:"menopausa", t:"Menopausa em curso", temas:["hormonal","calma"]},
          {v:"fogachos", t:"Fogachos / Calores", temas:["hormonal","calma"]},
          {v:"libido", t:"Baixa libido", temas:["hormonal","humor"]},
          {v:"engravidar", t:"Dificuldade para engravidar", temas:["hormonal","calma"]},
          {v:"hipotireoidismo", t:"Hipotireoidismo", temas:["metabolismo","energia"]},
          {v:"hipertireoidismo", t:"Hipertireoidismo", temas:["calma"]},
          {v:"insulina", t:"Resistência à insulina", temas:["metabolismo"]}
        ] },

      { id:"cronicas", tipo:"multipla", label:"Condições crônicas diagnosticadas", exclusiva:"nenhuma",
        opcoes:[
          {v:"diabetes", t:"Diabetes", temas:["metabolismo"]},
          {v:"hipertensao_d", t:"Hipertensão", temas:["calma"], flag:"hipertensao"},
          {v:"colesterol", t:"Colesterol alto", temas:["metabolismo"]},
          {v:"artrite", t:"Artrite / Artrose", temas:["corpo"]},
          {v:"fibromialgia", t:"Fibromialgia", temas:["corpo","sono"]},
          {v:"asma", t:"Asma", temas:["respiratorio"]},
          {v:"celiaca", t:"Doença celíaca", temas:["digestivo"]},
          {v:"nenhuma", t:"Nenhuma"}
        ] }
    ]
  },

  /* ---------- ETAPA 3 ---------- */
  {
    id: "emocoes",
    rotulo: "Emoções e Sono",
    icone: "🧠",
    titulo: nome => `Isso aí${nome ? `, ${nome}` : ""}! Conta pra gente sobre suas Emoções e Sono`,
    perguntas: [
      { id:"emocional_texto", tipo:"texto", label:"Conte como está se sentindo emocionalmente", placeholder:"Descreva sua situação emocional atual..." },

      { id:"emocionais", tipo:"multipla", label:"Sintomas emocionais",
        opcoes:[
          {v:"ansiedade", t:"Ansiedade", temas:["calma"]},
          {v:"panico", t:"Ataques de pânico", temas:["calma"]},
          {v:"estresse_cronico", t:"Estresse crônico", temas:["calma"]},
          {v:"burnout", t:"Esgotamento emocional (burnout)", temas:["calma","energia"]},
          {v:"depressao", t:"Depressão", temas:["humor"]},
          {v:"tristeza", t:"Tristeza frequente", temas:["humor"]},
          {v:"irritabilidade", t:"Irritabilidade", temas:["calma","humor"]},
          {v:"concentracao", t:"Dificuldade de concentração", temas:["foco"]},
          {v:"esquecimento", t:"Esquecimento", temas:["foco"]},
          {v:"confusao", t:"Confusão mental", temas:["foco"]},
          {v:"autoestima", t:"Baixa autoestima", temas:["humor"]},
          {v:"pensamentos", t:"Pensamentos acelerados", temas:["calma","sono"]},
          {v:"relaxar", t:"Dificuldade para relaxar", temas:["calma","sono"]},
          {v:"raiva", t:"Raiva reprimida", temas:["calma","humor"]},
          {v:"vazio", t:"Sensação de vazio", temas:["humor"]}
        ] },

      { id:"sono_problemas", tipo:"multipla", label:"Problemas de sono",
        opcoes:[
          {v:"insonia", t:"Insônia (dificuldade de adormecer)", temas:["sono"]},
          {v:"acorda_noite", t:"Acorda no meio da noite", temas:["sono"]},
          {v:"sono_leve", t:"Sono leve", temas:["sono"]},
          {v:"bruxismo", t:"Bruxismo", temas:["sono","calma"]},
          {v:"apneia", t:"Apneia do sono", temas:["sono","respiratorio"]},
          {v:"sem_disposicao", t:"Acorda sem disposição", temas:["energia","sono"]},
          {v:"sonolencia", t:"Sonolência durante o dia", temas:["energia","foco"]},
          {v:"remedio_dormir", t:"Dependência de remédio para dormir", temas:["sono"]}
        ] },

      { id:"fadiga", tipo:"multipla", label:"Fadiga e baixa energia",
        opcoes:[
          {v:"fadiga_cronica", t:"Fadiga crônica / cansaço constante", temas:["energia"]},
          {v:"esgotamento", t:"Esgotamento após pequenos esforços", temas:["energia"]},
          {v:"motivacao", t:"Falta de motivação", temas:["humor","energia"]},
          {v:"procrastinacao", t:"Procrastinação excessiva", temas:["foco"]},
          {v:"cafeina", t:"Dependência de cafeína", temas:["energia"]},
          {v:"forca_exercicio", t:"Falta de força/energia para exercícios", temas:["energia","corpo"]}
        ] },

      { id:"nivel_estresse", tipo:"escala", label:"Nível de estresse (1=baixo, 10=extremo)", min:1, max:10, padrao:5, temaAlto:"calma" },
      { id:"nivel_energia", tipo:"escala", label:"Nível de energia (1=exausto, 10=disposto)", min:1, max:10, padrao:5, temaBaixo:"energia" },

      { id:"horas_sono", tipo:"unica", label:"Horas de sono por noite",
        opcoes:[
          {v:"menos5", t:"Menos de 5h", temas:["sono","energia"]},
          {v:"5a6", t:"5 a 6h", temas:["sono"]},
          {v:"6a7", t:"6 a 7h", temas:[]},
          {v:"7a8", t:"7 a 8h", temas:[]},
          {v:"mais8", t:"Mais de 8h", temas:[]}
        ] }
    ]
  },

  /* ---------- ETAPA 4 ---------- */
  {
    id: "habitos",
    rotulo: "Hábitos Diários",
    icone: "✨",
    titulo: nome => `Estamos quase lá${nome ? `, ${nome}` : ""}! Como são seus Hábitos Diários?`,
    perguntas: [
      { id:"pele_condicoes", tipo:"multipla", label:"Condições de pele",
        opcoes:[
          {v:"acne", t:"Acne / Espinhas frequentes", temas:["pele"]},
          {v:"pele_oleosa", t:"Pele oleosa", temas:["pele"]},
          {v:"pele_seca", t:"Pele muito seca", temas:["pele"]},
          {v:"eczema", t:"Eczema / Dermatite", temas:["pele"]},
          {v:"psoriase", t:"Psoríase", temas:["pele"]},
          {v:"manchas", t:"Manchas na pele", temas:["pele"]},
          {v:"rugas", t:"Rugas precoces", temas:["pele"]},
          {v:"flacidez", t:"Flacidez", temas:["pele","corpo"]},
          {v:"celulite", t:"Celulite", temas:["metabolismo","pele"]},
          {v:"pele_opaca", t:"Pele opaca / sem brilho", temas:["pele"]}
        ] },

      { id:"cabelo_condicoes", tipo:"multipla", label:"Condições do cabelo",
        opcoes:[
          {v:"queda", t:"Queda excessiva", temas:["cabelo"]},
          {v:"quebradico", t:"Cabelo fraco e quebradiço", temas:["cabelo"]},
          {v:"couro_oleoso", t:"Couro cabeludo oleoso", temas:["cabelo"]},
          {v:"caspa", t:"Caspa", temas:["cabelo"]},
          {v:"sem_brilho", t:"Cabelo sem brilho", temas:["cabelo"]},
          {v:"alopecia", t:"Alopecia / Calvície", temas:["cabelo"]}
        ] },

      { id:"tipo_pele", tipo:"unica", label:"Tipo de pele",
        opcoes:[
          {v:"normal", t:"Normal"}, {v:"oleosa", t:"Oleosa", temas:["pele"]},
          {v:"seca", t:"Seca", temas:["pele"]}, {v:"mista", t:"Mista", temas:["pele"]},
          {v:"sensivel", t:"Sensível", temas:["pele"]}
        ] },

      { id:"atividade", tipo:"unica", label:"Atividade física",
        opcoes:[
          {v:"sedentario", t:"Sedentário", temas:["energia","metabolismo"]},
          {v:"1a2", t:"1-2x por semana", temas:["corpo"]},
          {v:"3a4", t:"3-4x por semana", temas:["corpo"]},
          {v:"todos", t:"Todos os dias", temas:["corpo"]}
        ] },

      { id:"alimentacao", tipo:"unica", label:"Alimentação predominante",
        opcoes:[
          {v:"saudavel", t:"Saudável"},
          {v:"moderada", t:"Moderada"},
          {v:"industrializada", t:"Industrializada", temas:["metabolismo","digestivo"]},
          {v:"vegetariana", t:"Vegetariana / Vegana"},
          {v:"lowcarb", t:"Low carb"}
        ] },

      { id:"agua", tipo:"unica", label:"Água por dia",
        opcoes:[
          {v:"menos1", t:"Menos de 1L", temas:["metabolismo","pele"]},
          {v:"1a15", t:"1 a 1,5L", temas:["metabolismo"]},
          {v:"15a2", t:"1,5 a 2L"},
          {v:"mais2", t:"Mais de 2L"}
        ] },

      { id:"consumo", tipo:"multipla", label:"Consome com frequência",
        opcoes:[
          {v:"alcool", t:"Álcool", temas:["metabolismo"]},
          {v:"cafe", t:"Café em excesso", temas:["energia","sono"]},
          {v:"refrigerante", t:"Refrigerantes", temas:["metabolismo","digestivo"]},
          {v:"acucar", t:"Açúcar refinado", temas:["metabolismo"]},
          {v:"cigarro", t:"Cigarro", temas:["respiratorio"]}
        ] }
    ]
  },

  /* ---------- ETAPA 5 ---------- */
  {
    id: "objetivos",
    rotulo: "Objetivos",
    icone: "🎯",
    titulo: nome => `Por último${nome ? `, ${nome}` : ""}: o que você quer conquistar?`,
    perguntas: [
      { id:"busca", tipo:"multipla", label:"O que busca com óleos essenciais?", peso:3,
        opcoes:[
          {v:"estresse", t:"Reduzir estresse e ansiedade", temas:["calma"]},
          {v:"sono", t:"Melhorar o sono", temas:["sono"]},
          {v:"dores", t:"Aliviar dores", temas:["corpo"]},
          {v:"digestao", t:"Melhorar a digestão", temas:["digestivo"]},
          {v:"imunidade", t:"Fortalecer a imunidade", temas:["imunidade"]},
          {v:"hormonios", t:"Equilibrar hormônios", temas:["hormonal"]},
          {v:"emagrecer", t:"Emagrecer / metabolismo", temas:["metabolismo"]},
          {v:"pele_cabelo", t:"Melhorar pele e cabelo", temas:["pele","cabelo"]},
          {v:"energia", t:"Aumentar energia", temas:["energia"]},
          {v:"performance", t:"Aumentar performance física", temas:["corpo","energia"]},
          {v:"recuperacao", t:"Acelerar recuperação muscular", temas:["corpo"]},
          {v:"desintoxicar", t:"Desintoxicar o organismo", temas:["metabolismo"]},
          {v:"prevenir", t:"Prevenir doenças naturalmente", temas:["imunidade"]},
          {v:"emocional", t:"Cuidado emocional profundo", temas:["humor","calma"]},
          {v:"menopausa", t:"Apoio à menopausa", temas:["hormonal"]},
          {v:"familia", t:"Saúde para a família", temas:["familia","imunidade"]}
        ] },

      { id:"experiencia", tipo:"unica", label:"Já usou óleos essenciais?",
        opcoes:[
          {v:"nunca", t:"Nunca usei"},
          {v:"gostei", t:"Usei e gostei"},
          {v:"sem_resultado", t:"Usei mas não tive resultado"},
          {v:"regularmente", t:"Uso regularmente"}
        ] },

      { id:"comprometimento", tipo:"escala", label:"Comprometimento com mudança de hábitos", min:1, max:5, padrao:3, legenda:"Baixo → Alto" }
    ]
  },

  /* ---------- ETAPA 6 ---------- */
  {
    id: "dados",
    rotulo: "Seus Dados",
    icone: "📩",
    titulo: nome => `Pronto${nome ? `, ${nome}` : ""}! Para onde enviamos seu resultado?`,
    perguntas: [
      { id:"whatsapp", tipo:"campo", label:"Qual seu WhatsApp para enviar seu resultado?", placeholder:"(00) 00000-0000", inputType:"tel", obrigatorio:true, mascara:"telefone", autocomplete:"tel" },
      { id:"nascimento", tipo:"campo", label:"Qual sua data de nascimento?", inputType:"date", obrigatorio:true, autocomplete:"bday" },
      { id:"sexo", tipo:"unica", label:"Qual seu sexo?", obrigatorio:true,
        opcoes:[ {v:"feminino", t:"Feminino"}, {v:"masculino", t:"Masculino"} ] },
      { id:"pais", tipo:"campo", label:"País", placeholder:"Brasil", inputType:"text", obrigatorio:true, valorPadrao:"Brasil", autocomplete:"country-name" },
      { id:"estado", tipo:"campo", label:"Estado", placeholder:"Ex.: Goiás", inputType:"text", obrigatorio:true, autocomplete:"address-level1" },
      { id:"cidade", tipo:"campo", label:"Cidade", placeholder:"Ex.: Goiânia", inputType:"text", obrigatorio:true, autocomplete:"address-level2" },
      { id:"queixa", tipo:"texto", label:"Qual é a sua maior queixa de saúde hoje?", placeholder:"Escreva com suas palavras — é isso que {consultor} vai olhar primeiro.", obrigatorio:true }
    ]
  }
];


/* ============================================================
   DEPOIMENTOS — prints reais, mostrados antes do resultado e
   escolhidos pelos temas que a pessoa marcou.

   Estes são os relatos do acervo que passaram no critério:
   sem citar nome de medicamento, sem "antes e depois" de
   condição de saúde e sem dado pessoal visível no print.

   Ficaram DE FORA (ver README, seção 3): os que citam Rivotril,
   zolpidem, Alenia, Aerolin, Nasonex, bombinha, corticoide ou
   antibiótico; os antes/depois de pele, unha e orelha; e um print
   com a marca d'água de outro consultor.

   Para acrescentar: salve o print em assets/img/depoimentos/ e
   copie um bloco abaixo. O campo `temas` decide para quem ele
   aparece — use as chaves de TEMAS.
   ============================================================ */
const DEPOIMENTOS = [

  /* ---- rotina da noite, calma e sono ---- */
  { imagem:"balance-04.jpg", produto:"Balance", temas:["sono","calma"],
    alt:"Mensagem de cliente contando que usa o Balance toda noite antes de dormir" },

  { imagem:"balance-05.jpg", produto:"Balance", temas:["sono","humor"],
    alt:"Mensagem de cliente contando que usa todos os dias para dormir" },

  { imagem:"balance-07.jpg", produto:"Balance e Adaptiv", temas:["calma","sono"],
    alt:"Mensagem de cliente sobre usar Balance e Adaptiv nos momentos de estresse" },

  { imagem:"breathe-10.jpg", produto:"Air", temas:["sono","corpo"],
    alt:"Conversa de WhatsApp em que a cliente conta que dormiu bem e treinou melhor" },

  /* ---- foco e humor ---- */
  { imagem:"balance-02.jpg", produto:"Balance", temas:["foco","calma"],
    alt:"Mensagem de cliente sobre usar o Balance quando os pensamentos aceleram" },

  { imagem:"balance-09.jpg", produto:"Balance", temas:["humor","calma"],
    alt:"Mensagem de cliente contando como se sente depois que começou a usar o Balance" },

  /* ---- respiração e ambiente ---- */
  { imagem:"breathe-02.jpg", produto:"Air", temas:["respiratorio"],
    alt:"Mensagem de cliente sobre a sensação de respirar melhor usando o Air" },

  { imagem:"breathe-07.jpg", produto:"Air", temas:["respiratorio","familia"],
    alt:"Comentário de mãe sobre o uso do Air com os filhos" },

  /* ---- cuidado diário e família ---- */
  { imagem:"onguard-02.jpg", produto:"On Guard", temas:["imunidade","familia"],
    alt:"Mensagem de cliente sobre passar o roll-on de On Guard nos filhos antes da escola" },

  { imagem:"onguard-04.jpg", produto:"On Guard", temas:["imunidade","familia"],
    alt:"Mensagem de cliente sobre o uso do On Guard na filha" },

  { imagem:"breathe-06.jpg", produto:"Air e On Guard", temas:["imunidade","respiratorio"],
    alt:"Mensagem de cliente contando a rotina que montou com Air, On Guard e mel aromático" },

  { imagem:"onguard-03.jpg", produto:"On Guard", temas:["imunidade"],
    alt:"Conversa de WhatsApp sobre o marido usando o On Guard" },

  { imagem:"onguard-09.jpg", produto:"On Guard", temas:["imunidade","respiratorio"],
    alt:"Prints de clientes sobre o uso do On Guard diluído em óleo de coco" }
];

/* ============================================================
   MOTOR — pontuação, segurança, rotina e mensagem.
   Sem manipulação de DOM aqui: só regras.
   ============================================================ */

const Motor = (function(){

  /* ---------- 1. PONTUAÇÃO DOS TEMAS ---------- */
  function pontuarTemas(respostas){
    const placar = {};
    const somar = (tema, peso) => { if(tema) placar[tema] = (placar[tema]||0) + peso; };

    QUIZ.forEach(etapa => etapa.perguntas.forEach(p => {
      const valor = respostas[p.id];
      if(valor === undefined || valor === null || valor === "") return;
      const peso = p.peso || 1;

      if(p.tipo === "multipla"){
        (valor||[]).forEach(v => {
          const op = (p.opcoes||[]).find(o => o.v === v);
          (op && op.temas || []).forEach(t => somar(t, peso));
        });
      }
      else if(p.tipo === "unica"){
        const op = (p.opcoes||[]).find(o => o.v === valor);
        (op && op.temas || []).forEach(t => somar(t, peso));
      }
      else if(p.tipo === "escala"){
        const n = Number(valor);
        // estresse alto pesa em "calma"; energia baixa pesa em "energia"
        if(p.temaAlto && n >= 7) somar(p.temaAlto, n >= 9 ? 3 : 2);
        if(p.temaBaixo && n <= 4) somar(p.temaBaixo, n <= 2 ? 3 : 2);
      }
    }));

    return placar;
  }

  /* ---------- 2. MARCADORES DE SEGURANÇA ---------- */
  function coletarFlags(respostas){
    const flags = new Set();
    QUIZ.forEach(etapa => etapa.perguntas.forEach(p => {
      const valor = respostas[p.id];
      if(!valor) return;
      const marcados = p.tipo === "multipla" ? valor : [valor];
      (marcados||[]).forEach(v => {
        const op = (p.opcoes||[]).find(o => o.v === v);
        if(op && op.flag) flags.add(op.flag);
      });
    }));
    return flags;
  }

  /* ---------- 3. RECOMENDAÇÃO ---------- */
  function recomendar(respostas){
    const placar = pontuarTemas(respostas);
    const flags  = coletarFlags(respostas);

    // temas ordenados por relevância
    const temasOrdenados = Object.keys(placar)
      .filter(t => placar[t] > 0)
      .sort((a,b) => placar[b] - placar[a]);

    // fallback: quem quase não marcou nada ainda merece uma rotina
    if(temasOrdenados.length === 0) temasOrdenados.push("calma","energia","imunidade");

    const temasTop = temasOrdenados.slice(0,5);

    // óleos seguros para o perfil
    const seguros = OLEOS.filter(o => !(o.evitar||[]).some(f => flags.has(f)));
    // só contamos como "excluído" o que teria entrado no resultado dela
    const excluidos = OLEOS.filter(o =>
      (o.evitar||[]).some(f => flags.has(f)) &&
      (o.temas||[]).some(t => placar[t] > 0));

    // pontua cada óleo pela soma dos temas que ele cobre
    const comNota = seguros.map(o => {
      let nota = 0;
      let motivos = [];
      (o.temas||[]).forEach(t => {
        if(placar[t]){
          nota += placar[t];
          motivos.push(t);
        }
      });
      // bônus pequeno para óleos de uso amplo: serve de desempate entre
      // dois óleos igualmente relevantes, sem passar na frente da relevância
      if(o.base) nota += 0.8;
      // prioriza linha kids quando há criança no perfil
      const temCrianca = flags.has("crianca0") || flags.has("crianca3");
      if(o.tipo === "kids" && temCrianca) nota += 4;
      else if(o.tipo === "kids") nota -= 6;

      // com criança em casa, roll-on de 10 ml (que já vem diluído)
      // é mais seguro e mais fácil do que frasco concentrado
      if(temCrianca && (JA_DILUIDOS||[]).includes(o.slug)) nota += 2.5;

      // motivo principal = tema de maior peso que o óleo cobre
      motivos.sort((a,b) => placar[b] - placar[a]);
      // A identidade do óleo é o PRIMEIRO tema da base — não o de maior nota.
      // Sem isso, Sálvia Esclareia (que é hormonal) roubava a vaga da calma
      // só por somar pontos em vários temas ao mesmo tempo.
      const identidade = (o.temas||[])[0];
      return {
        ...o, nota,
        identidade,
        // no card mostramos o motivo que faz sentido para ELA
        temaPrincipal: placar[identidade] ? identidade : (motivos[0] || identidade)
      };
    })
    .filter(o => o.nota > 0)
    // relevância manda; "base" só desempata
    .sort((a,b) => b.nota - a.nota || (b.base?1:0) - (a.base?1:0));

    // ---- Kit Essencial ----
    // Um óleo por tema, percorrendo os temas DELA em ordem de relevância.
    // Assim quem marcou sono leva um óleo de sono — e não o "base" mais
    // popular que por acaso tinha nota alta.
    const kit = [];
    const usados = new Set();
    const pegar = o => { kit.push(o); usados.add(o.slug); };

    temasOrdenados.forEach(tema => {
      if(kit.length >= CONFIG.tamanhoKitBasico) return;
      // primeiro procuramos um óleo que É daquele tema; só depois
      // aceitamos um que apenas passa por ele
      const melhor = comNota.find(o => !usados.has(o.slug) && o.identidade === tema)
                  || comNota.find(o => !usados.has(o.slug) && (o.temas||[]).includes(tema));
      if(melhor) pegar(melhor);
    });
    // completa com os de maior nota, se ainda faltar
    comNota.forEach(o => {
      if(kit.length < CONFIG.tamanhoKitBasico && !usados.has(o.slug)) pegar(o);
    });

    // ---- Protocolo completo: kit + os próximos mais relevantes ----
    const protocolo = kit.slice();
    comNota.forEach(o => {
      if(protocolo.length < CONFIG.tamanhoProtocolo && !usados.has(o.slug)){
        protocolo.push(o); usados.add(o.slug);
      }
    });
    protocolo.sort((a,b) => b.nota - a.nota);

    const kitFinal = kit.slice(0, CONFIG.tamanhoKitBasico);
    const protocoloFinal = protocolo.slice(0, CONFIG.tamanhoProtocolo);

    // Precisa de óleo de coco? Sim, sempre que houver óleo concentrado
    // no resultado — ou seja, quase sempre.
    const concentrados = protocoloFinal.filter(o => !(JA_DILUIDOS||[]).includes(o.slug));
    const temCrianca = flags.has("crianca0") || flags.has("crianca3");

    return {
      placar, flags, temasTop,
      kit: kitFinal,
      protocolo: protocoloFinal,
      excluidos,
      temCrianca,
      apoio: concentrados.length ? APOIO : null,
      jaDiluidos: protocoloFinal.filter(o => (JA_DILUIDOS||[]).includes(o.slug))
    };
  }

  /* ---------- 3b. DEPOIMENTOS COMBINANDO COM OS OBJETIVOS ---------- */
  function escolherDepoimentos(rec, quantos){
    quantos = quantos || 3;
    const lista = DEPOIMENTOS || [];
    if(!lista.length) return [];

    // pontua cada depoimento pelo quanto os temas dele batem com os dela
    const comNota = lista.map(d => {
      let nota = 0;
      (d.temas||[]).forEach(t => {
        const posicao = rec.temasTop.indexOf(t);
        if(posicao !== -1) nota += (rec.temasTop.length - posicao) * 2;
        else if(rec.placar[t]) nota += 1;
      });
      return { ...d, nota };
    }).sort((a,b) => b.nota - a.nota);

    const chave = d => d.imagem || d.texto;
    const escolhidos = comNota.filter(d => d.nota > 0).slice(0, quantos);

    // completa com os que não dependem de tema (atendimento, preço)
    if(escolhidos.length < quantos){
      comNota.filter(d => !(d.temas||[]).length)
             .forEach(d => { if(escolhidos.length < quantos) escolhidos.push(d); });
    }
    // e, se ainda faltar, com qualquer um que ainda não entrou
    comNota.forEach(d => {
      if(escolhidos.length < quantos && !escolhidos.some(x => chave(x) === chave(d))) escolhidos.push(d);
    });

    return escolhidos.slice(0, quantos);
  }

  /* ---------- 4. ROTINA DA MANHÃ (completa e liberada) ---------- */
  function rotinaManha(rec, respostas){
    const nomeDe = tema => {
      const o = rec.protocolo.find(x => (x.temas||[]).includes(tema));
      return o ? o.nome : null;
    };
    const primeiro = rec.kit[0] ? rec.kit[0].nome : "Lavanda";
    const passos = [];

    passos.push({
      hora:"Ao acordar",
      titulo:"Abra a janela e ligue o difusor",
      texto:`3 a 4 gotas de <span class="oleo-ref">${nomeDe("energia") || nomeDe("humor") || "Limão"}</span> no difusor com água até a marca. Deixe rodando por 30 a 45 minutos enquanto você se arruma. É o aroma que marca o começo do dia.`
    });

    passos.push({
      hora:"Banho",
      titulo:"Banho aromático",
      texto:`Pingue 2 gotas de <span class="oleo-ref">${nomeDe("respiratorio") || nomeDe("energia") || "Eucalipto"}</span> no canto do box, longe do jato direto. O vapor espalha o aroma pelo banheiro inteiro.`
    });

    if(rec.temasTop.includes("metabolismo") || rec.temasTop.includes("digestivo")){
      passos.push({
        hora:"Jejum",
        titulo:"Água aromatizada",
        texto:`1 gota de <span class="oleo-ref">${nomeDe("metabolismo") || "Limão"}</span> em 500 ml de água, em copo de vidro ou inox (nunca plástico). Beba devagar antes do café da manhã.`
      });
    }

    passos.push({
      hora:"Antes de sair",
      titulo:"Ponto de ancoragem",
      texto:`1 gota de <span class="oleo-ref">${nomeDe("calma") || nomeDe("foco") || primeiro}</span> nos pulsos e atrás da nuca. Esfregue as palmas, leve ao rosto e faça 3 respirações fundas. Leva 20 segundos e organiza o resto da manhã.`
    });

    passos.push({
      hora:"Manhã",
      titulo:"Bloco de trabalho ou estudo",
      texto:`<span class="oleo-ref">${nomeDe("foco") || "Hortelã-Pimenta"}</span> no difusor da mesa, ou 1 gota na palma para inalar antes de começar a tarefa mais difícil do dia.`
    });

    if(rec.temasTop.includes("pele") || rec.temasTop.includes("cabelo")){
      passos.push({
        hora:"Skincare",
        titulo:"Rotina de pele da manhã",
        texto:`1 gota de <span class="oleo-ref">${nomeDe("pele") || "Incenso"}</span> misturada ao seu hidratante de sempre, na palma da mão. Aplique e finalize com protetor solar.`
      });
    }

    if(rec.temasTop.includes("imunidade") || rec.temasTop.includes("familia")){
      passos.push({
        hora:"Casa",
        titulo:"Cuidado com o ambiente",
        texto:`<span class="oleo-ref">${nomeDe("imunidade") || "On Guard"}</span> no difusor da sala, ou algumas gotas na água da faxina. Deixa a casa com cheiro de cuidada.`
      });
    }

    if(rec.temasTop.includes("corpo")){
      passos.push({
        hora:"Treino",
        titulo:"Antes de se movimentar",
        texto:`<span class="oleo-ref">${nomeDe("corpo") || "Deep Blue"}</span> diluído em óleo vegetal, massageado nas pernas e ombros antes da atividade. Repita depois, no banho.`
      });
    }

    passos.push({
      hora:"Na bolsa",
      titulo:"Leve um com você",
      texto:`Escolha <strong>um</strong> dos seus óleos e deixe na bolsa ou no carro. O que funciona não é o vidro na prateleira — é o que está do seu lado quando você precisa. Comece por <span class="oleo-ref">${primeiro}</span>.`
    });

    passos.push({
      hora:"Regra de ouro",
      titulo:"Diluição e segurança",
      texto:`Na pele, sempre dilua: 1 a 2 gotas para cada colher de chá de óleo vegetal (coco, semente de uva ou amêndoas). Evite o contorno dos olhos e a parte interna do ouvido. Cítricos deixam a pele mais sensível ao sol — use à noite ou em áreas cobertas.`
    });

    return passos;
  }

  /* ---------- 5. PRÉVIA BORRADA (tarde/noite) ---------- */
  function previaBloqueada(periodo){
    const base = {
      tarde: [
        {hora:"12h", titulo:"Depois do almoço", texto:"Protocolo completo liberado após a primeira compra."},
        {hora:"15h", titulo:"A queda das três da tarde", texto:"Protocolo completo liberado após a primeira compra."},
        {hora:"18h", titulo:"Transição do trabalho para casa", texto:"Protocolo completo liberado após a primeira compra."}
      ],
      noite: [
        {hora:"20h", titulo:"Desacelerar", texto:"Protocolo completo liberado após a primeira compra."},
        {hora:"21h", titulo:"Cuidado com a pele da noite", texto:"Protocolo completo liberado após a primeira compra."},
        {hora:"22h", titulo:"Ritual do sono", texto:"Protocolo completo liberado após a primeira compra."}
      ]
    };
    return base[periodo] || [];
  }

  /* ---------- 6. MENSAGEM DE WHATSAPP ---------- */
  function mensagemWhatsApp(respostas, rec){
    const nome = (respostas.nome || "").trim() || "Olá";
    const temas = rec.temasTop.map(t => TEMAS[t] && TEMAS[t].rotulo.toLowerCase()).filter(Boolean);
    const queixa = (respostas.queixa || "").trim();
    const oleosKit = rec.kit.map(o => o.nome).join(", ");
    const oleosTodos = rec.protocolo.map(o => o.nome).join(", ");

    let situacao;
    if(temas.length > 1) situacao = `${temas.slice(0,-1).join(", ")} e ${temas[temas.length-1]}`;
    else situacao = temas[0] || "bem-estar no dia a dia";

    const linhas = [
      `Oi ${CONFIG.consultor}! Aqui é ${nome}. 👋`,
      ``,
      `Acabei de fazer o quiz no seu site e meu resultado apontou para: ${situacao}.`
    ];

    if(queixa) linhas.push(``, `O que mais me incomoda hoje: ${queixa}`);

    linhas.push(
      ``,
      `Os óleos que apareceram para começar (Kit Essencial): ${oleosKit}.`,
      `E o protocolo completo: ${oleosTodos}.`
    );

    if(rec.apoio) linhas.push(`Preciso também do ${rec.apoio.nome} para diluir.`);
    if(rec.temCrianca) linhas.push(`Obs.: o uso também é para criança, então prefiro os roll-on de 10 ml que já vêm diluídos.`);

    linhas.push(
      ``,
      `Quero adquirir a preço de custo, direto de fábrica, e ter o seu acompanhamento para usar na ordem certa.`,
      `Também quero desbloquear a rotina completa da tarde e da noite.`,
      ``,
      `Pode me explicar como funciona?`
    );

    return linhas.join("\n");
  }

  function linkWhatsApp(texto){
    return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
  }

  /* ---------- 7. FRASCO DESENHADO (fallback da foto) ---------- */
  function frascoSVG(cor, sigla){
    return `
    <svg viewBox="0 0 100 150" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="v${sigla}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#5B4632"/>
          <stop offset="35%" stop-color="#8A6B47"/>
          <stop offset="60%" stop-color="#6B5138"/>
          <stop offset="100%" stop-color="#4A3827"/>
        </linearGradient>
      </defs>
      <rect x="38" y="6" width="24" height="16" rx="3" fill="${cor}"/>
      <rect x="41" y="20" width="18" height="8" fill="${cor}" opacity=".8"/>
      <path d="M30 30 Q30 26 34 26 L66 26 Q70 26 70 30 L70 132 Q70 142 60 142 L40 142 Q30 142 30 132 Z" fill="url(#v${sigla})"/>
      <rect x="34" y="62" width="32" height="52" rx="3" fill="#F7F5EF"/>
      <rect x="34" y="62" width="32" height="13" rx="3" fill="${cor}"/>
      <rect x="38" y="82" width="24" height="2.5" rx="1.25" fill="${cor}" opacity=".55"/>
      <rect x="38" y="89" width="18" height="2.5" rx="1.25" fill="${cor}" opacity=".35"/>
      <rect x="38" y="96" width="21" height="2.5" rx="1.25" fill="${cor}" opacity=".35"/>
      <ellipse cx="42" cy="45" rx="4" ry="14" fill="#fff" opacity=".13"/>
    </svg>`;
  }

  return { pontuarTemas, coletarFlags, recomendar, escolherDepoimentos, rotinaManha,
           previaBloqueada, mensagemWhatsApp, linkWhatsApp, frascoSVG };
})();

window.ANA = { CONFIG, TEMAS, OLEOS, JA_DILUIDOS, APOIO, QUIZ, DEPOIMENTOS, Motor };
})();
