const express = require('express');
const router = express.Router();
const vendasController = require('../controllers/vendas.controller');

router.get('/', vendasController.listarVendas);
router.get('/rankingPromotores', vendasController.rankingPromotores);
router.post('/', vendasController.criarVenda);
router.put('/:id', vendasController.editarVenda);
router.delete('/:id', vendasController.deletarVenda);

module.exports = router;