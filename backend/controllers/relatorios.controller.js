const pool = require('../db');
const PDFDocument = require('pdfkit');

// Soma os valores dos procedimentos.
const totalVendaSQL = `(
  COALESCE(clinico, 0) +
  COALESCE(raspagem, 0) +
  COALESCE(inicio, 0)
)`;

// Valida o mês no formato YYYY-MM.
function mesValido(mes) {
  return typeof mes === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

// Valida os filtros numéricos.
function lerNumeroFiltro(valor, nome) {
  if (valor === undefined || valor === '') {
    return { valor: null };
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    return {
      erro: `${nome} deve ser um número maior ou igual a zero`
    };
  }

  return { valor: numero };
}


// GET /api/relatorios/pdf
// Gera um relatório de vendas em PDF com os dois rankings.
exports.gerarRelatorioPDF = async (req, res) => {
  try {
    const { promotor, busca, valorMin, valorMax, mes } = req.query;

    // Validação dos filtros.
    if (promotor !== undefined && typeof promotor !== 'string') {
      return res.status(400).json({
        erro: 'O filtro promotor deve ser um texto'
      });
    }

    if (busca !== undefined && typeof busca !== 'string') {
      return res.status(400).json({
        erro: 'O filtro busca deve ser um texto'
      });
    }

    if (mes !== undefined && !mesValido(mes)) {
      return res.status(400).json({
        erro: 'mes deve estar no formato YYYY-MM'
      });
    }

    const minimo = lerNumeroFiltro(valorMin, 'valorMin');
    const maximo = lerNumeroFiltro(valorMax, 'valorMax');

    if (minimo.erro) {
      return res.status(400).json({ erro: minimo.erro });
    }

    if (maximo.erro) {
      return res.status(400).json({ erro: maximo.erro });
    }

    if (
      minimo.valor !== null &&
      maximo.valor !== null &&
      minimo.valor > maximo.valor
    ) {
      return res.status(400).json({
        erro: 'valorMin não pode ser maior que valorMax'
      });
    }

    // Busca as vendas aplicando os filtros.
    let sqlVendas = 'SELECT * FROM vendas WHERE 1 = 1';
    const paramsVendas = [];

    if (promotor && promotor.trim()) {
      sqlVendas += ' AND promotor = ?';
      paramsVendas.push(promotor.trim());
    }

    if (busca && busca.trim()) {
      sqlVendas += ' AND (codigo LIKE ? OR paciente LIKE ?)';
      paramsVendas.push(
        `%${busca.trim()}%`,
        `%${busca.trim()}%`
      );
    }

    if (minimo.valor !== null) {
      sqlVendas += ` AND ${totalVendaSQL} >= ?`;
      paramsVendas.push(minimo.valor);
    }

    if (maximo.valor !== null) {
      sqlVendas += ` AND ${totalVendaSQL} <= ?`;
      paramsVendas.push(maximo.valor);
    }

    sqlVendas += ' ORDER BY data_venda DESC, criado_em DESC';

    const [vendas] = await pool.query(sqlVendas, paramsVendas);

    // O filtro de mês é aplicado igualmente aos dois rankings.
    let filtroMesSQL = '';
    const paramsRanking = [];

    if (mes) {
      const primeiroDia = `${mes}-01`;

      filtroMesSQL = `
        AND data_venda >= ?
        AND data_venda < DATE_ADD(?, INTERVAL 1 MONTH)
      `;

      paramsRanking.push(primeiroDia, primeiroDia);
    }

    // Ranking de início: conta somente vendas com início maior que zero.
    const sqlRankingInicio = `
      SELECT
        promotor,
        COUNT(*) AS total_inicios
      FROM vendas
      WHERE COALESCE(inicio, 0) > 0
      ${filtroMesSQL}
      GROUP BY promotor
      ORDER BY total_inicios DESC, promotor ASC
    `;

    // Ranking de faturamento: considera todos os procedimentos.
    const sqlRankingFaturamento = `
      SELECT
        promotor,
        COUNT(*) AS total_vendas,
        SUM(${totalVendaSQL}) AS faturamento_total
      FROM vendas
      WHERE 1 = 1
      ${filtroMesSQL}
      GROUP BY promotor
      HAVING SUM(${totalVendaSQL}) > 0
      ORDER BY faturamento_total DESC, promotor ASC
    `;

    const [
      [rankingInicio],
      [rankingFaturamento]
    ] = await Promise.all([
      pool.query(sqlRankingInicio, paramsRanking),
      pool.query(sqlRankingFaturamento, paramsRanking)
    ]);

    // Cria o documento PDF.
    const doc = new PDFDocument({
      margin: 40,
      size: 'A4'
    });

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="relatorio-vendas.pdf"'
    );

    doc.pipe(res);

    const largura =
      doc.page.width -
      doc.page.margins.left -
      doc.page.margins.right;

    const moeda = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    // Escreve o texto respeitando o limite da página.
    function escreverTexto(texto, opcoes = {}) {
      const altura = doc.heightOfString(texto, {
        width: largura,
        ...opcoes
      });

      const limiteInferior =
        doc.page.height - doc.page.margins.bottom;

      if (doc.y + altura > limiteInferior) {
        doc.addPage();
      }

      doc.text(texto, {
        width: largura,
        ...opcoes
      });
    }

    // Título do relatório.
    escreverTexto('Relatório de Vendas', {
      fontSize: 18,
      align: 'center'
    });

    doc.moveDown(1.5);

    if (mes) {
      escreverTexto(`Mês de referência: ${mes}`, {
        fontSize: 10
      });
      doc.moveDown(0.8);
    }

    // Primeiro ranking: quantidade de inícios.
    escreverTexto('Ranking de Inícios', {
      fontSize: 14,
      underline: true
    });

    doc.moveDown(0.5);

    if (rankingInicio.length === 0) {
      escreverTexto(
        'Nenhum início encontrado para o período informado.',
        { fontSize: 10 }
      );
    } else {
      rankingInicio.forEach((item, indice) => {
        const quantidade = Number(item.total_inicios || 0);
        const textoQuantidade = quantidade === 1
          ? '1 início'
          : `${quantidade} inícios`;

        escreverTexto(
          `${indice + 1}º - ${item.promotor} | ${textoQuantidade}`,
          { fontSize: 10 }
        );
      });
    }

    doc.moveDown(1.2);

    // Segundo ranking: soma dos valores dos procedimentos.
    escreverTexto('Ranking de Faturamento', {
      fontSize: 14,
      underline: true
    });

    doc.moveDown(0.5);

    if (rankingFaturamento.length === 0) {
      escreverTexto(
        'Nenhum faturamento encontrado para o período informado.',
        { fontSize: 10 }
      );
    } else {
      rankingFaturamento.forEach((item, indice) => {
        const total = Number(item.faturamento_total || 0);
        const quantidade = Number(item.total_vendas || 0);
        const textoVendas = quantidade === 1
          ? '1 venda'
          : `${quantidade} vendas`;

        escreverTexto(
          `${indice + 1}º - ${item.promotor} | ` +
          `${textoVendas} | ${moeda.format(total)}`,
          { fontSize: 10 }
        );
      });
    }

    doc.moveDown(1.5);

    // Seção de vendas.
    escreverTexto('Vendas Registradas', {
      fontSize: 14,
      underline: true
    });

    doc.moveDown(0.5);

    if (vendas.length === 0) {
      escreverTexto(
        'Nenhuma venda corresponde aos filtros informados.',
        { fontSize: 10 }
      );
    } else {
      vendas.forEach((venda) => {
        const total =
          Number(venda.clinico || 0) +
          Number(venda.raspagem || 0) +
          Number(venda.inicio || 0);

        escreverTexto(
          `${venda.codigo} | ${venda.paciente} | ` +
          `${venda.promotor} | ${moeda.format(total)} | ` +
          `${venda.data_venda}`,
          { fontSize: 9 }
        );
      });
    }

    // Finaliza o PDF.
    doc.end();

  } catch (err) {
    console.error('Erro ao gerar relatório PDF:', err);

    if (!res.headersSent) {
      res.status(500).json({
        erro: 'Erro ao gerar relatório'
      });
    } else {
      res.destroy(err);
    }
  }
};
