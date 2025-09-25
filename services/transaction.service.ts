import { Transaction, TransactionType, TransactionStatus } from "../models/transaction.model";
import { User } from "../models/user.model";
import { transactionRepository } from "../repositories/transaction.repository";
import { userRepository } from "../repositories/user.repository";
import { ddbDocClient } from "../database/dynamo.db";
import { PutCommand, GetCommand, UpdateCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { TableName } from "../constants/constant";
import { v4 as uuidv4 } from "uuid";

export type TransactInput = {
  idempotentKey: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
};

export type TransactResult = {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  message: string;
  existingTransaction?: Transaction;
};

export class TransactionService {
  public async transact(input: TransactInput): Promise<TransactResult> {
    const { idempotentKey, userId, amount, type } = input;
    
    // Validation for  user exististence
    const user = await userRepository.getById(userId);
    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Check for existing transaction with same idempotent key
    const existingTxn = await this.findTransactionByIdempotentKey(idempotentKey);
    if (existingTxn) {
      return {
        success: true,
        transactionId: existingTxn.id,
        newBalance: user.balance,
        message: "Transaction already processed",
        existingTransaction: existingTxn,
      };
    }

    // Validation for  amount
    if (amount <= 0) {
      return {
        success: false,
        message: "Amount must be greater than 0",
      };
    }

    // Converting type to uppercase for consistency
    const txnType: TransactionType = type.toUpperCase() as TransactionType;
    
    // Validating balance for debit transactions
    if (txnType === "DEBIT" && user.balance < amount) {
      return {
        success: false,
        message: "Insufficient balance",
      };
    }

    // Generating transaction ID
    const transactionId = uuidv4();
    
    // Calculate new balance
    const balanceChange = txnType === "CREDIT" ? amount : -amount;
    const newBalance = user.balance + balanceChange;

    try {
      // Atomic transaction: create transaction record and update user balance
      await this.processAtomicTransaction({
        transactionId,
        userId,
        txnType,
        amount,
        idempotentKey,
        newBalance,
        user,
      });

      return {
        success: true,
        transactionId,
        newBalance,
        message: "Transaction processed successfully",
      };
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        // Race condition detected - check if transaction was created by another process
        const existingTxn = await this.findTransactionByIdempotentKey(idempotentKey);
        if (existingTxn) {
          return {
            success: true,
            transactionId: existingTxn.id,
            newBalance: user.balance,
            message: "Transaction already processed by another process",
            existingTransaction: existingTxn,
          };
        }
      }

      console.error("Transaction processing failed:", error);
      return {
        success: false,
        message: "Transaction processing failed",
      };
    }
  }

  /**
   * Find transaction by idempotent key
   */
  private async findTransactionByIdempotentKey(idempotentKey: string): Promise<Transaction | null> {
    try {
      const result = await ddbDocClient.send(
        new GetCommand({
          TableName: TableName.Transactions,
          Key: {
            pk: `IDEMPOTENT#${idempotentKey}`,
            sk: `IDEMPOTENT#${idempotentKey}`,
          },
        })
      );

      if (!result.Item) return null;

      return new Transaction({
        id: result.Item.id,
        userId: result.Item.userId,
        txnType: result.Item.txnType,
        status: result.Item.status,
        amount: result.Item.amount,
        idempotentKey: result.Item.idempotentKey,
      });
    } catch (error) {
      return null;
    }
  }


  private async processAtomicTransaction(params: {
    transactionId: string;
    userId: string;
    txnType: TransactionType;
    amount: number;
    idempotentKey: string;
    newBalance: number;
    user: User;
  }): Promise<void> {
    const { transactionId, userId, txnType, amount, idempotentKey, newBalance, user } = params;

    
    await ddbDocClient.send(
      new TransactWriteCommand({
        TransactItems: [
         
          {
            Put: {
              TableName: TableName.Transactions,
              Item: {
                pk: `USER#${userId}`,
                sk: `TXN#${transactionId}`,
                id: transactionId,
                userId,
                txnType,
                status: "SUCCED",
                amount,
                idempotentKey,
              },
              ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            },
          },
          {
            Put: {
              TableName: TableName.Transactions,
              Item: {
                pk: `IDEMPOTENT#${idempotentKey}`,
                sk: `IDEMPOTENT#${idempotentKey}`,
                id: transactionId,
                userId,
                txnType,
                status: "SUCCED",
                amount,
                idempotentKey,
              },
              ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
            },
          },
          {
            Update: {
              TableName: TableName.Users,
              Key: {
                pk: `USER#${userId}`,
                sk: `USER#${userId}`,
              },
              UpdateExpression: "SET balance = :newBalance",
              ConditionExpression: "balance = :currentBalance",
              ExpressionAttributeValues: {
                ":newBalance": newBalance,
                ":currentBalance": user.balance,
              },
            },
          },
        ],
      })
    );
  }
}

export const transactionService = new TransactionService();
