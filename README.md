# Gestão de Vendas

Sistema para registro de vendas (procedimentos), acompanhamento de metas
por promotor e geração de relatórios — desenvolvido como projeto de
estudo, aplicando na prática conceitos de backend e frontend.

> Documentação de aprendizado: veja [`APRENDIZADO.md`](./APRENDIZADO.md)
> para o passo a passo dos conceitos estudados durante a construção deste
> projeto.

## Funcionalidades

- Cadastro, edição, listagem e remoção de vendas
- Filtros por promotor, código/paciente e faixa de valor
- Ranking de promotores por faturamento, com filtro por mês
- Cadastro de metas mensais (gerais da clínica e individuais por promotor)
- Exportação de relatório em PDF (ranking + vendas)

## Tecnologias

**Backend**
- Node.js + Express
- MySQL (`mysql2`)
- PDFKit (geração de relatórios em PDF)

**Frontend**
- React + TypeScript
- Vite
- Tailwind CSS

**Ferramentas de apoio**
- Bruno (testes de API)

## Estrutura do projeto

```
gestao-vendas/
├── backend/
│   ├── controllers/       # lógica de cada recurso (vendas, metas, relatórios)
│   ├── routes/             # mapeamento de rotas
│   ├── db.js                # conexão com o MySQL
│   ├── server.js             # ponto de entrada da API
│   └── .env                   # variáveis de ambiente (não versionado)
│
├── frontend-react/
│   └── src/
│       ├── components/     # componentes reutilizáveis da interface
│       ├── services/         # comunicação com a API (fetch)
│       ├── types/              # tipos TypeScript (Venda, Meta)
│       ├── App.tsx              # componente principal
│       └── main.tsx              # ponto de entrada
│
├── README.md
└── APRENDIZADO.md         # anotações de estudo
```

## Como rodar o projeto

### Pré-requisitos
- Node.js instalado
- MySQL instalado e rodando

### Banco de dados

Crie o banco e as tabelas executando o script SQL abaixo no MySQL
Workbench (ou cliente de sua preferência):

```sql
CREATE DATABASE gestao_vendas;
USE gestao_vendas;

CREATE TABLE vendas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL,
  paciente VARCHAR(150) NOT NULL,
  promotor VARCHAR(100) NOT NULL,
  clinico DECIMAL(10,2) DEFAULT 0,
  raspagem DECIMAL(10,2) DEFAULT 0,
  inicio DECIMAL(10,2) DEFAULT 0,
  data_venda DATE NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mes_referencia VARCHAR(7) NOT NULL,
  promotor VARCHAR(100),
  meta_vendas INT DEFAULT 0,
  meta_faturamento DECIMAL(10,2) DEFAULT 0
);
```

### Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` na pasta `backend/` com:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=gestao_vendas
PORT=3000
```

Rode o servidor:
```bash
npm run dev
```
API disponível em `http://localhost:3000`

### Frontend

```bash
cd frontend-react
npm install
npm run dev
```
App disponível em `http://localhost:5173`

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/vendas` | Lista vendas (aceita `?promotor=&busca=&valorMin=&valorMax=`) |
| POST | `/api/vendas` | Cria uma venda |
| PUT | `/api/vendas/:id` | Edita uma venda |
| DELETE | `/api/vendas/:id` | Remove uma venda |
| GET | `/api/vendas/rankingPromotores` | Ranking de promotores (aceita `?mes=`) |
| GET | `/api/metas` | Lista metas (aceita `?mes=`) |
| POST | `/api/metas` | Cria ou atualiza uma meta |
| DELETE | `/api/metas/:id` | Remove uma meta |
| GET | `/api/relatorios/pdf` | Gera relatório em PDF |

## Roadmap

- [x] Backend: CRUD de vendas
- [x] Backend: ranking de promotores
- [x] Backend: relatório em PDF
- [x] Backend: CRUD de metas
- [ ] Frontend: componentes e telas
- [ ] Frontend: integração completa com a API
- [ ] Autenticação de usuários