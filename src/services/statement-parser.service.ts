import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { BankStatement, IParsedTransaction } from '../models/BankStatement.model';
import { Transaction } from '../models/Transaction.model';
import { generateDuplicateHash, checkDuplicates } from './transaction.service';

export interface ParsedTransaction extends IParsedTransaction {
  _tempId?: string; // Temporary ID for frontend tracking
}

/**
 * Parse CSV bank statement
 */
export const parseCSVStatement = async (
  filePath: string
): Promise<ParsedTransaction[]> => {
  const transactions: ParsedTransaction[] = [];
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const lines = fileContent.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  // Try to detect header row
  const headerRow = lines[0].toLowerCase();
  const dateCol = findColumnIndex(headerRow, ['date', 'transaction date', 'transaction_date']);
  const amountCol = findColumnIndex(headerRow, ['amount', 'transaction amount', 'transaction_amount']);
  const descriptionCol = findColumnIndex(headerRow, ['description', 'particulars', 'narration', 'details']);
  const typeCol = findColumnIndex(headerRow, ['type', 'transaction type', 'debit/credit', 'dr/cr']);
  const balanceCol = findColumnIndex(headerRow, ['balance', 'closing balance', 'closing_balance']);

  // If columns not found in header, try first data row or use defaults
  let dataStartIndex = 1;
  if (dateCol === -1 || amountCol === -1 || descriptionCol === -1) {
    // Try common CSV formats
    dataStartIndex = 0;
  }

  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);
    if (columns.length < 3) continue;

    try {
      const dateStr = dateCol >= 0 ? columns[dateCol] : columns[0];
      const amountStr = amountCol >= 0 ? columns[amountCol] : columns[1];
      const descStr = descriptionCol >= 0 ? columns[descriptionCol] : columns[2];
      const typeStr = typeCol >= 0 ? columns[typeCol] : '';
      const balanceStr = balanceCol >= 0 ? columns[balanceCol] : '';

      const date = parseDate(dateStr);
      if (!date) continue;

      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
      if (isNaN(amount) || amount === 0) continue;

      // Determine transaction type
      let type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';
      if (typeStr) {
        const typeLower = typeStr.toLowerCase();
        if (typeLower.includes('debit') || typeLower.includes('dr') || typeLower.includes('withdraw')) {
          type = 'expense';
        } else if (typeLower.includes('credit') || typeLower.includes('cr') || typeLower.includes('deposit')) {
          type = 'income';
        }
      }

      const absAmount = Math.abs(amount);
      const balance = balanceStr ? parseFloat(balanceStr.replace(/[^0-9.-]/g, '')) : undefined;

      transactions.push({
        date,
        amount: absAmount,
        description: descStr.trim(),
        type,
        balance,
        _tempId: `temp_${i}`,
      });
    } catch (error) {
      // Skip invalid rows
      continue;
    }
  }

  return transactions;
};

/**
 * Parse PDF bank statement
 */
export const parsePDFStatement = async (
  filePath: string
): Promise<ParsedTransaction[]> => {
  const dataBuffer = await fs.readFile(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text;

  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  // Common patterns for bank statements
  // Pattern 1: Date Amount Description
  // Pattern 2: Date Description Amount Balance
  // Pattern 3: DD-MM-YYYY or DD/MM/YYYY format

  let tempId = 0;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try to match transaction patterns
    const patterns = [
      // DD-MM-YYYY or DD/MM/YYYY Amount Description
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+([+-]?\d+\.?\d*)\s+(.+)/i,
      // DD-MMM-YYYY Amount Description
      /(\d{1,2}[-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]\d{2,4})\s+([+-]?\d+\.?\d*)\s+(.+)/i,
      // Description Amount Date
      /(.+?)\s+([+-]?\d+\.?\d*)\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    ];

    for (const pattern of patterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        try {
          let date: Date | null = null;
          let amount: number = 0;
          let description: string = '';

          if (match[3] && isNaN(parseFloat(match[3]))) {
            // Third group is date
            date = parseDate(match[3]);
            amount = parseFloat(match[2]);
            description = match[1];
          } else {
            // First group is date
            date = parseDate(match[1]);
            amount = parseFloat(match[2]);
            description = match[3] || match[4] || '';
          }

          if (date && !isNaN(amount) && amount !== 0 && description.trim()) {
            const type: 'income' | 'expense' = amount > 0 ? 'income' : 'expense';
            transactions.push({
              date,
              amount: Math.abs(amount),
              description: description.trim(),
              type,
              _tempId: `temp_${tempId++}`,
            });
            break; // Found a match, move to next line
          }
        } catch (error) {
          // Skip invalid matches
          continue;
        }
      }
    }
  }

  return transactions;
};

/**
 * Normalize transaction data to standard format
 */
export const normalizeTransactionData = (
  transactions: ParsedTransaction[],
  accountId: string
): ParsedTransaction[] => {
  return transactions.map((tx) => ({
    ...tx,
    description: tx.description.trim(),
    amount: Math.abs(tx.amount),
  }));
};

/**
 * Detect duplicates in parsed transactions
 */
export const detectDuplicates = async (
  userId: string,
  transactions: ParsedTransaction[],
  accountId: string
): Promise<ParsedTransaction[]> => {
  // Generate duplicate hashes for all transactions
  const transactionsWithHash = transactions.map((tx) => ({
    date: tx.date,
    amount: tx.amount,
    description: tx.description,
    accountId,
  }));

  const duplicateMap = await checkDuplicates(userId, transactionsWithHash);

  // Mark duplicates
  return transactions.map((tx) => {
    const hash = generateDuplicateHash(tx.date, tx.amount, tx.description, accountId);
    const existing = duplicateMap.get(hash);

    return {
      ...tx,
      isDuplicate: !!existing,
      matchingTransactionId: existing?._id,
    };
  });
};

/**
 * Helper: Find column index in CSV header
 */
const findColumnIndex = (header: string, keywords: string[]): number => {
  const columns = header.split(',').map((col) => col.trim().toLowerCase());
  for (const keyword of keywords) {
    const index = columns.findIndex((col) => col.includes(keyword.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
};

/**
 * Helper: Parse CSV line handling quoted values
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
};

/**
 * Helper: Parse various date formats
 */
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  // Common formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, DD-MMM-YYYY
  const formats = [
    /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/, // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})[-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s](\d{2,4})/i, // DD-MMM-YYYY
  ];

  const months: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      try {
        if (match[2] && isNaN(parseInt(match[2]))) {
          // Month name format
          const day = parseInt(match[1]);
          const month = months[match[2].toLowerCase().substring(0, 3)];
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          return new Date(year, month, day);
        } else {
          let day: number, month: number, year: number;
          if (match[0].includes(match[3]) && parseInt(match[3]) > 31) {
            // YYYY-MM-DD format
            year = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            day = parseInt(match[3]);
          } else {
            // DD-MM-YYYY format
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            year = parseInt(match[3]);
            if (year < 100) year += 2000;
          }
          return new Date(year, month, day);
        }
      } catch (error) {
        continue;
      }
    }
  }

  // Fallback to Date constructor
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
};

