const { aiModel, defaultSafetySettings } = require('../config/aiConfig');
const ChatHistory = require('../models/ChatHistory');
const ChatMessage = require('../models/ChatMessage');
const FileMeta = require('../models/FileMeta');
const mongoose = require('mongoose');
const { extractAndStoreText } = require('./fileController');

// Constantes
const MAX_CONTEXT_CHARS = 10000;
const MAX_HISTORY_MESSAGES = 8;
const HISTORY_PAGE_LIMIT = 50;
const MAX_FILES_FOR_RAG = 3;

// Base de conhecimento do IPIZ
const IPIZ_KNOWLEDGE = {
  sobre: {
    historia: "Fundado em 1998, o Instituto Politécnico Industrial do Zango (IPIZ) é referência em formação técnica em Luanda. Pioneiro no ensino profissionalizante industrial de Angola.",
    campus: {
      localizacao: "Zango 8000, Município de Calumbo, Icolo e Bengo",
      infraestrutura: "12 laboratórios, biblioteca e auditório para 400 pessoas",
    },
    cursos: [
      "Mecânica Industrial (Manhã/Tarde)",
      "Energias Renováveis (Manhã/Tarde)",
      "Automação Industrial (Manhã/Tarde)", 
      "Técnico de Informática (Manhã/Tarde)",
      "Bioquímica (Manhã/Tarde)"
    ]
  },
  admission: {
    processo: "Processo seletivo anual com prova de Matemática e Língua Portuguesa",
    documentos: ["Certificado de Habilitações", "BI", "Atestado Médico", "4 Fotos Tipo Passe"],
  },
  contato: {
    telefone: "+244 900 456 789",
    email: "secretaria@ipiz.ed.ao",
    horario: "Segunda a Sexta: 8:00h - 15:30h"
  }
};

// --- Funções Auxiliares ---
async function getRelevantIPIZInfo(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  let infoSections = [];

  // Detecção de tópicos melhorada
  const topics = {
    historia: /(hist[oó]ria|fundac[aã]o|origem)/i,
    cursos: /(curso|disciplina|matr[ií]cula|grade)/i,
    localizacao: /(onde fica|localiz(ação|ado)|endereço|campus|mapa)/i,
    contato: /(contato|telefone|email|hor[aá]rio|visitar)/i
  };

  if (topics.historia.test(lowerMessage)) {
    infoSections.push(`## História do IPIZ\n${IPIZ_KNOWLEDGE.sobre.historia}`);
  }

  if (topics.cursos.test(lowerMessage)) {
    const cursos = IPIZ_KNOWLEDGE.sobre.cursos.map(c => `- ${c}`).join('\n');
    infoSections.push(`## Cursos Oferecidos\n${cursos}\n\n**Duração:** 3-5 anos com estágio obrigatório`);
  }

  if (topics.localizacao.test(lowerMessage)) {
    infoSections.push(`## Localização do Campus\n**Endereço:** ${IPIZ_KNOWLEDGE.sobre.campus.localizacao}\n**Infraestrutura:** ${IPIZ_KNOWLEDGE.sobre.campus.infraestrutura}`);
  }

  if (topics.contato.test(lowerMessage)) {
    infoSections.push(`## Contatos\n**Telefone:** ${IPIZ_KNOWLEDGE.contato.telefone}\n**Email:** ${IPIZ_KNOWLEDGE.contato.email}\n**Horário:** ${IPIZ_KNOWLEDGE.contato.horario}`);
  }

  // Combina e limita o tamanho
  let combinedInfo = infoSections.join('\n\n');
  if (combinedInfo.length > MAX_CONTEXT_CHARS * 0.3) {
    combinedInfo = combinedInfo.substring(0, MAX_CONTEXT_CHARS * 0.3) + '\n[...]';
  }

  return combinedInfo ? `**INFORMAÇÕES INSTITUCIONAIS:**\n${combinedInfo}\n` : '';
}

async function enhanceWithManualContext(contextText, relevantManualTitles) {
  if (relevantManualTitles.size === 0) return '';
  
  return `
**DIRETRIZES PARA MANUAIS:**
1. Priorize informações dos documentos mencionados
2. Cite seções relevantes dos manuais
3. Converta diretrizes em passos acionáveis
4. Mantenha terminologia técnica original

`;
}

// --- Funções do Controlador ---
async function saveChatMessages(userId, userMessage, modelReply) {
    if (!ChatMessage || !userId || !userMessage || !modelReply) {
        console.warn("[ChatCtrl] Dados insuficientes para salvar histórico.");
        return;
    }
    try {
        await ChatMessage.create([
            { user: userId, role: 'user', content: userMessage },
            { user: userId, role: 'model', content: modelReply }
        ]);
    } catch (error) {
        console.error(`[ChatCtrl] Erro salvar histórico User ${userId}:`, error);
    }
}

async function loadFormattedHistoryForAI(userId) {
    if (!ChatMessage || !userId) return [];
    try {
        // 1. Busca mensagens ordenadas corretamente
        const recentMessages = await ChatMessage.find({ user: userId })
            .sort({ createdAt: -1 }) // Ordena do mais RECENTE para o mais ANTIGO
            .limit(MAX_HISTORY_MESSAGES)
            .select('role content createdAt -_id')
            .lean();

        // 2. Inverte a ordem para cronologia correta
        const orderedMessages = recentMessages.reverse();

        // 3. Filtra e formata o histórico
        const formattedHistory = [];
        let lastRole = null;
        
        for (const msg of orderedMessages) {
            // Garante alternância user/model
            if (msg.role !== lastRole) {
                formattedHistory.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                });
                lastRole = msg.role;
            }
        }

        // 4. Garante que começa com user
        if (formattedHistory[0]?.role === 'model') {
            formattedHistory.unshift({
                role: 'user',
                parts: [{ text: 'Inicie nossa conversa' }]
            });
        }

        return formattedHistory.slice(-MAX_HISTORY_MESSAGES); // Mantém apenas o histórico relevante

    } catch (error) {
        console.error(`[ChatCtrl] Erro carregar histórico IA User ${userId}:`, error);
        return [];
    }
}

// --- Controlador Principal ---
const processChatMessage = async (req, res, next) => {
    const { message } = req.body;
    const userId = req.user?._id;

    if (!message?.trim()) return res.status(400).json({ message: 'Mensagem vazia.' });
    if (!aiModel) return res.status(503).json({ message: 'Serviço IA indisponível.' });
    if (!userId) return res.status(401).json({ message: 'Usuário não autenticado.' });

    try {
        let contextText = "";
        let relevantManualTitles = new Set();
        let totalContextLength = 0;

        // --- 1. Busca RAG Melhorada ---
        if (message.length > 3) {
            const stopWords = ['o','a','os','as','um','uma','de','do','da','dos','das','em','no','na','nos','nas','por','para','com','sem','sob','sobre','que','qual','quem','como','onde','quando','porque','se','mas','ou','e','foi','ser','ter','fazer','dizer','poder','ir','ver','etc','sobre','manual','arquivo','documento', 'ficheiro', 'ajuda', 'preciso', 'gostaria', 'saber'];
            
            const keywords = message.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 2 && !stopWords.includes(w))
                .map(w => w.replace(/[^a-z0-9áéíóúãõâêôç]/gi, ''));

            if (keywords.length > 0) {
                const searchPattern = keywords.join('|');
                const relevantFilesMeta = await FileMeta.find({
                    metadataComplete: true,
                    $or: [
                        { title: { $regex: searchPattern, $options: 'i' } },
                        { description: { $regex: searchPattern, $options: 'i' } },
                        { disciplina: { $regex: searchPattern, $options: 'i' } },
                        { keywords: { $in: keywords } }
                    ]
                }).limit(MAX_FILES_FOR_RAG).lean();

                for (const fileMeta of relevantFilesMeta) {
                    const fileText = await extractAndStoreText(fileMeta);
                    if (fileText && fileText.length > 10) {
                        const chunk = `### [${fileMeta.title}]\n${fileText.substring(0, 3000)}\n---\n`;
                        if (totalContextLength + chunk.length <= MAX_CONTEXT_CHARS) {
                            contextText += chunk;
                            totalContextLength += chunk.length;
                            relevantManualTitles.add(fileMeta.title);
                        } else break;
                    }
                }
            }
        }

        // --- 2. Preparação Contextual ---
        const formattedHistory = await loadFormattedHistoryForAI(userId);
        const ipizContext = await getRelevantIPIZInfo(message);
        const manualInstructions = await enhanceWithManualContext(contextText, relevantManualTitles);

        // --- 3. Montagem do Prompt Otimizado ---
        const finalPrompt = `Você é o Tutor Virtual do IPIZ. Siga rigorosamente:

**REGRAS:**
1. PRIORIZE documentos técnicos quando disponíveis
2. Use dados institucionais como complemento
3. Seja específico com números e procedimentos
4. Formate respostas para fácil leitura

${manualInstructions}

${ipizContext}

${contextText ? `**DOCUMENTOS ENCONTRADOS:**\n${contextText}\n` : "**NENHUM DOCUMENTO RELEVANTE ENCONTRADO**\n"}

**PERGUNTA:** ${message}

**FORMATO DA RESPOSTA:**
- Título descritivo
- Listas numeradas para procedimentos
- Referências explícitas (ex: "Conforme Manual X, seção Y")
- Links de acesso quando aplicável`;

        // --- 4. Geração e Formatação da Resposta ---
        const chat = aiModel.startChat({ 
            history: formattedHistory,
            generationConfig: { maxOutputTokens: 1200 },
            safetySettings: defaultSafetySettings
        });

        const result = await chat.sendMessage(finalPrompt);
        const response = await result.response;
        let aiReply = response.text() || "Desculpe, não consegui gerar uma resposta.";

        // Garantia de referências
        if (relevantManualTitles.size > 0) {
            if (!aiReply.includes('Manual')) {
                aiReply += `\n\n(Referência: ${Array.from(relevantManualTitles).join(', ')})`;
            }
            aiReply = `📚 **Documentos Consultados:** ${Array.from(relevantManualTitles).join(', ')}\n\n${aiReply}`;
        } else if (ipizContext) {
            aiReply += `\n\n_Informações institucionais atualizadas em ${new Date().toLocaleDateString('pt-AO')}_`;
        }

        // --- 5. Persistência e Retorno ---
        await saveChatMessages(userId, message, aiReply);
        res.status(200).json({ reply: aiReply });

    } catch (error) { 
        console.error(`[ChatCtrl] Erro:`, error); 
        next(error); 
    }
};

// --- Controlador de Histórico (inalterado) ---
const getChatHistory = async (req, res, next) => {
    const userId = req.user?._id;
    const { q, page = 1, limit = HISTORY_PAGE_LIMIT, from, to } = req.query;
    
    if (!userId) return res.status(401).json({ message: 'Usuário não autenticado.' });

    try {
        const filter = { user: userId };
        if (from || to) filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
        if (q?.trim()) filter.$text = { $search: q.trim() };

        const pageNum = Math.max(1, parseInt(page, 10)) || 1;
        const limitNum = Math.min(100, parseInt(limit, 10)) || HISTORY_PAGE_LIMIT;
        const skip = (pageNum - 1) * limitNum;

        const [messages, totalMessages] = await Promise.all([
            ChatMessage.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .select('role content createdAt')
                .lean(),
            ChatMessage.countDocuments(filter)
        ]);

        res.json({
            messages,
            currentPage: pageNum,
            totalPages: Math.ceil(totalMessages / limitNum),
            totalMessages
        });
    } catch (error) {
        console.error("[ChatCtrl] Erro buscar histórico:", error);
        next(error);
    }
};

module.exports = { processChatMessage, getChatHistory };