const pool = require('../db');
const PDFDocument = require('pdfkit');

exports.gerarRelatorioPDF = async (req, res) => {
  try {
    const { promotor, busca, valorMin, valorMax, mes } = req.query;

    // --- Busca vendas filtradas ---
    let sqlVendas = 'SELECT * FROM vendas WHERE 1=1';
    const paramsVendas = [];
    if (promotor) { sqlVendas += ' AND promotor = ?'; paramsVendas.push(promotor); }
    if (busca) { sqlVendas += ' AND (codigo LIKE ? OR paciente LIKE ?)'; paramsVendas.push(`%${busca}%`, `%${busca}%`); }
    if (valorMin) { sqlVendas += ' AND (clinico + raspagem + inicio) >= ?'; paramsVendas.push(valorMin); }
    if (valorMax) { sqlVendas += ' AND (clinico + raspagem + inicio) <= ?'; paramsVendas.push(valorMax); }
    sqlVendas += ' ORDER BY criado_em DESC';
    const [vendas] = await pool.query(sqlVendas, paramsVendas);

    // --- Busca ranking de promotores ---
    let sqlRanking = `
      SELECT promotor, COUNT(*) AS total_vendas, SUM(clinico + raspagem + inicio) AS faturamento_total
      FROM vendas WHERE 1=1
    `;
    const paramsRanking = [];
    if (mes) { sqlRanking += ' AND DATE_FORMAT(data_venda, "%Y-%m") = ?'; paramsRanking.push(mes); }
    sqlRanking += ' GROUP BY promotor ORDER BY faturamento_total DESC';
    const [ranking] = await pool.query(sqlRanking, paramsRanking);

    // --- Monta o PDF ---
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio-vendas.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Relatório de Vendas', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).text('Ranking de Promotores', { underline: true });
    doc.moveDown(0.5);
    ranking.forEach((r, i) => {
      doc.fontSize(11).text(
        `${i + 1}º - ${r.promotor}  |  ${r.total_vendas} vendas  |  R$ ${Number(r.faturamento_total).toFixed(2)}`
      );
    });
    doc.moveDown(1.5);

    doc.fontSize(14).text('Vendas Registradas', { underline: true });
    doc.moveDown(0.5);
    vendas.forEach((v) => {
      const total = Number(v.clinico) + Number(v.raspagem) + Number(v.inicio);
      doc.fontSize(10).text(
        `${v.codigo} | ${v.paciente} | ${v.promotor} | Total: R$ ${total.toFixed(2)} | ${v.data_venda}`
      );
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao gerar relatório' });
  }
};