const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const path = require('path');

// Carregar variáveis de ambiente
dotenv.config();

// Conectar ao banco de dados
connectDB();

// Inicializar Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rotas
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const fileRoutes = require('./routes/fileRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/admin', require('./routes/professorRoutes'));
// app.use('/api/admin', adminAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
//app.use('/api/admin', adminRoutes);

// Inicializar admin
const { createInitialAdmin } = require('./controllers/authController');
createInitialAdmin();

// Servir arquivos estáticos em produção
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../frontend', 'index.html'));
    });
}

// Middleware de tratamento de erros
app.use(errorHandler);

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});