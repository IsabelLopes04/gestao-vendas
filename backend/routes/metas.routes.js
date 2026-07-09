const express = require('express');
const router = express.Router();
const relatoriosController = require('../controllers/relatorios.controller');

router.get('/pdf', relatoriosController.gerarRelatorioPDF);

module.exports = router;