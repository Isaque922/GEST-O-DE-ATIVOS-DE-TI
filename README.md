# Sistema de Gestão de Ativos de TI — Complexo Tucuruí

Plataforma web para controle, rastreabilidade e consulta de equipamentos de TI distribuídos entre UHE Tucuruí, Subestação de Tucuruí, Centro de Treinamento (CTT) e Centro de Proteção Ambiental (CPA).

## Jeito mais fácil de abrir no Windows

O repositório é privado. Entre no GitHub com a conta que tem acesso ao projeto e faça:

1. Abra o repositório `Isaque922/GEST-O-DE-ATIVOS-DE-TI`.
2. Clique no botão **Code**.
3. Clique em **Download ZIP**.
4. Extraia o arquivo ZIP para uma pasta do computador.
5. Abra a pasta extraída.
6. Dê dois cliques em `ABRIR_SISTEMA.bat`.

O arquivo instala as dependências, cria o `.env` automaticamente e inicia frontend e backend.

Depois abra no navegador:

`http://localhost:5173`

### Login de teste

Administrador:
- Matrícula: `1001`
- Senha: `admin123`

Colaborador:
- Matrícula: `84215`
- Senha: `user123`

## Abrir pelo VS Code

É necessário ter o Node.js 20 ou superior instalado.

Depois de baixar e extrair o ZIP:

1. Abra o VS Code.
2. Clique em **Arquivo > Abrir Pasta**.
3. Escolha a pasta `GEST-O-DE-ATIVOS-DE-TI-main`.
4. No menu do VS Code, clique em **Terminal > Executar Tarefa**.
5. Execute primeiro **Instalar dependências**.
6. Depois execute **Abrir Sistema de Gestão de Ativos**.
7. Abra `http://localhost:5173` no navegador.

Também é possível usar o terminal:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

## Clone com Git

Como o projeto é privado, o clone só funciona se o Git estiver instalado e o computador estiver autenticado no GitHub:

```bash
git clone https://github.com/Isaque922/GEST-O-DE-ATIVOS-DE-TI.git
cd GEST-O-DE-ATIVOS-DE-TI
npm install
npm run dev
```

## Funcionalidades implementadas

- Login por matrícula e senha.
- Perfis Administrador e Usuário comum.
- Dashboard do inventário.
- Cadastro e edição de ativos.
- Busca por patrimônio, matrícula, responsável e localidade.
- Cautelas, transferências e desvinculações.
- Cadastro e edição de colaboradores.
- Manutenções.
- Histórico e auditoria.
- Baixa patrimonial lógica.
- SQLite com dados iniciais.
- Interface React + TypeScript responsiva.

## Tecnologias

Frontend: React, TypeScript, Vite, Lucide React e CSS.

Backend: Node.js, Express, SQLite/better-sqlite3, JWT e bcryptjs.

## Endereços locais

- Frontend: `http://localhost:5173`
- API: `http://localhost:3333`
- Teste da API: `http://localhost:3333/api/health`

## Estrutura principal

```text
src/
  App.tsx
  api.ts
  main.tsx
  styles.css
  extended.css
server/
  auth.js
  db.js
  index.js
  extended.js
  production.js
.vscode/
  tasks.json
ABRIR_SISTEMA.bat
vite.config.ts
```

## Segurança

As credenciais acima são apenas para desenvolvimento. Antes de uso real, altere o `JWT_SECRET`, remova senhas de demonstração e configure autenticação, backups e logs adequados.
