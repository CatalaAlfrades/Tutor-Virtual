const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const fileRoutes = require('./routes/fileRoutes');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

dotenv.config();

connectDB();

const app = express();

app.use(cors());

const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', 
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get('/api', (req, res) => res.send('API Tutor Virtual está rodando!')); 
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes); 

if (process.env.NODE_ENV === 'production') {

    const frontendBuildPath = path.join(__dirname, '../frontend/build'); 

    app.use(express.static(frontendBuildPath));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
    });
} else {
     app.get('/', (req, res) => {
         res.send('API rodando em modo de desenvolvimento. Acesse o frontend separadamente.');
     });
}

app.use(notFound);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando em modo ${process.env.NODE_ENV} na porta ${PORT}`));