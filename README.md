# Sistema de Gestão de Ativos de TI — Complexo Tucuruí

Plataforma web para controle, rastreabilidade e consulta de equipamentos de TI distribuídos entre UHE Tucuruí, Subestação de Tucuruí, Centro de Treinamento (CTT) e Centro de Proteção Ambiental (CPA).

## Funcionalidades implementadas

- Login por matrícula e senha.
- Autenticação com JWT.
- Dois perfis de acesso: Técnico de TI (administrador) e Colaborador/Terceiro (somente leitura dos próprios ativos).
- Dashboard com indicadores do inventário.
- Busca por patrimônio, matrícula, responsável, modelo e localidade.
- Cadastro de ativos pelo administrador.
- Vinculação e transferência de cautelas.
- Desvinculação de cautelas.
- Baixa patrimonial lógica.
- Histórico de ações de cautela e movimentação no backend.
- Cadastro de usuários via API.
- Quatro localidades pré-configuradas: UHE, SE Tucuruí, CTT e CPA.
- Banco SQLite local com dados iniciais.
- Interface responsiva em React + TypeScript.

## Tecnologias

### Frontend
- React
- TypeScript
- Vite
- Lucide React
- CSS responsivo

### Backend
- Node.js
- Express
- SQLite / better-sqlite3
- JWT
- bcryptjs

## Executar localmente

Requisitos: Node.js 20+ e npm.

```bash
git clone https://github.com/Isaque922/GEST-O-DE-ATIVOS-DE-TI.git
cd GEST-O-DE-ATIVOS-DE-TI
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`

API: `http://localhost:3333`

O comando `npm run dev` executa frontend e backend ao mesmo tempo.

## Credenciais iniciais de desenvolvimento

Administrador / Técnico de TI:

- Matrícula: `1001`
- Senha: `admin123`

Colaborador:

- Matrícula: `84215`
- Senha: `user123`

> Essas credenciais são apenas para desenvolvimento e demonstração. Devem ser removidas ou alteradas antes de qualquer implantação real.

## Estrutura principal

```text
src/
  App.tsx          Interface principal
  api.ts           Cliente HTTP da API
  main.tsx
  styles.css
server/
  auth.js          JWT e autorização
  db.js            Banco, tabelas e seed inicial
  index.js         Rotas da API
server/data/       Banco local (ignorado pelo Git)
```

## Modelo de dados

O sistema usa as entidades principais:

- `users`: colaboradores, terceiros e técnicos de TI.
- `locations`: UHE, SE, CTT e CPA.
- `assets`: equipamentos e seus dados patrimoniais.
- `custody_history`: trilha de auditoria das cautelas e alterações.

Cada ativo pode ter um responsável atual e uma localidade. As mudanças de responsabilidade são registradas no histórico.

## Regras de acesso

### Administrador / Técnico de TI

Pode consultar todo o inventário, cadastrar e atualizar equipamentos, vincular ou transferir cautelas, desvincular equipamentos e registrar baixa patrimonial.

### Usuário comum

A API restringe automaticamente a consulta aos equipamentos atualmente vinculados à matrícula autenticada.

## Endpoints principais

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/dashboard`
- `GET /api/assets`
- `POST /api/assets`
- `PUT /api/assets/:id`
- `DELETE /api/assets/:id`
- `POST /api/assets/:id/custody`
- `DELETE /api/assets/:id/custody`
- `GET /api/assets/:id/history`
- `GET /api/users`
- `POST /api/users`
- `GET /api/locations`

## Próximas evoluções recomendadas

1. Migrar SQLite para PostgreSQL no ambiente corporativo.
2. Integrar autenticação com diretório corporativo/SSO, se disponível.
3. Criar telas completas de edição de ativo e gestão de colaboradores.
4. Criar tela visual do histórico/auditoria.
5. Implementar fluxo de manutenção.
6. Gerar termos de responsabilidade em PDF.
7. Adicionar exportação para Excel/CSV.
8. Implementar testes automatizados e pipeline de CI/CD.
9. Publicar frontend e API em ambiente de homologação.

## Segurança

O projeto já separa autenticação e autorização por perfil, mas ainda é uma base de desenvolvimento. Antes de uso real, altere o `JWT_SECRET`, remova credenciais de demonstração, use HTTPS, configure política de senhas/SSO, backups do banco e logs de auditoria.
