// backend/controllers/fileController.js (VERSÃO COMPLETA E CORRIGIDA)

const mongoose = require('mongoose');
const FileMeta = require('../models/FileMeta'); // Usa o modelo ATUALIZADO
const fs = require('fs');
const path = require('path');
const PdfParse = require('pdf-parse');
const mammoth = require('mammoth'); // Certifique-se: npm install mammoth

const UPLOAD_DIR = path.join(__dirname, '..', 'storage', 'uploads');
const fileTextCache = new Map(); // Cache em memória para texto extraído
console.log("Gerenciador de Arquivos Funcionando");

// --- Função de Extração Aprimorada (PDF, DOCX, TXT) ---
async function extractAndStoreText(fileMeta) {
    if (!fileMeta?.serverFilename || !fileMeta?.mimetype) {
        console.warn("[ExtractText] Dados insuficientes para extração:", fileMeta); return null;
    }
    const serverFilename = fileMeta.serverFilename;
    const filePath = path.join(UPLOAD_DIR, serverFilename);

    if (fileTextCache.has(serverFilename)) return fileTextCache.get(serverFilename); // Retorna do cache se existir
    /*console.log(`[ExtractText] Iniciando extração para: ${serverFilename}, Tipo: ${fileMeta.mimetype}`);*/

    try {
        if (!fs.existsSync(filePath)) { console.error(`[ExtractText] Arquivo físico não existe: ${filePath}`); return null; }
        const dataBuffer = fs.readFileSync(filePath);
        if (dataBuffer.length === 0) { console.warn(`[ExtractText] Arquivo vazio: ${serverFilename}`); fileTextCache.set(serverFilename, ""); return ""; }

        let extractedText = null;
        if (fileMeta.mimetype === 'application/pdf') {
            try { const data = await PdfParse(dataBuffer); extractedText = data?.text || ''; }
            catch (pdfError) { console.error(`[ExtractText] Erro pdf-parse ${serverFilename}: ${pdfError.message}`); extractedText = null; }
        } else if (fileMeta.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try { const result = await mammoth.extractRawText({ buffer: dataBuffer }); extractedText = result?.value || ''; }
            catch (docxError) { console.error(`[ExtractText] Erro mammoth (docx) ${serverFilename}: ${docxError.message}`); extractedText = null; }
        } else if (fileMeta.mimetype.startsWith('text/')) {
            extractedText = dataBuffer.toString('utf-8');
        } else { console.warn(`[ExtractText] Tipo não suportado para extração: ${fileMeta.mimetype}`); }

        if (extractedText) {
            extractedText = extractedText.replace(/\s\s+/g, ' ').replace(/\n\n+/g, '\n').trim();
            const MAX_CHARS = 15000; // Limite (ajuste)
            if (extractedText.length > MAX_CHARS) { extractedText = extractedText.substring(0, MAX_CHARS); console.warn(`[ExtractText] Texto truncado para ${MAX_CHARS} chars.`); }
            fileTextCache.set(serverFilename, extractedText); // Guarda no cache
            /*console.log(`[ExtractText] Texto extraído e cacheado para ${serverFilename} (${extractedText.length} chars).`);*/
            return extractedText;
        } else { fileTextCache.set(serverFilename, ""); return ""; } // Cache vazio se falhar ou não suportado
    } catch (error) {
        console.error(`[ExtractText] Erro GERAL ao processar ${filePath}:`, error);
        fileTextCache.set(serverFilename, ""); // Cache como erro
        return null; // Indica falha
    }
}

// --- Controlador de Upload (Apenas cria registro inicial - RESPOSTA CORRIGIDA) ---
const uploadFileAndCreateMeta = async (req, res, next) => {
    /*console.log("--- [FileCtrl] uploadFileAndCreateMeta ---");*/
    if (!req.file) { console.error("[FileCtrl] req.file ausente."); return res.status(400).json({ message: 'Arquivo não recebido.' }); }
    try {
        const { originalname, filename: serverFilename, mimetype, size } = req.file;
        const newFileMeta = new FileMeta({
            originalName: originalname,
            serverFilename: serverFilename,
            mimetype: mimetype,
            size: size,
            uploadedBy: req.user._id // Garante que req.user existe (middleware protect)
            // title, description, disciplina, metadataComplete ficam vazios/default
        });
        const savedMeta = await newFileMeta.save();
        /*console.log(`[FileCtrl] Metadados iniciais salvos ID: ${savedMeta._id}`);*/

        // ---------- INÍCIO DA CORREÇÃO ----------
        // Ajusta a resposta para corresponder ao que o frontend espera (uploadResult.file.id)
        res.status(201).json({
            message: 'Arquivo enviado! Adicione os detalhes.', // Mensagem pode ser ajustada
            file: { // **ANINHAMENTO CORRETO**
                id: savedMeta._id,
                originalName: savedMeta.originalName
            }
        });
        // ---------- FIM DA CORREÇÃO ----------

    } catch (error) {
        console.error("[FileCtrl] Erro salvar meta inicial:", error);
        if (req.file?.path && fs.existsSync(req.file.path)) {
             fs.unlink(req.file.path, (err) => { if (err) console.error("Erro ao limpar arquivo órfão:", err); else console.log("Arquivo órfão removido:", req.file.filename); });
         }
        next(error);
    }
};

// --- Controlador GET /files (Retorna dados completos para aluno/professor) ---
const getFilesMeta = async (req, res, next) => {
    /*console.log("--- [FileCtrl] getFilesMeta ---");*/
    try {
        // Busca arquivos baseados no tipo de usuário
        let query = {};
        if (req.user.tipo === 'aluno') {
            // Aluno só vê arquivos completos
            query = { metadataComplete: true };
            /*console.log("[FileCtrl] Buscando arquivos finalizados (para Aluno)...");*/
        } else if (req.user.tipo === 'professor') {
            // Professor vê TODOS os seus arquivos (completos ou não)
             query = { uploadedBy: req.user._id }; // Filtra pelo ID do professor logado
            /*console.log(`[FileCtrl] Buscando TODOS os arquivos do Professor ID: ${req.user._id}...`);*/
        } else {
             // Caso inesperado, retorna lista vazia
             console.warn(`[FileCtrl] Tipo de usuário desconhecido ou inválido: ${req.user.tipo}`);
             return res.status(200).json([]);
         }


        const files = await FileMeta.find(query)
            .sort({ createdAt: -1 }) // Ordena por mais recente primeiro (ou { disciplina: 1, title: 1 } para aluno)
            .select('title description disciplina uploadedBy originalName mimetype size createdAt metadataComplete') // Seleciona campos
            .populate('uploadedBy', 'id nome') // *** POPULATE ESSENCIAL ***
            .lean();

        /*console.log(`[FileCtrl] Query encontrou ${files.length} arquivos.`);*/

        const fileInfos = files.map(file => ({
            id: file._id,
            title: file.title, // Pode ser null se metadataComplete for false
            description: file.description || '',
            disciplina: file.disciplina || null,
            uploader: file.uploadedBy ? { id: file.uploadedBy._id, nome: file.uploadedBy.nome || 'Desconhecido' } : null,
            originalName: file.originalName,
            mimeType: file.mimetype,
            size: file.size,
            uploadDate: file.createdAt,
            metadataComplete: file.metadataComplete // Envia status para o frontend
        }));

        res.status(200).json(fileInfos);
    } catch (error) { console.error("[FileCtrl] Erro ao listar arquivos:", error); next(error); }
};


// --- Controlador PATCH /files/meta/:id (Atualiza título, descrição E DISCIPLINA) ---
const updateFileMeta = async (req, res, next) => {
    const metaIdString = req.params.id;
    const { title, description, disciplina } = req.body;
    /*console.log(`--- [FileCtrl] updateFileMeta (ID: ${metaIdString}) ---`);*/
    console.log("[FileCtrl] Recebido:", { title, description, disciplina });

    if (!mongoose.Types.ObjectId.isValid(metaIdString)) return res.status(400).json({ message: 'ID inválido.' });
    if (!title || title.trim() === "") return res.status(400).json({ message: 'Título é obrigatório.' });

    try {
        const fileMeta = await FileMeta.findById(metaIdString);
        if (!fileMeta) return res.status(404).json({ message: 'Metadados não encontrados.' });

        // *** Verifica Permissão: Só o dono pode editar ***
        if (String(fileMeta.uploadedBy) !== String(req.user._id)) {
             console.warn(`[FileCtrl] Usuário ${req.user._id} tentando editar arquivo de ${fileMeta.uploadedBy}.`);
             return res.status(403).json({ message: 'Permissão negada para editar este arquivo.' });
         }

        fileMeta.title = title.trim();
        fileMeta.description = description ? description.trim() : "";
        fileMeta.disciplina = disciplina ? disciplina.trim() : null;
        fileMeta.metadataComplete = true; // Marca como completo ao salvar detalhes
        /*console.log("[FileCtrl] Atualizando metadado:", fileMeta);*/

        const updatedMeta = await fileMeta.save();
        /*console.log(`[FileCtrl] Metadado SALVO ID: ${updatedMeta._id}`);*/

        // Tenta extrair texto em background
        extractAndStoreText(updatedMeta).catch(err => console.error(`[FileCtrl] Falha extração background ID ${updatedMeta._id}:`, err));

        res.status(200).json({ message: 'Metadados atualizados com sucesso.' });
   } catch (error) { console.error(`[FileCtrl] ERRO update metadados ID ${metaIdString}:`, error); next(error); }
};


// --- Controlador para Servir Arquivo (View/Download) ---
const serveFile = async (req, res, next) => {
    const metaIdString = req.params.id;
    /*console.log(`--- [FileCtrl] serveFile (ID: ${metaIdString}) ---`);*/
    if (!mongoose.Types.ObjectId.isValid(metaIdString)) { console.warn("[FileCtrl][Serve] ID inválido."); return res.status(400).send('ID inválido.'); }

    try {
        const fileMeta = await FileMeta.findById(metaIdString);
        if (!fileMeta?.serverFilename) { console.warn("[FileCtrl][Serve] Metadado não encontrado."); return res.status(404).send('Arquivo não encontrado.'); }

        // Permissão: User logado PODE acessar SE completo. Se não completo, SÓ o uploader.
        if (!fileMeta.metadataComplete && String(fileMeta.uploadedBy) !== String(req.user?._id)) {
             console.warn(`[FileCtrl][Serve] Acesso NEGADO a arquivo não finalizado ${metaIdString} por ${req.user?._id}.`);
             return res.status(403).send('Acesso negado.');
         }
         /*console.log(`[FileCtrl][Serve] Permissão OK para ${req.user?.tipo} ${req.user?._id}.`);*/

        const filePath = path.join(UPLOAD_DIR, fileMeta.serverFilename);
        if (!fs.existsSync(filePath)) { console.error(`[FileCtrl][Serve] ARQUIVO FÍSICO NÃO ENCONTRADO: ${filePath}`); return res.status(404).send('Erro: Arquivo não encontrado no servidor.'); }
        /*console.log(`[FileCtrl][Serve] Enviando arquivo: ${filePath}`);*/

        // Usa res.download para lidar com headers e streaming
        res.download(filePath, fileMeta.originalName, (err) => {
            if (err && !res.headersSent) { console.error(`[FileCtrl][Serve] Erro ANTES envio:`, err); next(err); }
            else if (err) { console.error(`[FileCtrl][Serve] Erro DURANTE envio:`, err.code || err.message); }
            else { /*console.log(`[FileCtrl][Serve] Download iniciado/completo: ${fileMeta.originalName}`);*/ }
        });

    } catch (error) { console.error("[FileCtrl][Serve] Erro GERAL:", error); next(error); }
};

// --- Controlador para Deletar Arquivo ---
const deleteFileAndMeta = async (req, res, next) => {
    const metaIdString = req.params.id;
    /*console.log(`--- [FileCtrl] deleteFileAndMeta (ID: ${metaIdString}) ---`);*/
    if (!mongoose.Types.ObjectId.isValid(metaIdString)) return res.status(400).json({ message: 'ID inválido.' });

    try {
        const fileMeta = await FileMeta.findById(metaIdString);
        if (!fileMeta) return res.status(404).json({ message: 'Arquivo não encontrado.' });

        // *** Verifica Permissão: Só o dono pode deletar ***
        if (String(fileMeta.uploadedBy) !== String(req.user._id)) {
             console.warn(`[FileCtrl][Delete] Usuário ${req.user._id} tentando deletar arquivo de ${fileMeta.uploadedBy}.`);
             return res.status(403).json({ message: 'Permissão negada para deletar este arquivo.' });
         }
         /*console.log(`[FileCtrl][Delete] Permissão OK. Deletando ${fileMeta.serverFilename}`);*/

        // 1. Deleta registro DB
        await FileMeta.deleteOne({ _id: fileMeta._id });
        /*console.log(`[FileCtrl][Delete] Metadado ${metaIdString} deletado.`);*/

        // 2. Deleta arquivo físico
        const filePath = path.join(UPLOAD_DIR, fileMeta.serverFilename);
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (unlinkErr) => { if (unlinkErr) console.error(`[FileCtrl][Delete] Erro ao remover ${filePath}:`, unlinkErr); else console.log(`[FileCtrl][Delete] Arquivo físico removido: ${filePath}`); });
        } else console.warn(`[FileCtrl][Delete] Arquivo físico ${filePath} não encontrado.`);

        // 3. Remove do cache
        if (fileMeta.serverFilename && fileTextCache.has(fileMeta.serverFilename)) { fileTextCache.delete(fileMeta.serverFilename); console.log(`[FileCtrl][Delete] Cache limpo: ${fileMeta.serverFilename}`); }

        res.status(200).json({ message: 'Arquivo deletado com sucesso.' });

    } catch (error) { console.error("[FileCtrl][Delete] Erro:", error); next(error); }
};

// --- Get File Meta By ID (Não precisa mudar - usado internamente talvez?) ---
const getFileMetaById = async (req, res, next) => {
    const metaIdString = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(metaIdString)) return res.status(400).json({ message: 'ID inválido.' });
    try {
        const fileMeta = await FileMeta.findById(metaIdString).select('-serverFilename -__v'); // Não expõe nome do servidor
        if (!fileMeta) return res.status(404).json({ message: 'Metadados não encontrados.' });
        // Verifica permissão (igual a serveFile)
        if (!fileMeta.metadataComplete && String(fileMeta.uploadedBy) !== String(req.user?._id)) { return res.status(403).json({ message: 'Acesso negado.' }); }
        res.status(200).json(fileMeta);
    } catch (error) { console.error("[FileCtrl] Erro getFileMetaById:", error); next(error); }
};

// Exporta funções atualizadas
module.exports = {
    uploadFileAndCreateMeta,
    getFilesMeta,
    updateFileMeta,
    serveFile, // Função unificada para view/download
    getFileMetaById, // Mantido caso seja usado em outro lugar
    deleteFileAndMeta,
    extractAndStoreText // Exporta para uso no chatController
};