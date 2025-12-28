import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createSplitTransactionHandler,
  getSplitDetailsHandler,
  updateSplitTransactionHandler,
  removeSplitHandler,
} from '../controllers/split.controller';

const router = express.Router();

router.use(authenticate);

router.post('/', createSplitTransactionHandler);
router.get('/:transactionId', getSplitDetailsHandler);
router.put('/:transactionId', updateSplitTransactionHandler);
router.delete('/:transactionId', removeSplitHandler);

export default router;

