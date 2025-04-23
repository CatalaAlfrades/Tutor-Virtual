// routes/fileRoutes.js (Exemplo)
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Middleware de autenticação JWT
const upload = require('../middleware/uploadMiddleware'); // Middleware do Multer
const {
    uploadFileAndCreateMeta,
    getFilesMeta,
    updateFileMeta,
    serveFile, // Função unificada
    getFileMetaById,
    deleteFileAndMeta
} = require('../controllers/fileController');

// Rota de Upload (POST): Protegida, usa Multer ANTES do controller
router.post('/upload', protect, upload.single('file'), uploadFileAndCreateMeta);

// Rota para Listar Arquivos Finalizados (GET): Protegida
router.get('/', protect, getFilesMeta);

// Rota para Atualizar Metadados (PATCH): Protegida
router.patch('/meta/:id', protect, updateFileMeta); // Note o /meta/

// Rota para Obter Metadados de UM arquivo (GET): Protegida
router.get('/meta/:id', protect, getFileMetaById); // Note o /meta/

// Rota para DELETAR arquivo e metadados (DELETE): Protegida
router.delete('/:id', protect, deleteFileAndMeta);

// Rota para SERVIR o arquivo (View/Download) (GET): Protegida
// O frontend chama essa rota e o navegador decide se mostra inline ou baixa baseado no Content-Type/Disposition
router.get('/download/:id', protect, serveFile); // Usa a função serveFile (modo download implícito por res.download)
// Opcional: rota separada para view se quiser forçar inline
// router.get('/view/:id', protect, (req, res, next) => serveFile(req, res, next, true)); // Passa true para inline

module.exports = router;