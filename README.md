# Sistema de Gestão de Ativos de TI — Complexo Tucuruí

Plataforma web para controle, rastreabilidade e consulta de equipamentos de TI distribuídos entre UHE Tucuruí, Subestação de Tucuruí, Centro de Treinamento (CTT) e Centro de Proteção Ambiental (CPA).

## Escopo do MVP

- Login por matrícula.
- Perfis de demonstração: Técnico de TI (administrador) e Colaborador (somente leitura).
- Dashboard com indicadores do inventário.
- Busca por patrimônio, matrícula, responsável e localidade.
- Visualização de cautelas e status dos equipamentos.
- Distribuição de ativos por localidade.
- Interface responsiva para desktop e dispositivos móveis.

## Perfis

### Administrador / Técnico de TI
Pode cadastrar, atualizar, transferir, vincular/desvincular cautelas e realizar baixa patrimonial.

### Usuário comum
Pode visualizar equipamentos vinculados à própria matrícula e consultar patrimônio sob sua responsabilidade.

## Tecnologias do protótipo

- React
- TypeScript
- Vite
- Lucide React
- CSS responsivo

## Executar localmente

```bash
npm install
npm run dev
```

Depois acesse o endereço informado pelo Vite no terminal.

## Próximas etapas

1. Implementar API e banco de dados.
2. Criar autenticação real por matrícula e senha/SSO corporativo.
3. Implementar CRUD completo de ativos.
4. Implementar gestão e histórico de cautelas.
5. Criar trilha de auditoria para transferências e baixas.
6. Adicionar relatórios e exportação.
7. Configurar ambiente de homologação e produção.

> O MVP atual utiliza dados simulados e seleção de perfil apenas para demonstração da interface. Não deve ser usado em produção até a implementação da autenticação, autorização e persistência no backend.
