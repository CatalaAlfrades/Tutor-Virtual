=============================================
 Tutor Virtual IPIZ - Guia de Uso Local
=============================================

Bem-vindo ao Tutor Virtual IPIZ! Este guia ajudará você a configurar e executar
o projeto em sua máquina local para desenvolvimento ou teste.

O projeto consiste em duas partes principais:
1.  **Backend:** Uma API Node.js/Express que lida com a lógica, autenticação,
    interação com a IA (Google Gemini), gerenciamento de arquivos e comunicação
    com o banco de dados MongoDB.
2.  **Frontend:** Uma interface web construída com HTML, CSS e JavaScript puro,
    permitindo que alunos e professores interajam com o sistema.

--------------------
1. Pré-requisitos
--------------------

Antes de começar, certifique-se de ter o seguinte software instalado em seu sistema:

*   **Node.js e npm:** Essencial para executar o backend e instalar dependências.
    *   **Versão Recomendada:** Use uma versão LTS (Long Term Support) do Node.js (v18, v20 ou v22 são boas opções). Versões muito recentes (ímpares) podem ter instabilidades.
    *   **Download:** [https://nodejs.org/](https://nodejs.org/) (O npm é instalado junto com o Node.js).
    *   **Verificação:** Abra seu terminal ou prompt de comando e digite:
        ```bash
        node -v
        npm -v
        ```
        Você deve ver os números das versões.

*   **MongoDB:** O banco de dados usado para armazenar usuários, metadados de arquivos e histórico (opcional). Você tem algumas opções:
    *   **MongoDB Community Server (Local):** Instalar diretamente em sua máquina.
        *   **Download:** [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
        *   Siga as instruções de instalação para seu sistema operacional. Certifique-se de que o serviço MongoDB (`mongod`) esteja rodando.
    *   **Docker:** Se você usa Docker, pode facilmente rodar uma instância do MongoDB em um container.
    *   **MongoDB Atlas (Nuvem):** Criar uma conta gratuita no MongoDB Atlas ([https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)) e usar a string de conexão fornecida por eles. É uma boa opção se não quiser instalar localmente.
    *   **Verificação (Local):** Se instalou localmente, tente rodar `mongod --version` ou `mongo --version` (ou `mongosh --version` nas versões mais recentes) no terminal.

*   **Git (Opcional, mas Recomendado):** Para clonar o repositório do projeto. Se você baixou o código como um arquivo ZIP, pode pular isso.
    *   **Download:** [https://git-scm.com/downloads](https://git-scm.com/downloads)

*   **Editor de Código:** Qualquer editor de texto serve, mas VS Code ([https://code.visualstudio.com/](https://code.visualstudio.com/)) é recomendado, especialmente pela extensão "Live Server" para o frontend.

*   **Navegador Web:** Chrome, Firefox, Edge, etc.

*   **Terminal / Prompt de Comando:** Para executar os comandos de instalação e inicialização.

--------------------
2. Configuração do Projeto
--------------------

1.  **Obtenha o Código:**
    *   **Usando Git (Recomendado):** Abra seu terminal, navegue até o diretório onde deseja salvar o projeto e clone o repositório:
        ```bash
        git clone <URL_DO_REPOSITORIO_GIT> Tutor-Virtual
        cd Tutor-Virtual
        ```
        (Substitua `<URL_DO_REPOSITORIO_GIT>` pela URL correta).
    *   **Usando ZIP:** Baixe o arquivo ZIP do projeto e extraia-o em um local de sua preferência. Abra o terminal e navegue até a pasta extraída (ex: `cd Downloads/Tutor-Virtual`).

2.  **Configure o Backend:**
    *   **Navegue até a pasta `backend`:**
        ```bash
        cd backend
        ```
    *   **Crie e Configure o Arquivo de Ambiente (`.env`):** Este arquivo guarda informações sensíveis como senhas e chaves de API.
        *   Procure por um arquivo chamado `.env.example` na pasta `backend`. Se ele existir, renomeie-o para `.env`.
        *   Se não existir, crie um novo arquivo chamado `.env` na pasta `backend`.
        *   Abra o arquivo `.env` no seu editor de código e preencha as seguintes variáveis, substituindo os valores de exemplo pelos seus reais:

            ```env
            # Ambiente (geralmente development para local)
            NODE_ENV=development

            # Porta para o servidor backend rodar
            PORT=5000

            # String de Conexão MongoDB
            # - Se local: mongodb://localhost:27017/tutor_virtual (ou o nome do seu DB)
            # - Se Atlas: Copie a string de conexão do site do Atlas (substitua <password>)
            MONGO_URI=mongodb://localhost:27017/tutor_virtual

            # Segredo JWT (IMPORTANTE: Use um gerador de senhas fortes online)
            JWT_SECRET=crie_uma_senha_muito_longa_e_aleatoria_aqui

            # Chave de API do Google Gemini (Obtenha em https://aistudio.google.com/app/apikey)
            GEMINI_API_KEY=SUA_API_KEY_REAL_AQUI

            # URL onde o SEU SERVIDOR FRONTEND irá rodar (Veja Passo 3)
            # IMPORTANTE: Sem barra no final! Ex: http://127.0.0.1:5500
            FRONTEND_URL=http://127.0.0.1:5501 # Ajuste esta porta depois!
            ```
        *   **IMPORTANTE:** Nunca envie o arquivo `.env` para repositórios Git públicos. Ele já deve estar listado no arquivo `.gitignore`.

    *   **Instale as Dependências do Backend:** Ainda dentro da pasta `backend`, execute:
        ```bash
        npm install
        ```
        *   **Se ocorrer erro `ERESOLVE`:** Isso indica conflitos de versão entre pacotes. Tente usar a flag `--legacy-peer-deps`:
            ```bash
            npm install --legacy-peer-deps
            ```
        *   Aguarde a instalação terminar. Você verá uma pasta `node_modules` ser criada.

3.  **Configure o Frontend:**
    *   O frontend (na pasta `frontend/`) usa apenas HTML, CSS e JavaScript puro. **Não** há necessidade de rodar `npm install` dentro da pasta `frontend` com a estrutura atual.
    *   **Apenas um passo crucial:** Você precisará servir os arquivos do frontend usando um servidor web local para evitar problemas de CORS e caminhos `file:///`. Veja a seção "Executando a Aplicação".

-----------------------------
3. Executando a Aplicação
-----------------------------

Você precisa iniciar **dois** servidores: um para o backend e um para o frontend.

1.  **Inicie o Servidor Backend:**
    *   Abra um **terminal**.
    *   Navegue até a pasta `backend`: `cd /caminho/para/Tutor-Virtual/backend`
    *   Execute o comando de desenvolvimento:
        ```bash
        npm run dev
        ```
        (Este comando usa `nodemon`, que reinicia o servidor automaticamente quando você salva alterações nos arquivos do backend).
    *   **Observe a saída:** Você deve ver mensagens como:
        *   `[nodemon] starting \`node server.js\``
        *   `Diretório de uploads configurado em: ...`
        *   `Servidor rodando em modo development na porta 5000`
        *   `MongoDB Conectado: ...`
    *   **Mantenha este terminal aberto!** O backend precisa continuar rodando.

2.  **Inicie o Servidor Frontend (Escolha UMA opção):**
    *   **Opção A: Live Server (VS Code - Recomendado):**
        1.  Certifique-se de ter a extensão "Live Server" instalada no VS Code.
        2.  No VS Code, abra **exclusivamente** a pasta `frontend` (`Arquivo > Abrir Pasta... > selecione 'frontend'`).
        3.  Na barra lateral do VS Code, encontre um arquivo HTML principal (como `index.html` ou `page/login.html`).
        4.  Clique com o botão direito no arquivo e selecione "Open with Live Server".
        5.  Seu navegador padrão abrirá automaticamente com uma URL tipo `http://127.0.0.1:5500/` ou `http://localhost:5501/` (a porta pode variar). **Anote esta URL e porta!**
    *   **Opção B: http-server (Node.js):**
        1.  Abra um **NOVO terminal** (diferente do terminal do backend).
        2.  Instale o http-server globalmente (se ainda não o fez): `npm install -g http-server`
        3.  Navegue **exatamente** para a pasta `frontend`: `cd /caminho/para/Tutor-Virtual/frontend`
        4.  Inicie o servidor: `http-server -c-1 -p 5501` (Use `-p` para escolher uma porta, ex: 5501. `-c-1` desabilita cache).
        5.  O terminal mostrará as URLs disponíveis, como `http://127.0.0.1:5501`. **Anote esta URL e porta!**
        6.  **Mantenha este segundo terminal aberto!**

3.  **Configure o CORS no Backend (IMPORTANTE):**
    *   Pegue a URL e porta que o seu servidor frontend está usando (anotada no passo anterior, ex: `http://127.0.0.1:5501`).
    *   Volte ao arquivo `backend/.env`.
    *   Edite a linha `FRONTEND_URL=` para que ela corresponda **exatamente** à URL do seu frontend:
        ```env
        FRONTEND_URL=http://127.0.0.1:5501
        ```
    *   **Salve** o arquivo `.env`.
    *   Vá para o **terminal onde o backend está rodando**. Pressione `Ctrl + C` para pará-lo.
    *   **Reinicie o backend:**
        ```bash
        npm run dev
        ```
        Isso é crucial para que o backend leia a nova `FRONTEND_URL`.

-----------------------------
4. Acessando a Aplicação
-----------------------------

*   Abra seu navegador web.
*   Digite a URL fornecida pelo seu **servidor frontend** (ex: `http://127.0.0.1:5501`).
*   Você deve ver a página inicial (`index.html`).
*   Navegue para as páginas de Login ou Cadastro (`/page/login.html`, `/page/cadastro.html`) para começar a usar.

-----------------------------
5. Parando a Aplicação
-----------------------------

1.  Vá para o terminal onde o **backend** está rodando e pressione `Ctrl + C`.
2.  Vá para o terminal onde o **frontend** está rodando (se usou `http-server` ou Python) e pressione `Ctrl + C`.
3.  Se usou o "Live Server" do VS Code, geralmente há um botão na barra de status do VS Code para pará-lo ("Port : 5501 Clicking to stop...") ou você pode simplesmente fechar o VS Code.

-----------------------------
6. Solução de Problemas Comuns
-----------------------------

*   **Erro `ERR_CONNECTION_REFUSED` no Navegador:** O servidor backend (na porta 5000) não está rodando ou não está acessível. Verifique o terminal do backend.
*   **Erro de CORS (Bloqueado por Política...):** A `FRONTEND_URL` no arquivo `backend/.env` não corresponde exatamente à URL que o servidor frontend está usando, OU você não reiniciou o backend após alterar o `.env`.
*   **Erro 404 (Not Found) para CSS/JS/Imagens:** O servidor frontend provavelmente foi iniciado na pasta errada (deve ser iniciado *dentro* da pasta `frontend`). Verifique também os caminhos relativos (`../`) nos arquivos HTML.
*   **Erro "Não autorizado, token não fornecido":** O token JWT não foi salvo corretamente no login ou não está sendo enviado nas requisições para rotas protegidas. Verifique o Local Storage do navegador e os logs da função `Api._request` no console do navegador.
*   **Erro de Conexão MongoDB:** Verifique se o serviço MongoDB está rodando localmente ou se a string de conexão `MONGO_URI` no `.env` está correta (incluindo usuário/senha se usar Atlas).
*   **Erro `ERESOLVE` durante `npm install`:** Use `npm install --legacy-peer-deps`.
*   **Menu Hambúrguer/Sidebar Não Funciona:** Verifique erros de JavaScript no console do navegador, confirme se os IDs (`mobile-menu-toggle`, `sidebar`) estão corretos no HTML e no JS, e inspecione o CSS aplicado aos elementos no modo mobile.

====================================
