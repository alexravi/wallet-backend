import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { BankStatement } from '../models/BankStatement.model';
import {
  parseCSVStatement,
  parsePDFStatement,
  detectDuplicates,
  ParsedTransaction,
} from '../services/statement-parser.service';
import {
  createTransactions,
  CreateTransactionData,
} from '../services/transaction.service';
import { getBankAccountById } from '../services/account.service';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'statements');

// Ensure upload directory exists
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

/**
 * Upload bank statement
 */
export const uploadStatementHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const bankAccountId = req.body.bankAccountId;

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    // Verify bank account exists and belongs to user
    const bankAccount = await getBankAccountById(bankAccountId, userId);
    if (!bankAccount) {
      // Delete uploaded file if account doesn't exist
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(404).json({
        error: 'Bank account not found',
      });
    }

    const fileType = req.file.originalname.endsWith('.pdf') ? 'pdf' : 'csv';

    const statement = new BankStatement({
      userId,
      bankAccountId,
      fileName: req.file.originalname,
      fileType,
      filePath: req.file.path,
      uploadDate: new Date(),
      parseStatus: 'pending',
      transactionCount: 0,
      parsedTransactions: [],
    });

    await statement.save();

    res.status(201).json({
      message: 'Statement uploaded successfully',
      data: statement,
    });
  } catch (error: any) {
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(400).json({
      error: error.message || 'Failed to upload statement',
    });
  }
};

/**
 * Parse uploaded statement
 */
export const parseStatementHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statementId = req.params.id;

    const statement = await BankStatement.findOne({
      _id: statementId,
      userId,
    });

    if (!statement) {
      return res.status(404).json({
        error: 'Statement not found',
      });
    }

    if (!statement.filePath) {
      return res.status(400).json({
        error: 'File path not found',
      });
    }

    // Update status to parsing
    statement.parseStatus = 'parsing';
    await statement.save();

    try {
      let parsedTransactions;

      // Parse based on file type
      if (statement.fileType === 'pdf') {
        parsedTransactions = await parsePDFStatement(statement.filePath);
      } else {
        parsedTransactions = await parseCSVStatement(statement.filePath);
      }

      // Detect duplicates
      const transactionsWithDuplicates = await detectDuplicates(
        userId,
        parsedTransactions,
        statement.bankAccountId.toString()
      );

      // Update statement with parsed transactions
      statement.parsedTransactions = transactionsWithDuplicates;
      statement.transactionCount = transactionsWithDuplicates.length;
      statement.parseStatus = 'completed';
      await statement.save();

      res.json({
        message: 'Statement parsed successfully',
        data: {
          statement,
          transactions: transactionsWithDuplicates,
          duplicateCount: transactionsWithDuplicates.filter((tx) => tx.isDuplicate).length,
        },
      });
    } catch (parseError: any) {
      statement.parseStatus = 'failed';
      statement.errorMessage = parseError.message;
      await statement.save();

      res.status(500).json({
        error: parseError.message || 'Failed to parse statement',
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to parse statement',
    });
  }
};

/**
 * Get parsed transactions for review
 */
export const getParsedTransactionsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statementId = req.params.id;

    const statement = await BankStatement.findOne({
      _id: statementId,
      userId,
    });

    if (!statement) {
      return res.status(404).json({
        error: 'Statement not found',
      });
    }

    if (statement.parseStatus !== 'completed') {
      return res.status(400).json({
        error: 'Statement parsing not completed',
      });
    }

    res.json({
      message: 'Parsed transactions retrieved successfully',
      data: {
        statement,
        transactions: statement.parsedTransactions,
        duplicateCount: statement.parsedTransactions.filter((tx) => tx.isDuplicate).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || 'Failed to retrieve parsed transactions',
    });
  }
};

/**
 * Edit a parsed transaction before confirmation
 */
export const editParsedTransactionHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statementId = req.params.id;
    const transactionId = req.params.transactionId;

    const statement = await BankStatement.findOne({
      _id: statementId,
      userId,
    });

    if (!statement) {
      return res.status(404).json({
        error: 'Statement not found',
      });
    }

    if (statement.parseStatus !== 'completed') {
      return res.status(400).json({
        error: 'Statement parsing not completed',
      });
    }

    const transactionIndex = statement.parsedTransactions.findIndex(
      (tx) => (tx as ParsedTransaction)._tempId === transactionId || (tx as any)._id?.toString() === transactionId
    );

    if (transactionIndex === -1) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    // Update transaction
    const transaction = statement.parsedTransactions[transactionIndex];
    if (req.body.date) transaction.date = new Date(req.body.date);
    if (req.body.amount !== undefined) transaction.amount = req.body.amount;
    if (req.body.description) transaction.description = req.body.description;
    if (req.body.type) transaction.type = req.body.type;
    if (req.body.referenceNumber !== undefined) transaction.referenceNumber = req.body.referenceNumber;

    // Re-check for duplicates after edit
    const transactionsWithDuplicates = await detectDuplicates(
      userId,
      [transaction],
      statement.bankAccountId.toString()
    );
    statement.parsedTransactions[transactionIndex] = transactionsWithDuplicates[0];

    await statement.save();

    res.json({
      message: 'Transaction updated successfully',
      data: statement.parsedTransactions[transactionIndex],
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to update transaction',
    });
  }
};

/**
 * Confirm and save parsed transactions
 */
export const confirmParsedTransactionsHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const statementId = req.params.id;
    const { transactionIds, skipDuplicates } = req.body;

    const statement = await BankStatement.findOne({
      _id: statementId,
      userId,
    });

    if (!statement) {
      return res.status(404).json({
        error: 'Statement not found',
      });
    }

    if (statement.parseStatus !== 'completed') {
      return res.status(400).json({
        error: 'Statement parsing not completed',
      });
    }

    // Get transactions to import
    let transactionsToImport = statement.parsedTransactions;

    // If specific transaction IDs provided, filter them
    if (Array.isArray(transactionIds) && transactionIds.length > 0) {
      transactionsToImport = statement.parsedTransactions.filter((tx) =>
        transactionIds.includes((tx as ParsedTransaction)._tempId || (tx as any)._id?.toString())
      );
    }

    // Skip duplicates if requested
    if (skipDuplicates) {
      transactionsToImport = transactionsToImport.filter((tx) => !tx.isDuplicate);
    }

    // Get currency from bank account first
    const bankAccount = await getBankAccountById(statement.bankAccountId.toString(), userId);
    if (!bankAccount) {
      return res.status(404).json({
        error: 'Bank account not found',
      });
    }

    // Convert to CreateTransactionData format
    const transactionData: CreateTransactionData[] = transactionsToImport.map((tx) => ({
      userId,
      accountId: statement.bankAccountId.toString(),
      accountType: 'bank',
      type: tx.type,
      amount: tx.amount,
      currency: bankAccount.currency,
      description: tx.description,
      date: tx.date,
      referenceNumber: tx.referenceNumber,
    }));

    // Create transactions
    const result = await createTransactions(transactionData, skipDuplicates || false);

    // Update bank account balance
    if (bankAccount && result.created.length > 0) {
      const balanceChange = result.created.reduce((sum, tx) => {
        if (tx.type === 'income') return sum + tx.amount;
        if (tx.type === 'expense') return sum - tx.amount;
        return sum;
      }, 0);

      const { updateBankAccountBalance } = await import('../services/account.service');
      await updateBankAccountBalance(statement.bankAccountId.toString(), balanceChange);
    }

    res.json({
      message: 'Transactions imported successfully',
      data: {
        created: result.created.length,
        skipped: result.skipped,
        duplicates: result.duplicates,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Failed to confirm transactions',
    });
  }
};

