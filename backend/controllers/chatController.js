const { aiModel, defaultSafetySettings } = require('../config/aiConfig');
const ChatMessage = require('../models/ChatMessage');
const FileMeta = require('../models/FileMeta');
const mongoose = require('mongoose');
const { extractAndStoreText } = require('./fileController'); 

// Constantes de configuração (ajuste conforme necessário)
const MAX_CONTEXT_CHARS = 10000;
const MAX_HISTORY_MESSAGES_PAIRS = 4; 
const HISTORY_PAGE_LIMIT = 50; 
const MAX_FILES_FOR_RAG = 3;   

// Base de conhecimento fixa do IPIZ
const IPIZ_KNOWLEDGE = {
  sobre: {
    historia: "Fundado em 17 de Dezembro de 1998, o Instituto Politécnico Industrial do Zango (IPIZ) Nº2047 é uma referência em formação técnico-profissional em Luanda, Angola. Somos pioneiros na oferta de cursos voltados para as necessidades da indústria local.",
    missao: "Formar técnicos qualificados e cidadãos responsáveis, capazes de contribuir para o desenvolvimento sustentável de Angola.",
    visao: "Ser a instituição líder em ensino técnico-profissional industrial em Angola, reconhecida pela excelência e inovação.",
    campus: {
      localizacao: "Zango 8000, Município de Viana (próximo à via expresso), Luanda, Angola.",
      infraestrutura: "Contamos com salas de aula modernas, 12 laboratórios bem equipados (Mecânica, Eletricidade, Informática, Química, etc.), oficinas, biblioteca atualizada e um auditório com capacidade para cerca de 400 pessoas.",
    },
    cursos: [
      "Técnico de Informática - Sistemas Multimédia", "Técnico de Energias Renováveis - Sistemas Solares e Eólicos", "Técnico de Manutenção Industrial - Mecatrónica",
      "Técnico de Frio e Climatização", "Técnico de Desenho Técnico - Construção Civil", "Técnico de Electrónica e Automação - Automação Industrial",
      "Técnico de Máquinas e Motores", "Técnico de Electricidade - Instalações Eléctricas", "Petroquímica - Laboratório", "Química - Técnico de Laboratório"
    ]
  },
  admissao: {
    processo: "O ingresso é feito anualmente através de um exame de acesso nacional ou processo de avaliação específico do IPIZ, geralmente incluindo provas de Língua Portuguesa e Matemática. Consulte o edital oficial para datas e requisitos.",
    requisitos_gerais: "Normalmente exige-se ter concluído a 9ª classe do ensino geral. Documentos específicos são detalhados no edital de cada ano.",
    documentos_comuns: ["Cópia do BI", "Certificado de Habilitações da 9ª Classe (ou equivalente)", "Atestado Médico", "Fotos tipo passe", "Comprovativo de pagamento da taxa de inscrição."],
  },
  contato: {
    telefone: "+244 928 293 438",
    email: "secretaria.ipiz@gmail.com",
    horario: "Atendimento da Secretaria: Segunda a Sexta, das 8:00h às 15:30h."
  }
};

// --- Funções Auxiliares ---

/** Busca informações RELEVANTES e FORMATADAS da base de conhecimento fixa */
async function getRelevantIPIZInfo(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  let foundInfo = null;
  const topics = {
    historia: [/hist[oó]ria/, /fundac[aã]o/, /origem/, /quando surgiu/, /criado em/, /ano de cria[cç][aã]o/i],
    cursos: [/curso/, /disciplina/, /formaç[aã]o/, /área/, /matr[ií]cula/, /grade/, /ensina/, /o que tem/, /lista de cursos/i],
    localizacao: [/onde fica/, /localiz(ação|ado)/, /endereço/, /campus/, /mapa/, /morada/, /como chegar/i],
    contato: [/contato/, /telefone/, /email/, /ligar/, /falar com/, /hor[aá]rio/, /visitar/, /secretaria/, /atendimento/i],
    admissao: [/admissão/, /ingresso/, /requisitos/, /documentos/, /inscri(ção|ções)/, /inscrev(er|eu)/, /entrar/, /como estudar/i],
    missao_visao: [/missão/, /visão/, /valores/, /objectivos inst/i],
    infraestrutura: [/infraestrutura/, /laborat[oó]rios/, /biblioteca/, /oficinas/, /audit[oó]rio/, /equipamentos/i]
  };

  if (topics.historia.some(regex => regex.test(lowerMessage))) foundInfo = `## História do IPIZ\n${IPIZ_KNOWLEDGE.sobre.historia}`;
  else if (topics.missao_visao.some(regex => regex.test(lowerMessage))) foundInfo = `## Missão e Visão\n**Missão:** ${IPIZ_KNOWLEDGE.sobre.missao}\n**Visão:** ${IPIZ_KNOWLEDGE.sobre.visao}`;
  else if (topics.cursos.some(regex => regex.test(lowerMessage))) { const cursos = IPIZ_KNOWLEDGE.sobre.cursos.map(c => `- ${c}`).join('\n'); foundInfo = `## Cursos Oferecidos no IPIZ\n${cursos}\n\nConsulte a secretaria para detalhes.`; }
  else if (topics.localizacao.some(regex => regex.test(lowerMessage))) foundInfo = `## Localização do IPIZ\n${IPIZ_KNOWLEDGE.sobre.campus.localizacao}`;
  else if (topics.infraestrutura.some(regex => regex.test(lowerMessage))) foundInfo = `## Infraestrutura do IPIZ\n${IPIZ_KNOWLEDGE.sobre.campus.infraestrutura}`;
  else if (topics.admissao.some(regex => regex.test(lowerMessage))) foundInfo = `## Processo de Admissão\n${IPIZ_KNOWLEDGE.admission.processo}\n**Requisitos Gerais:** ${IPIZ_KNOWLEDGE.admission.requisitos_gerais}\n**Documentos Comuns:** ${IPIZ_KNOWLEDGE.admission.documentos_comuns.join(', ')}. (Verifique edital oficial)`;
  else if (topics.contato.some(regex => regex.test(lowerMessage))) foundInfo = `## Contatos do IPIZ\n**Telefone:** ${IPIZ_KNOWLEDGE.contato.telefone}\n**Email:** ${IPIZ_KNOWLEDGE.contato.email}\n**Horário:** ${IPIZ_KNOWLEDGE.contato.horario}`;

  // Limita tamanho (redundante se MAX_CONTEXT_CHARS for grande, mas seguro)
  const maxIpizChars = Math.floor(MAX_CONTEXT_CHARS * 0.3);
  if (foundInfo && foundInfo.length > maxIpizChars) { foundInfo = foundInfo.substring(0, maxIpizChars) + '\n[...]'; }

  // Retorna formatado ou vazio
  return foundInfo ? `**INFORMAÇÕES INSTITUCIONAIS IPIZ:**\n${foundInfo}\n` : '';
}

/** Adiciona instruções sobre como usar o contexto dos manuais (se houver) */
async function enhanceWithManualContext(contextText, relevantManualTitles) {
  if (!contextText || relevantManualTitles.size === 0) return '';
  return `\n**DIRETRIZES PARA USAR MANUAIS:**\n1. Baseie sua resposta PRIMARIAMENTE nas informações dos manuais abaixo.\n2. Cite explicitamente o nome do manual ao usar sua informação (ex: "No manual 'Nome do Manual', ...").\n3. Se a pergunta for um procedimento, liste os passos claramente.\n`;
}


// --- Funções do Controlador ---

/** Salva mensagens no histórico */
async function saveChatMessages(userId, userMessage, modelReply) {
    if (!ChatMessage || !userId || !userMessage || !modelReply) { console.warn("[ChatCtrl] Dados insuficientes para salvar histórico."); return; }
    try { await ChatMessage.create([{ user: userId, role: 'user', content: userMessage }, { user: userId, role: 'model', content: modelReply }]); }
    catch (error) { console.error(`[ChatCtrl] Erro salvar histórico User ${userId}:`, error.message); }
}

/** Carrega e FORMATA histórico recente para enviar à IA */
async function loadFormattedHistoryForAI(userId) {
     if (!ChatMessage || !userId) return [];
     try {
         const limit = MAX_HISTORY_MESSAGES_PAIRS * 2;
         const recentMessages = await ChatMessage.find({ user: userId }).sort({ createdAt: 1 }).limit(limit).select('role content -_id').lean();
         const formattedHistory = []; let expectedRole = 'user';
         for (const msg of recentMessages) { const currentRole = msg.role === 'user' ? 'user' : 'model'; if (currentRole === expectedRole) { formattedHistory.push({ role: currentRole, parts: [{ text: msg.content }] }); expectedRole = (currentRole === 'user' ? 'model' : 'user'); } else { console.warn(`[ChatCtrl][HistoryFormat] Role ${currentRole} inesperada, pulando.`); expectedRole = currentRole === 'user' ? 'model' : 'user'; } }
         if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') { formattedHistory.shift(); }
         if (formattedHistory.length > MAX_HISTORY_MESSAGES_PAIRS * 2) { formattedHistory = formattedHistory.slice(-MAX_HISTORY_MESSAGES_PAIRS * 2); }
         return formattedHistory;
     } catch (error) { console.error(`[ChatCtrl] Erro carregar/formatar histórico IA User ${userId}:`, error); return []; }
}

// --- Controlador Principal (PRIORIZA IPIZ_KNOWLEDGE) ---
const processChatMessage = async (req, res, next) => {
    const { message } = req.body;
    const userId = req.user?._id;
    console.log(`--- [ChatCtrl] processChatMessage User: ${userId} ---`);
    if (!message?.trim()) return res.status(400).json({ message: 'Mensagem vazia.' });
    if (!aiModel) { console.error("[ChatCtrl] ERRO FATAL: Modelo IA não config!"); return res.status(503).json({ message: 'Serviço IA indisponível.' }); }
    if (!userId) { console.warn("[ChatCtrl] ID usuário ausente."); return res.status(401).json({ message: 'Usuário não autenticado.' }); }

    try {
        // *** PASSO 1: Tenta obter resposta DIRETA da base IPIZ ***
        const ipizDirectAnswer = await getRelevantIPIZInfo(message);

        // *** PASSO 2: Se encontrou resposta direta, RETORNA IMEDIATAMENTE ***
        if (ipizDirectAnswer) {
            console.log("[ChatCtrl] Resposta encontrada na base IPIZ Knowledge.");
            const finalReply = ipizDirectAnswer;
            await saveChatMessages(userId, message, finalReply); 
            return res.status(200).json({ reply: finalReply }); 
        }

        // *** PASSO 3: Se NÃO encontrou resposta direta, continua com RAG + IA ***
        console.log("[ChatCtrl] Nenhuma resposta direta IPIZ. Prosseguindo com RAG + IA...");
        let contextText = ""; let relevantManualTitles = new Set(); let totalContextLength = 0; let ragPerformed = false;

        // 3.1 Busca RAG nos manuais
        try {
            if (message.length > 3) {
                const stopWords = ['o','a','os','as','um','uma','de','do','da','dos','das','em','no','na','nos','nas','por','para','com','sem','sob','sobre','que','qual','quem','como','onde','quando','porque','se','mas','ou','e','foi','ser','ter','fazer','dizer','poder','ir','ver','etc','sobre','manual','arquivo','documento', 'ficheiro', 'ajuda', 'preciso', 'gostaria', 'saber', 'pode', 'me', 'ajudar'];
                const keywords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w)).map(w => w.replace(/[^a-z0-9áéíóúãõâêôç]/gi, ''));
                if (keywords.length > 0) {
                    ragPerformed = true; console.log(`[ChatCtrl] Keywords RAG: ${keywords.join(', ')}`);
                    const searchPattern = keywords.join('|');
                    const relevantFilesMeta = await FileMeta.find({ metadataComplete: true, $or: [ { title: { $regex: searchPattern, $options: 'i' } }, { description: { $regex: searchPattern, $options: 'i' } }, { disciplina: { $regex: searchPattern, $options: 'i' } } ] }).limit(MAX_FILES_FOR_RAG).lean();
                    if (relevantFilesMeta.length > 0) {
                        console.log(`[ChatCtrl] ${relevantFilesMeta.length} manuais relevantes encontrados.`);
                        for (const fileMeta of relevantFilesMeta) {
                            console.log(`[ChatCtrl] Extraindo texto de: "${fileMeta.title || fileMeta.originalName}"...`);
                            const fileText = await extractAndStoreText(fileMeta);
                            if (fileText && fileText.length > 10) {
                                 const chunk = `--- Contexto Manual "${fileMeta.title}":\n${fileText}\n---\n`; const estimatedChunkLength = chunk.length;
                                 if (totalContextLength + estimatedChunkLength <= MAX_CONTEXT_CHARS) { contextText += chunk; totalContextLength += estimatedChunkLength; relevantManualTitles.add(fileMeta.title); console.log(`[ChatCtrl] Contexto de "${fileMeta.title}" ADICIONADO. Total: ${totalContextLength} chars.`); }
                                 else { console.warn(`[ChatCtrl] Limite RAG (${MAX_CONTEXT_CHARS}) atingido.`); break; }
                             } else { console.log(`[ChatCtrl] Texto não útil para "${fileMeta.title}".`); }
                        }
                         if(!contextText) console.warn("[ChatCtrl] Manuais encontrados, mas contexto RAG vazio.");
                    } else console.log("[ChatCtrl] Nenhum manual relevante encontrado.");
                }
            }
        } catch (dbError) { console.error("[ChatCtrl] Erro busca RAG:", dbError.message); }

        // 3.2 Carrega Histórico
        const formattedHistory = await loadFormattedHistoryForAI(userId);
        const manualInstructions = contextText ? await enhanceWithManualContext(contextText, relevantManualTitles) : '';

        // 3.3 Monta Prompt para IA
        const finalPrompt = `Você é o Tutor Virtual IPIZ. Responda à pergunta.\n${manualInstructions}${contextText ? `\n**DOCUMENTOS CONSULTADOS (Use como base principal):**\n${contextText}\n` : "\n"}**PERGUNTA DO USUÁRIO:** ${message}\n\n**RESPOSTA:**`;
        console.log("[ChatCtrl] Enviando prompt final para IA...");

        // 3.4 Chama IA e Processa Resposta
        const chat = aiModel.startChat({ history: formattedHistory, generationConfig: { maxOutputTokens: 1200 }, safetySettings: defaultSafetySettings });
        const result = await chat.sendMessage(finalPrompt);
        const response = await result.response;
        let aiReply = ""; const blockReason = response.promptFeedback?.blockReason;

        if (blockReason) { console.warn(`[ChatCtrl] Resposta IA bloqueada: ${blockReason}`); aiReply = `Desculpe, não posso responder (${blockReason}).`; }
        else if (!response.text()) { console.warn("[ChatCtrl] IA retornou resposta vazia."); aiReply = "Desculpe, não gerei resposta."; }
        else {
             aiReply = response.text();
             if (relevantManualTitles.size > 0 && contextText) { aiReply += `\n\n*(Baseado em: ${Array.from(relevantManualTitles).join(', ')})*`; }
             await saveChatMessages(userId, message, aiReply); 
         }
        console.log(`[ChatCtrl] Resposta IA: "${aiReply.substring(0, 100)}..."`);
        res.status(200).json({ reply: aiReply });

    } catch (error) {
        console.error(`[ChatCtrl] Erro GERAL chat:`, error);
         if (error.message?.includes('API key not valid')) return res.status(401).json({ message: 'Erro IA: API Key inválida.'});
         if (error.message?.includes('quota')) return res.status(429).json({ message: 'Erro IA: Quota excedida.'});
         if (error.status === 400 && error.message?.includes('Invalid JSON payload')) { console.error("[ChatCtrl] ERRO 400 - Payload Inválido para Gemini:", error.errorDetails || error.message); return res.status(500).json({ message: 'Erro interno ao formatar dados para IA.' }); }
         if (error.response?.data?.error?.message) return res.status(error.response.status || 500).json({ message: `Erro IA: ${error.response.data.error.message}` });
        next(error); 
    }
};

// --- Controlador de Histórico ---
const getChatHistory = async (req, res, next) => {
    const userId = req.user?._id;
    const { q, page = 1, limit = HISTORY_PAGE_LIMIT, from, to } = req.query;
    console.log(`--- [ChatCtrl] getChatHistory User: ${userId}, Query:`, { q, page, limit, from, to });
    if (!userId) return res.status(401).json({ message: 'Não autenticado.' });

    try {
        const filter = { user: userId };
        if (from || to) filter.createdAt = {};
        if (from) { try { filter.createdAt.$gte = new Date(from); } catch (e) {} }
        if (to) { try { filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999)); } catch (e) {} }
        if (q?.trim()) filter.$text = { $search: q.trim() };

        const pageNum = Math.max(1, parseInt(page, 10)) || 1;
        const limitNum = Math.min(100, parseInt(limit, 10)) || HISTORY_PAGE_LIMIT;
        const skip = (pageNum - 1) * limitNum;

        const [messages, totalMessages] = await Promise.all([
            ChatMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).select('role content createdAt').lean(),
            ChatMessage.countDocuments(filter)
        ]);
        const totalPages = Math.ceil(totalMessages / limitNum);
        console.log(`[ChatCtrl] Histórico encontrado: ${messages.length}/${totalMessages} msgs (Pg: ${pageNum}/${totalPages})`);

        res.json({ messages, currentPage: pageNum, totalPages, totalMessages });
    } catch (error) { console.error("[ChatCtrl] Erro buscar histórico:", error); next(error); }
};

// Exporta as funções do controlador
module.exports = { processChatMessage, getChatHistory };