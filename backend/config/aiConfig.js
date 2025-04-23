const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY não definida no .env. Funcionalidade de IA estará desabilitada.");
}

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

const aiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null; 

module.exports = { aiModel };
