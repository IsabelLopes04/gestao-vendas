const express = require('express');
const router = express.Router();

const promotoresController = require('../controllers/promotores.controller');


router.get('/', promotoresController.listarPromotores);
router.post('/', promotoresController.cadastrarPromotor);
router.put('/:id', promotoresController.editarPromotor);
router.patch('/:id/status', promotoresController.alterarStatusPromotor);
router.delete('/:id', promotoresController.deletarPromotor);

module.exports = router;