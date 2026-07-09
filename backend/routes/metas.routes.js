const express = require('express');
const router = express.Router();
const metasController = require('../controllers/metas.controller');

router.get('/', metasController.listarMetas);
router.post('/', metasController.criarOuAtualizarMeta);
router.delete('/:id', metasController.deletarMeta);

module.exports = router;