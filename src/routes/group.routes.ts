import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createGroupHandler,
  getGroupsHandler,
  getGroupByIdHandler,
  updateGroupHandler,
  deleteGroupHandler,
  addGroupMemberHandler,
  removeGroupMemberHandler,
  getGroupSummaryHandler,
  getGroupTransactionsHandler,
} from '../controllers/group.controller';

const router = express.Router();

router.use(authenticate);

router.post('/', createGroupHandler);
router.get('/', getGroupsHandler);
router.get('/:id', getGroupByIdHandler);
router.put('/:id', updateGroupHandler);
router.delete('/:id', deleteGroupHandler);
router.post('/:id/members', addGroupMemberHandler);
router.delete('/:id/members/:personId', removeGroupMemberHandler);
router.get('/:id/summary', getGroupSummaryHandler);
router.get('/:id/transactions', getGroupTransactionsHandler);

export default router;

