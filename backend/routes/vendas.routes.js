const express = require('express');
const router = express.Router();
const vendasController = require('../controllers/vendas.controller');

router.get('/', vendasController.listarVendas);
router.post('/', vendasController.criarVenda);
router.delete('/:id', vendasController.deletarVenda);

module.exports = router;