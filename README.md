# Sistema de Gestão de Ativos de TI — Complexo Tucuruí

Plataforma web para controle, rastreabilidade e consulta de equipamentos de TI distribuídos entre UHE Tucuruí, Subestação de Tucuruí, Centro de Treinamento (CTT) e Centro de Proteção Ambiental (CPA).

## Abrir rapidamente o MVP visual no Windows

O arquivo `MVP_VISUAL.html` é independente: não precisa de Node.js, npm, banco de dados, servidor ou extensão do VS Code.

1. Entre no GitHub com a conta que tem acesso ao repositório privado.
2. No repositório, clique em **Code > Download ZIP**.
3. Extraia todo o ZIP para uma pasta.
4. Abra a pasta extraída.
5. Dê dois cliques em `ABRIR_SISTEMA.bat`.

O navegador abrirá o arquivo `MVP_VISUAL.html`. Também é possível dar dois cliques diretamente nesse HTML.

> Importante: não tente executar os arquivos dentro do ZIP sem extraí-los primeiro.

## Abrir o MVP pelo VS Code

1. No VS Code, clique em **Arquivo > Abrir Pasta**.
2. Selecione a pasta extraída `GEST-O-DE-ATIVOS-DE-TI-main`.
3. Clique em **Terminal > Executar Tarefa**.
4. Escolha **Abrir MVP Visual**.

Outra opção é localizar `MVP_VISUAL.html` no Explorador do VS Code, clicar com o botão direito e escolher **Reveal in File Explorer/Mostrar no Explorador de Arquivos**; depois, dê dois cliques no arquivo.

## O que funciona no MVP visual

- Navegação entre Visão geral, Ativos, Cautelas, Colaboradores, Manutenções, Histórico e Login.
- Busca na tabela de ativos.
- Abertura e fechamento do formulário de novo ativo.
- Layout responsivo para desktop e celular.

O MVP usa dados demonstrativos. Login, salvamento e transferência não gravam informações no banco.

## Executar o sistema completo React + API

Use esta opção somente quando quiser testar autenticação, banco SQLite e operações persistentes. É necessário ter Node.js 20 ou superior.

No terminal do VS Code, dentro da pasta do projeto:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Abra:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3333`
- Teste da API: `http://localhost:3333/api/health`

Também é possível usar **Terminal > Executar Tarefa** e executar:

1. **Instalar dependências (sistema completo)**
2. **Executar sistema completo**

### Login de teste do sistema completo

Administrador:

- Matrícula: `1001`
- Senha: `admin123`

Colaborador:

- Matrícula: `84215`
- Senha: `user123`

## Clone com Git

Como o repositório é privado, o clone HTTPS exige autenticação no GitHub. Para evitar esse bloqueio no primeiro teste, prefira **Code > Download ZIP**.

Depois de configurar o Git Credential Manager ou autenticar o GitHub no VS Code:

```powershell
git clone https://github.com/Isaque922/GEST-O-DE-ATIVOS-DE-TI.git
cd GEST-O-DE-ATIVOS-DE-TI
```

## Funcionalidades do sistema completo

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

## Estrutura principal

```text
MVP_VISUAL.html
ABRIR_SISTEMA.bat
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
vite.config.ts
```

## Segurança

As credenciais acima são apenas para desenvolvimento. Antes de uso real, altere o `JWT_SECRET`, remova senhas de demonstração e configure autenticação, backups e logs adequados.
