# Meu Aprendizado — Gestão de Vendas

Este arquivo documenta os conceitos que aprendi construindo este projeto,
como material de estudo pessoal. Vou atualizando conforme avanço.

---

## BACKEND (Node + Express + MySQL)

### Arquitetura em camadas: Routes → Controllers → Banco

Em vez de escrever tudo num arquivo só, separei o backend em responsabilidades:

- **`server.js`** — o "portão de entrada": configura o Express, conecta os
  módulos de rotas, sobe o servidor.
- **`routes/`** — define **qual URL** chama **qual função**. Não tem lógica
  de negócio aqui, só o "mapa" de endereços.
- **`controllers/`** — onde a lógica de verdade acontece: valida dados,
  monta as queries SQL, decide o que responder.
- **`db.js`** — a conexão única com o MySQL, compartilhada por todo o app.

**Por que separar assim:** se um dia eu precisar mudar como uma venda é
salva no banco, mexo só no controller — a rota nem percebe a diferença.
Isso facilita manutenção e é o padrão usado profissionalmente (MVC).

### Connection Pool (`db.js`)

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
```

Um **pool** mantém várias conexões abertas com o banco, prontas para uso.
Cada requisição "pega emprestada" uma conexão livre, usa, e devolve.
Isso é mais eficiente do que abrir/fechar uma conexão nova a cada
requisição.

### CRUD completo (Create, Read, Update, Delete)

Aprendi a implementar as 4 operações básicas de qualquer sistema que
gerencia dados:

| Verbo HTTP | Rota | O que faz |
|---|---|---|
| `GET` | `/api/vendas` | Lista vendas (com filtros opcionais) |
| `POST` | `/api/vendas` | Cria uma venda nova |
| `PUT` | `/api/vendas/:id` | Edita uma venda existente |
| `DELETE` | `/api/vendas/:id` | Remove uma venda |

O `:id` na URL é um **parâmetro de rota** — captura o que vier naquela
posição (ex: `/api/vendas/7` → `req.params.id` é `"7"`).

### Proteção contra SQL Injection

Nunca concateno valores do usuário direto na query. Sempre uso `?` como
"buraco" a ser preenchido, com os valores num array separado:

```javascript
// CERTO — protegido
const sql = 'SELECT * FROM vendas WHERE promotor = ?';
await pool.query(sql, [promotor]);

// ERRADO — vulnerável a SQL Injection
const sql = `SELECT * FROM vendas WHERE promotor = '${promotor}'`;
```

Se eu concatenasse direto, alguém poderia digitar algo malicioso no lugar
de `promotor` e manipular a query inteira.

### Filtros dinâmicos (WHERE construído aos poucos)

Para permitir filtrar por vários campos opcionais ao mesmo tempo, construo
o SQL "aos poucos", começando com `WHERE 1=1` (um truque que sempre é
verdadeiro, permitindo concatenar `AND` sem me preocupar se é a primeira
condição):

```javascript
let sql = 'SELECT * FROM vendas WHERE 1=1';
const params = [];

if (promotor) {
  sql += ' AND promotor = ?';
  params.push(promotor);
}
if (busca) {
  sql += ' AND (codigo LIKE ? OR paciente LIKE ?)';
  params.push(`%${busca}%`, `%${busca}%`);
}
```

O `LIKE` com `%texto%` faz busca "contém" (não precisa ser exato).

### Padrão Upsert (Criar OU Atualizar)

Usado nas Metas: antes de inserir, verifico se já existe um registro para
aquele mês + promotor. Se existir, faço `UPDATE`; se não, faço `INSERT`.
Isso evita duplicar metas quando o usuário salva de novo no mesmo mês.

### Representando "não se aplica" com NULL

Na tabela `metas`, a coluna `promotor` aceita `NULL`. Uma meta com
`promotor = NULL` representa a **meta geral da clínica** (não vinculada a
uma pessoa específica), enquanto uma meta com `promotor = "Kayan"` é
individual. Isso evita precisar de uma tabela ou lógica separada só para
diferenciar os dois casos.

### Geração de PDF (pdfkit)

Aprendi que é possível gerar um arquivo PDF "desenhando" o conteúdo via
código (texto, posições, quebras de linha) e enviando direto como resposta
HTTP, sem salvar o arquivo no servidor:

```javascript
const doc = new PDFDocument({ margin: 40 });
res.setHeader('Content-Type', 'application/pdf');
res.setHeader('Content-Disposition', 'attachment; filename=relatorio.pdf');
doc.pipe(res); // manda o PDF direto como resposta
doc.text('Relatório de Vendas');
doc.end();
```

### Variáveis de ambiente (`.env`)

Dados sensíveis (senha do banco, portas) não ficam escritos direto no
código — ficam num arquivo `.env`, carregado pelo pacote `dotenv`, e esse
arquivo **nunca vai pro Git** (fica listado no `.gitignore`).

### Testando a API sem frontend (Bruno)

Antes de existir qualquer tela, já validei que o backend funciona de
verdade, enviando requisições `GET`/`POST`/`PUT`/`DELETE` manualmente pelo
Bruno (organizadas em pastas por recurso: Vendas, Metas, Relatórios). Isso
separa dois tipos de bug: "o backend está errado" vs "o frontend está
errado" — importantíssimo pra não se perder na hora de debugar.

### Erros que mais me pegaram (e o que aprendi com eles)

1. **`TypeError: argument handler must be a function`** — sempre que uma
   rota chamava uma função `undefined`. Causa raiz, quase toda vez: uma
   chave `}` não fechando uma função antes da próxima começar, fazendo a
   segunda função ficar "aninhada" dentro da primeira sem eu perceber.
   Aprendi a sempre ir até o fim do arquivo (`Ctrl+End`) antes de colar uma
   função nova, confirmando que a anterior já fechou certinho.

2. **`Cannot find module`** — módulo (arquivo ou pacote) não encontrado.
   Sempre checar: o `npm install` rodou na pasta certa? O caminho no
   `require()` está exatamente igual ao nome do arquivo?

3. **`ER_TRUNCATED_WRONG_VALUE` (data)** — o MySQL recusa datas com
   hora/fuso (`2026-07-05T03:00:00.000Z`) em colunas `DATE`. É preciso
   mandar só `2026-07-05`.

4. **Erro de política de execução do PowerShell** — resolvido com
   `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`,
   liberando scripts locais sem abrir mão de segurança.

---

## FRONTEND (React + TypeScript + Tailwind)

### Por que sair do HTML/CSS/JS puro

Comecei estruturando o frontend em HTML+CSS+JS "puro", mas decidi migrar
para uma stack mais próxima do mercado real: **React** (organiza a
interface em componentes), **TypeScript** (JavaScript com verificação de
tipos) e **Tailwind** (estilização via classes utilitárias).

### Vite

Ferramenta que cria e roda o projeto de frontend, cuidando de compilar
TypeScript, processar o Tailwind, e servir a página com atualização
automática no navegador (Hot Reload) a cada `Ctrl+S`.

Comando usado para criar o projeto:
```bash
npm create vite@latest frontend-react
```

### JSX — HTML dentro do JavaScript

```tsx
return (
  <h1 className="text-4xl">Olá</h1>
)
```

Não é HTML de verdade — é **JSX**, convertido para JavaScript puro pelo
Vite antes de rodar no navegador. Por isso um componente React consegue
"misturar" lógica e estrutura visual no mesmo arquivo.

### Componentes

Um componente é uma **função que retorna o que deve aparecer na tela**:

```tsx
function App() {
  return <h1>Meu app</h1>
}
```

O app inteiro vai ser uma árvore de componentes — um componente principal
(`App`) contendo outros menores (formulário, tabela, cards), cada um
responsável por uma parte da interface.

### useState — o "estado" que redesenha a tela sozinho

```tsx
const [count, setCount] = useState(0)
```

- `count` → valor atual
- `setCount` → função para atualizar esse valor

Quando `setCount` é chamado, o React **redesenha automaticamente** as
partes da tela que usam `count`, sem eu precisar manipular o HTML na mão
(diferente do que fazia na abordagem anterior, com uma função `render()`
manual).

### TypeScript — Interfaces (Types)

Forma de declarar antecipadamente o "formato" que um dado deve ter. O
TypeScript verifica isso enquanto escrevo o código, avisando erros antes
mesmo de rodar.

```typescript
export interface Venda {
  id: number;
  codigo: string;
  paciente: string;
  promotor: string;
  clinico: number;
  raspagem: number;
  inicio: number;
  data_venda: string;
  criado_em?: string;
}
```

- `string` → texto
- `number` → número
- `string | null` → ou é texto, ou é nulo
- `?` → propriedade opcional

**Importante:** o `interface` não se conecta ao banco de dados — é uma
"promessa" que escrevo no código. Se eu mudar uma coluna no MySQL, preciso
atualizar manualmente três lugares independentes: o banco, o backend e o
type no frontend.

### Tailwind CSS

Em vez de escrever CSS num arquivo separado, aplico classes utilitárias
prontas direto no JSX:

```tsx
<h1 className="text-4xl font-bold text-blue-600 underline">
  Texto grande, negrito, azul e sublinhado
</h1>
```

Cada classe (`text-4xl`, `font-bold`, `text-blue-600`, `underline`) já tem
o estilo definido pela biblioteca — não escrevo nenhuma regra CSS na mão
para esses casos.

### Estrutura de pastas adotada

```
frontend/src/
├── main.tsx          → ponto de entrada do app
├── App.tsx            → componente principal
├── index.css           → onde entra o @import do Tailwind
├── components/         → pedaços reutilizáveis da interface
├── services/
│   └── api.ts            → funções que conversam com o backend
└── types/
    └── index.ts           → formato dos dados (Venda, Meta)
```

---

## Próximos conceitos a estudar

- [ ] `services/api.ts` — recriar as chamadas fetch em TypeScript
- [ ] Componentes reutilizáveis (props)
- [ ] `useEffect` — rodar código quando o componente carrega
- [ ] Formulários controlados em React
- [ ] Renderização de listas (`.map()`) e `key`