// backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs'); // *** IMPORTAÇÃO ADICIONADA ***

// Define onde salvar e como nomear os arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'storage', 'uploads');
        // Cria o diretório se não existir (garante que o destino é válido)
        try {
            fs.mkdirSync(uploadPath, { recursive: true });
             cb(null, uploadPath); // Informa ao multer onde salvar
        } catch (error) {
             console.error("Erro ao criar diretório de upload:", uploadPath, error);
             cb(error); // Passa o erro para o multer/Express
        }
    },
    filename: function (req, file, cb) {
        // Gera um nome de arquivo único para evitar conflitos e problemas com caracteres especiais
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname).toLowerCase(); // Pega extensão em minúsculo
        const safeFilename = uniqueSuffix + extension; // Nome seguro: hash + extensão
        cb(null, safeFilename);
    }
});

// Define filtros de arquivo (opcional - atualmente aceita tudo)
const fileFilter = (req, file, cb) => {
    console.log(`[UploadMiddleware] Recebendo arquivo: ${file.originalname}, Tipo: ${file.mimetype}`);
    // TODO: Adicionar validação de mimetype se necessário
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não permitido!'), false);
    }
    cb(null, true); // Aceita qualquer arquivo por enquanto
};

// Cria a instância do Multer com storage, filtro e limites
const upload = multer({
     storage: storage,
     fileFilter: fileFilter,
     limits: {
         fileSize: 1024 * 1024 * 30 // Limite de 30MB (ajuste conforme necessário)
     }
 });

module.exports = upload;