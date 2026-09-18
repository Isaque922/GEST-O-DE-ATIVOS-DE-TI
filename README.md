# Sistema de Gestão de Ativos de TI — Complexo Tucuruí

Plataforma web para controle, rastreabilidade e consulta de equipamentos de TI distribuídos entre UHE Tucuruí, Subestação de Tucuruí, Centro de Treinamento (CTT) e Centro de Proteção Ambiental (CPA).

## Publicar no Render com Neon PostgreSQL

O projeto executa frontend e API no mesmo serviço Render e mantém os dados no PostgreSQL do Neon.

### 1. Criar o serviço

1. No Render, crie um Blueprint conectado a este repositório.
2. Confirme que a branch de deploy é `main`.
3. O Render detectará o arquivo `render.yaml`.

O build usa `npm run build`, e a inicialização usa `npm start`.

### 2. Configurar as variáveis

Em **Variables**, cadastre:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL fornecida pelo Neon |
| `JWT_SECRET` | Chave aleatória e secreta com pelo menos 32 caracteres |
| `ADMIN_REGISTRATION` | Matrícula do administrador inicial |
| `ADMIN_NAME` | Nome do administrador inicial |
| `ADMIN_PASSWORD` | Senha inicial forte, com pelo menos 12 caracteres |

Não cadastre `PORT`: o Render fornece essa variável automaticamente.

O administrador é criado somente quando o banco está vazio. Após o primeiro deploy bem-sucedido, alterar as variáveis `ADMIN_*` não altera automaticamente a conta já criada.

### 3. Abrir o domínio

1. Aguarde o deploy ficar com o estado **Live**.
2. Acesse o endereço `onrender.com` mostrado no serviço.
3. Entre com a matrícula e a senha configuradas nas variáveis.

Teste técnico:

```text
https://SEU-SERVICO.onrender.com/api/health
```

A resposta esperada contém `"status":"ok"`.

## Proteção dos dados reais

- Nunca coloque senhas, `JWT_SECRET` ou dados pessoais no GitHub.
- Restrinja o acesso aos painéis do Render e do Neon.
- Defina uma rotina de backup/exportação do PostgreSQL.
- Use senhas individuais e fortes.
- Cadastre apenas pessoas autorizadas.
- Defina uma política de retenção e correção de dados pessoais.
- Antes do uso institucional, valide segurança, LGPD, responsabilidades e procedimento de recuperação.

O banco Neon persiste entre deploys do Render, mas não substitui uma política de backup.

## Executar localmente no VS Code

É necessário ter Node.js 22 e acesso a um banco PostgreSQL.

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

Para desenvolvimento, `DATABASE_URL` pode apontar para uma branch separada no Neon ou para PostgreSQL local.

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
- Banco PostgreSQL persistente.
- Interface React + TypeScript responsiva.

## Estrutura principal

```text
src/                  Frontend React
server/               API e acesso ao PostgreSQL
render.yaml           Serviço, build e health check no Render
.env.example          Modelo de variáveis
MVP_VISUAL.html       Demonstração sem banco
ABRIR_SISTEMA.bat     Lançador da demonstração
```
