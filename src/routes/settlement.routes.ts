import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getPendingBalancesHandler,
  createSettlementHandler,
  settleBalanceHandler,
  getSettlementHistoryHandler,
  getPendingSettlementsHandler,
  getSettlementByIdHandler,
} from '../controllers/settlement.controller';

const router = express.Router();

router.use(authenticate);

router.get('/pending', getPendingBalancesHandler);
router.get('/history', getSettlementHistoryHandler);
router.get('/pending-list', getPendingSettlementsHandler);
router.get('/:id', getSettlementByIdHandler);
router.post('/', createSettlementHandler);
router.put('/:id/settle', settleBalanceHandler);

export default router;

