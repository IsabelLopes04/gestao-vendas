# Gestão de Vendas

Sistema web para gerenciamento de vendas, metas e desempenho de promotores, com dashboard, rankings e geração de relatórios em PDF.

## Sobre o projeto

O Gestão de Vendas foi desenvolvido para centralizar o controle de vendas de uma clínica, facilitando o acompanhamento dos resultados, o gerenciamento de promotores e a análise do desempenho mensal.

A aplicação possui frontend e backend integrados a um banco de dados MySQL.

## Funcionalidades

### Dashboard
- Indicadores de vendas e faturamento.
- Cálculo de ticket médio.
- Gráfico de evolução do faturamento.
- Acompanhamento das metas mensais.
- Filtro por mês de referência.

### Gestão de vendas
- Cadastro, edição, listagem e exclusão de vendas.
- Busca por código ou paciente.
- Filtros por promotor e faixa de valor.

### Gestão de promotores
- Cadastro e edição de promotores.
- Ativação e desativação de cadastros.
- Exclusão de promotores sem perder o histórico de vendas e metas.

### Gestão de metas
- Cadastro de metas mensais.
- Metas gerais da clínica.
- Metas individuais por promotor.
- Atualização das metas existentes.

### Rankings de desempenho

A aplicação possui dois rankings independentes:

- **Ranking de início:** contabiliza a quantidade de vendas que possuem valor de início maior que zero.
- **Ranking de faturamento:** soma os valores dos procedimentos clínico, raspagem e início, considerando todas as vendas.

Os dois rankings podem ser consultados por mês de referência.

### Relatórios
- Geração de relatórios em PDF.
- Exibição dos dois rankings de desempenho.
- Listagem das vendas registradas.

## Tecnologias utilizadas

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS

**Backend**
- Node.js
- Express
- MySQL2
- PDFKit

**Banco de dados**
- MySQL

## Estrutura do projeto

```text
gestao-vendas/
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── db.js
│   └── server.js
│
├── frontend-react/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── types/
│       ├── utils/
│       └── App.tsx
│
├── README.md
└── APRENDIZADO.md
```

## Como executar o projeto

### Pré-requisitos

- Node.js
- MySQL
- npm

### 1. Clonar o repositório

```bash
git clone https://github.com/IsabelLopes04/gestao-vendas.git
cd gestao-vendas
```

### 2. Configurar o banco de dados

Crie o banco de dados no MySQL:

```sql
CREATE DATABASE gestao_vendas;
```

O banco deve conter as tabelas `vendas`, `metas` e `promotores`, conforme a estrutura utilizada pela aplicação.

### 3. Configurar o backend

Entre na pasta:

```bash
cd backend
npm install
```

Crie um arquivo `.env` dentro da pasta `backend`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=gestao_vendas
PORT=3000
```

Inicie o servidor:

```bash
npm run dev
```

API disponível em `http://localhost:3000`.

### 4. Configurar o frontend

Em outro terminal, entre na pasta:

```bash
cd frontend-react
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

## Principais rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/vendas` | Lista e filtra vendas |
| POST | `/api/vendas` | Cadastra uma venda |
| PUT | `/api/vendas/:id` | Atualiza uma venda |
| DELETE | `/api/vendas/:id` | Exclui uma venda |
| GET | `/api/vendas/rankingPromotores?mes=AAAA-MM` | Consulta os rankings |
| GET | `/api/metas` | Lista metas |
| POST | `/api/metas` | Cadastra ou atualiza uma meta |
| DELETE | `/api/metas/:id` | Exclui uma meta |
| GET | `/api/promotores` | Lista promotores |
| POST | `/api/promotores` | Cadastra um promotor |
| PUT | `/api/promotores/:id` | Edita um promotor |
| PATCH | `/api/promotores/:id/status` | Altera o status |
| DELETE | `/api/promotores/:id` | Exclui um promotor |
| GET | `/api/relatorios/pdf` | Gera relatório em PDF |

## Documentação complementar

O arquivo [`APRENDIZADO.md`](./APRENDIZADO.md) reúne anotações sobre os conceitos de programação, tecnologias e decisões técnicas utilizados durante o desenvolvimento.

---

**Status:** Projeto concluído.
