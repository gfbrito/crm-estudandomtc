# Documentação do Sistema - CRM Premium

Este documento serve como mapa e guia arquitetural completo da plataforma de CRM, projetada para auxiliar inteligências artificiais ou desenvolvedores a compreenderem as rotas, componentes, estrutura de dados e as tecnologias envolvidas na aplicação.

---

## 🏗 Stack Tecnológica e Arquitetura

O sistema é dividido em duas partes principais: **Frontend (React)** e **Backend (Node.js)**, mantendo separação de responsabilidades. A arquitetura original do projeto era dependente de serviços Cloud do Supabase (BaaS), mas recentemente o projeto foi totalmente refatorado para utilizar uma API REST construída do zero, mantendo o PostgreSQL como banco de dados através do Prisma ORM.

### Frontend
- **Framework**: React.js com TypeScript e Vite.
- **Roteamento**: React Router DOM v6.
- **Estilização**: TailwindCSS + `index.css` global com variáveis CSS.
- **Design System**: Tema "Dark Premium" utilizando efeitos de *Glassmorphism* (cartões de vidro translúcido, gradientes dinâmicos, botões com hover "glow", texturas noise).
- **Ícones**: Lucide React.
- **Client de API**: Classe utilitária assíncrona wrapper do Fetch (`src/config/api.ts`) lidando com autenticações de Tokens JWT.
- **Gerenciamento de Estado**: Context API (Auth), hooks customizados padrão do React.
- **Autenticação**: Baseada em token JWT guardado no LocalStorage (`AuthContext`).

### Backend
- **Core**: Node.js com Express e TypeScript.
- **Banco de Dados**: PostgreSQL manipulado via Prisma ORM.
- **Integração Externa (WhatsApp)**: O sistema se integra nativamente com a **Evolution API**, enviando mensagens via HTTP POST para a instância da API (cujas credenciais, "URL" e "API Key", são armazenadas de forma segura na tabela `settings` do próprio banco).
- **Autenticação**: Middleware validando Tokens JWT gerados com lib genérica (`jsonwebtoken`) e senhas armazenadas com hash (`bcryptjs`).
- **Padrão de Tarefas**: O backend gerencia o envio de mensagens em massa através de Cron Jobs ou por solicitação manual das rotas (Rotas `/process-queue`).

---

## 🗺 Mapa da Aplicação Frontend (Páginas e Telas)

O frontend concentra toda a navegação sob as diretrizes do arquivo `App.tsx` acessando um `<MainLayout />` principal.

| Rota / Caminho | Arquivo Fonte | Descrição da Funcionalidade / Contexto |
| --- | --- | --- |
| `/login` | `LoginPage.tsx` | Tela de entrada com Autenticação do sistema (JWT). Apresenta design dark clean focado no formulário. |
| `/` (Home) | `DashboardPage.tsx` | O "Painel Principal". Agrega KPIs (Faturamento, Novos Leads, Total de Vendas) em *MetricCards* e mostra gráficos lineares/mensais do progresso do negócio. |
| `/leads` | `LeadsPage.tsx` | Tabela (DataGrid) central de clientes do CRM (os Leads). Permite busca avançada textuais, filtros múltiplos (por produto comprado, tags, temperatura, estágio do funil) e exportações em lote para CSV. |
| `/leads/:id` | `LeadDetailPage.tsx` | A ficha criminal e funil detalhado de um único `Lead`. Exibe abas de Perfil (campos personalizados), Produtos comprados (MRR associado), e uma *Timeline* histórico para ver a trajetória de contato do lead. Relaciona todas as compras (`sales`) feitas. |
| `/products` | `ProductsPage.tsx` | Lista e gestão de Infoprodutos / Cursos. Permite cadastrar links globais de renovação de assinatura que os robôs usarão quando o plano de um lead estiver vencendo, gerenciando dias de ciclo. |
| `/sales` | `SalesPage.tsx` | Visão focada puramente na métrica transacional, mapeando dados de receita, métodos de pagamento (PIX, Cartão) originados pela venda de um infoproduto. |
| `/recoveries` | `RecoveryPage.tsx` | Central de follow-up (Recuperação). Leads que geraram boletos ou PIX e não pagaram entram neste fluxo onde os vendedores ou o WhatsApp Bot podem efetuar abordagens para resgatar o faturamento "perdido". |
| `/mass-messaging`| `MassMessagingPage.tsx` | Sistema de **Envio em Massa**. Interface para o usuário segmentar a lista de leads utilizando dezenas de filtros (Ex: "Compradores do produto X que estão Inativos"). Possui campo para escrever templates com chaves variáveis `{nome}`, `{whatsapp}` e define "Atraso/Delay" programável de disparos no backend, evitando banimentos pelo WhatsApp. |
| `/notifications` | `NotificationsPage.tsx` | O painel de avisos do sistema. Concentra alertas sobre webhooks recebidos do carrinho de compras com "Produto Desconhecido" (sugerindo linkar o SKU ao Produto Interno do CRM) com modais responsivas. |
| `/import` | `ImportPage.tsx` | O componente que empurra a base antiga de clientes de uma planilha .CSV para dentro do banco PostgreSQL, através do backend API, possuindo um wizard passo-a-passo. |
| `/settings` | `SettingsPage.tsx` | Configurações mestre da plataforma. Gera o QR Code da conexão com o celular (Evolution API), parametriza limites de hora de disparo, métricas ou "Tags" globais para organizar a estrutura do negócio. |
| `/settings/subscriptions` | `SubscriptionSettingsPage.tsx` | Gerenciamento de Automação de Cursos: Permite programar quantos "dias antes" ou "dias depois" o sistema enviará uma mensagem de cobrança pro cliente. |

---

## 🛠 Mapa da API Backend (Endpoints / Rotas)

O ExpressJS distribui controladoras pelo diretório `backend/src/routes`.

- **`auth.ts`**
  - `POST /api/auth/login`: Autentica com email e senha.
  - `GET /api/auth/me`: Retorna os dados do usuário corrente logado via Bearer.
- **`dashboard.ts`**
  - `GET /api/dashboard/stats`: Recupera vendas globais em períodos agregados de dias (MRR, Total Leads, Ticket Médio).
- **`evolution.ts`**
  - `GET /api/evolution/config` e `POST /api/evolution/config`: Lê e Registra o endpoint da URL e o token de acesso à Evolution API no banco de dados.
  - `GET /api/evolution/qrcode` / `status`: Repassa (Proxy) endpoints vitais chamando a Evolution API localmente.
  - `POST /api/evolution/process-queue`: Script invocado frequentemente para ler a base de *mass_messages* com status "SCHEDULED" que já deram horário, construindo o loop com timeout variável que manda mensagens de forma granular pela Evolution.
  - `POST /api/evolution/mass`: Modalidade de disparo stateless onde a requisição empurra os celulares contendo as mensagens no momento atual (bypassa filas do banco se desejado).
- **`import.ts`**
  - `POST /api/import/sales`: Transforma um objeto JSON contendo vendas ou leads massivos e iterativamente gera os `leads` com `upsert` e inclui na tabela de `sales`, ignorando ou validando duplicidades.
- **`leads.ts`**
  - `GET /api/leads` (com paginação e consultas avançadas), `POST`, `PUT`, `DELETE`.
  - Contém as rotinas de busca usando *in* no SQL do prisma e regex para tags.
- **`mass-messages.ts`**
  - CRUD básico, leitura dos envios de massa registrados no banco (Sucesso, Quantos Falharam).
- **`notifications.ts`**
  - Notificações de log do banco (`status unread`).
- **`products.ts`**
  - Endpoints de produtos. Destaque especial para o `POST /api/products/resolve-link` que resolve Webhooks orfãos processando novamente as vendas assim que o administrador diz a qual produto o SKU alienígena pertence.
- **`recoveries.ts`** / **`sales.ts`**
  - Tabelas de dependências e métricas financeiras.
- **`subscriptions.ts`**
  - Gerenciamento de assinantes ativos. Uma assinatura é o relacionamento "N-N" vivo entre um chassi do `lead` e uma instância do `product`.
- **`settings.ts`**
  - Rotas genéricas de Key-Value store da tabela `settings` (armazenamento de escopo global no banco em JSON Schema flexível).
- **`timeline.ts`**
  - Permite recuperar os rastros de auditoria ("O que ocorreu neste contato no dia 20?")
- **`webhook.ts`**
  - Endpoint de entrada público focado em escutar *Hotmart, Kiwify, Eduzz, etc.*. Transmuta o payload proprietário e converte na regra de negócios da aplicação (Criar Lead, Registrar Venda, Emitir tag, etc).

---

## 💾 Modelos do Prisma (Mapeamento do Banco `schema.prisma`)

As principais tabelas do PostgreSQL e seus relacionamentos:

- **`users`**: Administradores, acesso por JWT. (`email`, `password_hash`).
- **`leads`**: Clientes (`name`, `whatsapp`, `points`, `tags`, `temperature`). Relaciona-se com vendas, assinaturas e timeline.
- **`products`**: Nossos produtos cadastrados.
- **`sales`**: Compras individuais do Lead em relação ao Produto (`status: approved | refunded`).
- **`subscriptions`**: Assinatura recorrente vinculando o Produto ao Lead.
- **`timeline`**: Log de auditoria amarrado ao `lead_id`.
- **`notifications`**: Alertas que vão para a caixinha do frontend (sino de notificação).
- **`settings`**: Configurações em JSON onde `key` é o ID, permitindo liberdade no que é armazenado (janelas de horário do whatsapp, pontuação das fases de lead).
- **`mass_messages`**: Registro das campanhas de disparo disparadas e de seu alcance.
- **`pending_webhooks`** e **`product_mappings`**: Estrutura auxiliar para parear e enfileirar webhooks de SKUs que ainda não existem no sistema de forma transparente.
