# Sistema de Gestão de Ativos de TI — Complexo Tucuruí

Plataforma web para controle, rastreabilidade e consulta de equipamentos de TI distribuídos entre UHE Tucuruí, Subestação de Tucuruí, Centro de Treinamento (CTT) e Centro de Proteção Ambiental (CPA).

## Publicar no Railway com SQLite persistente

O projeto está preparado para executar frontend e API no mesmo serviço. O banco SQLite deve ficar em um volume permanente.

### 1. Criar o serviço

1. No Railway, abra o projeto conectado a este repositório.
2. Confirme que a branch de deploy é `main`.
3. Aguarde o Railway detectar o arquivo `railway.json`.

O build usa `npm run build`, e a inicialização usa `npm start`.

### 2. Criar o volume persistente

1. No serviço do sistema, abra **Volumes**.
2. Clique em **Add Volume**.
3. Defina o caminho de montagem como:

```text
/data
```

Não monte o volume sobre a pasta inteira da aplicação.

### 3. Configurar as variáveis

Em **Variables**, cadastre:

| Variável | Valor |
|---|---|
| `DATABASE_PATH` | `/data/ativos-ti.db` |
| `JWT_SECRET` | Chave aleatória e secreta com pelo menos 32 caracteres |
| `ADMIN_REGISTRATION` | Matrícula do administrador inicial |
| `ADMIN_NAME` | Nome do administrador inicial |
| `ADMIN_PASSWORD` | Senha inicial forte, com pelo menos 12 caracteres |

Não cadastre `PORT`: o Railway fornece essa variável automaticamente.

O administrador é criado somente quando o banco está vazio. Após o primeiro deploy bem-sucedido, alterar as variáveis `ADMIN_*` não altera automaticamente a conta já criada.

### 4. Gerar o domínio

1. Abra **Settings > Networking**.
2. Clique em **Generate Domain**.
3. Acesse o endereço fornecido pelo Railway.
4. Entre com a matrícula e a senha configuradas nas variáveis.

Teste técnico:

```text
https://SEU-DOMINIO.up.railway.app/api/health
```

A resposta esperada contém `"status":"ok"`.

## Proteção dos dados reais

- Nunca coloque senhas, `JWT_SECRET` ou dados pessoais no GitHub.
- Restrinja o acesso ao painel do Railway.
- Faça backup periódico do arquivo `/data/ativos-ti.db`.
- Use senhas individuais e fortes.
- Cadastre apenas pessoas autorizadas.
- Defina uma política de retenção e correção de dados pessoais.
- Antes do uso institucional, valide segurança, LGPD, responsabilidades e procedimento de recuperação.

O volume protege contra novos deploys e reinicializações, mas não substitui backup.

## Executar localmente no VS Code

É necessário ter Node.js 20 ou superior.

1. Copie `.env.example` para `.env`.
2. Substitua todos os valores de exemplo por valores reais e seguros.
3. Execute:

```powershell
npm install
npm run dev
```

Abra:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3333`
- Saúde da API: `http://localhost:3333/api/health`

O banco local fica em `server/data/ativos-ti.db`, salvo se `DATABASE_PATH` indicar outro local.

## Abrir somente o MVP visual

O arquivo `MVP_VISUAL.html` é uma demonstração independente e não grava dados.

No Windows, extraia o projeto e dê dois cliques em `ABRIR_SISTEMA.bat`.

No VS Code:

1. Clique em **Terminal > Executar Tarefa**.
2. Escolha **Abrir MVP Visual**.

## Funcionalidades do sistema completo

- Login com perfis Administrador e Usuário.
- Dashboard do inventário.
- Cadastro e edição de ativos.
- Busca por patrimônio, matrícula, responsável e localidade.
- Cautelas, transferências e desvinculações.
- Cadastro e edição de colaboradores.
- Manutenções.
- Histórico e auditoria.
- Baixa patrimonial lógica.
- Banco SQLite persistente.
- Interface React + TypeScript responsiva.

## Estrutura principal

```text
src/                  Frontend React
server/               API e banco SQLite
railway.json          Build, inicialização e health check
.env.example          Modelo de variáveis
MVP_VISUAL.html       Demonstração sem banco
ABRIR_SISTEMA.bat     Lançador da demonstração
```
