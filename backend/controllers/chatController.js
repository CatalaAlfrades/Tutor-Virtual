// backend/controllers/chatController.js (VERSÃO COMPLETA COM RAG e HISTÓRICO)

const { aiModel, defaultSafetySettings } = require('../config/aiConfig');
const ChatHistory = require('../models/ChatHistory'); // Pode remover se não usar mais sessões
const ChatMessage = require('../models/ChatMessage'); // *** USA O NOVO MODELO ***
const FileMeta = require('../models/FileMeta');
const mongoose = require('mongoose');
const { extractAndStoreText } = require('./fileController'); // Importa função atualizada

const MAX_CONTEXT_CHARS = 10000; // Limite de caracteres RAG (ajustável)
const MAX_HISTORY_MESSAGES = 8;  // Máximo de mensagens (4 pares) para contexto IA (ajustável)
const HISTORY_PAGE_LIMIT = 50;   // Resultados por página na busca de histórico
const MAX_FILES_FOR_RAG = 3;     // Máximo de manuais a buscar para RAG

// --- Salva mensagens (User e Model) no histórico ---
async function saveChatMessages(userId, userMessage, modelReply) {
    if (!ChatMessage || !userId || !userMessage || !modelReply) {
        console.warn("[ChatCtrl] Dados insuficientes para salvar histórico."); return;
    }
    try {
        await ChatMessage.create([
            { user: userId, role: 'user', content: userMessage },
            { user: userId, role: 'model', content: modelReply }
        ]);
    } catch (error) { console.error(`[ChatCtrl] Erro salvar histórico User ${userId}:`, error); }
}

// --- Carrega e FORMATA histórico recente para enviar à IA ---
async function loadFormattedHistoryForAI(userId) {
     if (!ChatMessage || !userId) return [];
     try {
         const recentMessages = await ChatMessage.find({ user: userId })
             .sort({ createdAt: 1 }) // Mais antigas primeiro (ordem da conversa)
             .limit(MAX_HISTORY_MESSAGES) // Limita quantidade
             .select('role content -_id')
             .lean();
         // Formata para { role, parts: [{ text }] }
         const formattedHistory = recentMessages.map(msg => ({
             role: msg.role, parts: [{ text: msg.content }]
         }));
         return formattedHistory;
     } catch (error) { console.error(`[ChatCtrl] Erro carregar histórico IA User ${userId}:`, error); return []; }
}

// --- Controlador Principal do Chat ---
const processChatMessage = async (req, res, next) => {
    const { message } = req.body;
    const userId = req.user?._id;
    /*console.log(`--- [ChatCtrl] processChatMessage User: ${userId} ---`);*/
    if (!message?.trim()) return res.status(400).json({ message: 'Mensagem vazia.' });
    if (!aiModel) { console.error("[ChatCtrl] Modelo IA não config!"); return res.status(503).json({ message: 'Serviço IA indisponível.' }); }
    if (!userId) { console.warn("[ChatCtrl] ID usuário ausente."); return res.status(401).json({ message: 'Usuário não autenticado.' }); }

    try {
        let contextText = ""; let relevantManualTitles = new Set(); let totalContextLength = 0;

        // --- 1. Busca RAG ---
        try {
            /*console.log("[ChatCtrl] Iniciando busca RAG...");*/
            const stopWords = ['o','a','os','as','um','uma','de','do','da','dos','das','em','no','na','nos','nas','por','para','com','sem','sob','sobre','que','qual','quem','como','onde','quando','porque','se','mas','ou','e','foi','ser','ter','fazer','dizer','poder','ir','ver','etc','sobre','manual','arquivo','documento', 'ficheiro', 'ajuda', 'preciso', 'gostaria', 'saber'];
            const keywords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));
            /*console.log(`[ChatCtrl] Keywords RAG: ${keywords.join(', ') || 'Nenhuma'}`);*/

            if (keywords.length > 0) {
                const regexKeywords = keywords.map(k => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
                const relevantFilesMeta = await FileMeta.find({
                    metadataComplete: true, // Só busca em manuais finalizados
                    $or: [ { title: { $in: regexKeywords } }, { description: { $in: regexKeywords } }, { disciplina: { $in: regexKeywords } }]
                }).limit(MAX_FILES_FOR_RAG).lean(); // Limita busca

                if (relevantFilesMeta.length > 0) {
                    /*console.log(`[ChatCtrl] ${relevantFilesMeta.length} manuais relevantes encontrados.`);*/
                    for (const fileMeta of relevantFilesMeta) {
                        /*console.log(`[ChatCtrl] Tentando extrair texto de: "${fileMeta.title || fileMeta.originalName}" (ID: ${fileMeta._id})`);*/
                        const fileText = await extractAndStoreText(fileMeta); // Usa cache/extração

                        if (fileText && fileText.length > 10) {
                            /*console.log(`[ChatCtrl] Texto extraído de "${fileMeta.title}" (${fileText.length} chars). Verificando limite...`);*/
                            const chunk = `--- Contexto do Manual "${fileMeta.title}":\n${fileText}\n---\n`;
                             if (totalContextLength + chunk.length <= MAX_CONTEXT_CHARS) {
                                 contextText += chunk; totalContextLength += chunk.length; relevantManualTitles.add(fileMeta.title);
                                 /*console.log(`[ChatCtrl] Contexto de "${fileMeta.title}" ADICIONADO. Total: ${totalContextLength} chars.`);*/
                             } else { console.warn(`[ChatCtrl] Limite de contexto (${MAX_CONTEXT_CHARS}) atingido. Pulando "${fileMeta.title}".`); break; }
                         } else { /*console.log(`[ChatCtrl] Texto não extraído ou curto para "${fileMeta.title}".`);*/ }
                    }
                    if(!contextText) console.warn("[ChatCtrl] Manuais relevantes encontrados, mas contexto RAG está vazio.");
                } else console.log("");
            }
        } catch (dbError) { console.error("[ChatCtrl] Erro durante busca RAG:", dbError); }
        // --- Fim RAG ---

        // --- 2. Carrega Histórico FORMATADO para IA ---
        const formattedHistory = await loadFormattedHistoryForAI(userId);

        // --- 3. Inicia Chat com IA ---
        const chat = aiModel.startChat({ history: formattedHistory, generationConfig: { maxOutputTokens: 1024 }, safetySettings: defaultSafetySettings });

        // --- 4. Monta Prompt Final ---
        const finalPrompt = `Você é o Tutor Virtual IPIZ, assistente do Instituto Politécnico Industrial do Zango. Responda à pergunta do usuário.
${contextText ? `\nINFORMAÇÃO DOS MANUAIS (Use se relevante):\n${contextText}\n` : ""}
PERGUNTA: ${message}`;
        /*console.log("[ChatCtrl] Enviando prompt final para IA (início):", finalPrompt.substring(0, 300) + "...");*/

        // --- 5. Envia Mensagem e Processa Resposta ---
        const result = await chat.sendMessage(finalPrompt);
        const response = await result.response;
        let aiReply = ""; const blockReason = response.promptFeedback?.blockReason;

        if (blockReason) { console.warn(`[ChatCtrl] Resposta IA bloqueada: ${blockReason}`); aiReply = `Desculpe, não posso responder (${blockReason}).`; }
        else if (!response.text()) { console.warn("[ChatCtrl] IA retornou resposta vazia."); aiReply = "Desculpe, não gerei resposta."; }
        else {
             aiReply = response.text();
             if (relevantManualTitles.size > 0 && contextText) { aiReply += `\n\n*(Baseado em: ${Array.from(relevantManualTitles).join(', ')})*`; }
             // Salva a interação atual no histórico
              saveChatMessages(userId, message, aiReply).catch(histErr => console.error("Erro salvar mensagens:", histErr));
         }
        /*console.log(`[ChatCtrl] Resposta IA: "${aiReply.substring(0, 100)}..."`);*/
        res.status(200).json({ reply: aiReply }); // Envia apenas a resposta para o frontend

    } catch (error) { console.error(`[ChatCtrl] Erro GERAL chat:`, error); next(error); }
    finally {  }
};

// --- Controlador para buscar Histórico para Frontend ---
const getChatHistory = async (req, res, next) => {
    const userId = req.user?._id;
    const { q, page = 1, limit = HISTORY_PAGE_LIMIT, from, to } = req.query;
    /*console.log(`--- [ChatCtrl] getChatHistory User: ${userId} ---`);
    console.log("[ChatCtrl] Query Params:", { q, page, limit, from, to });*/
    if (!userId) return res.status(401).json({ message: 'Usuário não autenticado.' });

    try {
        const filter = { user: userId };
        if (from || to) filter.createdAt = {};
        if (from) { try { filter.createdAt.$gte = new Date(from); } catch (e) {} }
        if (to) { try { filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999)); } catch (e) {} }
        if (q?.trim()) { filter.$text = { $search: q.trim() }; }

        const pageNum = parseInt(page, 10) || 1; const limitNum = parseInt(limit, 10) || HISTORY_PAGE_LIMIT; const skip = (pageNum - 1) * limitNum;
        /*console.log("[ChatCtrl] Filtro MongoDB:", JSON.stringify(filter)); console.log("[ChatCtrl] Paginação:", { page: pageNum, limit: limitNum, skip });*/

        const messages = await ChatMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).select('role content createdAt').lean();
        const totalMessages = await ChatMessage.countDocuments(filter);
        const totalPages = Math.ceil(totalMessages / limitNum);
        /*console.log(`[ChatCtrl] Histórico encontrado: ${messages.length} msgs (Total: ${totalMessages}, Página: ${pageNum}/${totalPages})`);*/

        res.json({ messages, currentPage: pageNum, totalPages, totalMessages });
    } catch (error) { console.error("[ChatCtrl] Erro buscar histórico:", error); next(error); }
    finally { }
};

// Exporta AMBAS as funções
module.exports = { processChatMessage, getChatHistory };