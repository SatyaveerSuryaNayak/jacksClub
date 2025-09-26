import express, { Router, Request, Response } from "express";
import { PutCommand, GetCommand, QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ddbClient, ddbDocClient, TableName } from "./dynamo";
import { v4 as uuidv4 } from "uuid";
import Joi from "joi";

// Types
export type TransactionType = "CREDIT" | "DEBIT";
export type TransactionStatus = "INITIATED" | "PROCESSING" | "FAILED" | "SUCCED";

export class Transaction {
  public id: string;
  public userId: string;
  public txnType: TransactionType;
  public status: TransactionStatus;
  public externalTxnId?: string;
  public accountNumber?: string;
  public ifsc?: string;
  public idempotentKey?: string;
  public amount?: number;

  constructor(params: {
    id: string;
    userId: string;
    txnType: TransactionType;
    status: TransactionStatus;
    externalTxnId?: string;
    accountNumber?: string;
    ifsc?: string;
    idempotentKey?: string;
    amount?: number;
  }) {
    this.id = params.id;
    this.userId = params.userId;
    this.txnType = params.txnType;
    this.status = params.status;
    this.externalTxnId = params.externalTxnId;
    this.accountNumber = params.accountNumber;
    this.ifsc = params.ifsc;
    this.idempotentKey = params.idempotentKey;
    this.amount = params.amount;
  }
}

export class User {
  public id: string;
  public name: string;
  public email: string;
  public balance: number;
  public currency: string;

  constructor(params: { id: string; name: string; email: string; balance: number; currency: string }) {
    this.id = params.id;
    this.name = params.name;
    this.email = params.email;
    this.balance = params.balance;
    this.currency = params.currency;
  }
}

// Validation schemas
const initTxnSchema = Joi.object({
  type: Joi.string().valid("CR", "DR").required(),
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
  amount: Joi.number().greater(0).required(),
  accountNumber: Joi.when("type", {
    is: "DR",
    then: Joi.string().trim().required(),
    otherwise: Joi.forbidden(),
  }),
  ifsc: Joi.when("type", {
    is: "DR",
    then: Joi.string().trim().required(),
    otherwise: Joi.forbidden(),
  }),
});

const getUserTxnsParamsSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
});

const getUserTxnsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  nextToken: Joi.string().optional(),
});

const getUserParamsSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
});

const createUserSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
  name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().required(),
  initialBalance: Joi.number().min(0).default(0),
  currency: Joi.string().trim().valid("INR", "USD", "EUR").default("INR"),
});

const transactSchema = Joi.object({
  idempotentKey: Joi.string().trim().required(),
  userId: Joi.string()
    .trim()
    .pattern(/^u_[A-Za-z0-9]+$/)
    .required()
    .messages({ "string.pattern.base": "userId must match ^u_[A-Za-z0-9]+$" }),
  amount: Joi.number().greater(0).required(),
  type: Joi.string().valid("credit", "debit").required(),
});

// Input types
export type InitTxnInput = {
  type: "CR" | "DR";
  userId: string;
  amount: number;
  accountNumber?: string;
  ifsc?: string;
};

export type TransactInput = {
  idempotentKey: string;
  userId: string;
  amount: number;
  type: "credit" | "debit";
};

export type CreateUserInput = {
  userId: string;
  name: string;
  email: string;
  initialBalance?: number;
  currency?: string;
};

export type TransactResult = {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  message: string;
  existingTransaction?: Transaction;
};

// Validation middleware
function validateBody(schema: Joi.ObjectSchema<any>) {
  return (req: Request, res: Response, next: any) => {
    const { value, error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    req.body = value;
    next();
  };
}

function validateParams(schema: Joi.ObjectSchema<any>) {
  return (req: Request, res: Response, next: any) => {
    const { value, error } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    req.params = value;
    next();
  };
}

function validateQuery(schema: Joi.ObjectSchema<any>) {
  return (req: Request, res: Response, next: any) => {
    const { value, error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    (req as any).validatedQuery = value;
    next();
  };
}

// Repository functions
export async function saveTransaction(txn: Transaction): Promise<void> {
  await ddbDocClient.send(
    new PutCommand({
      TableName: TableName.Transactions,
      Item: {
        pk: `USER#${txn.userId}`,
        sk: `TXN#${txn.id}`,
        id: txn.id,
        userId: txn.userId,
        txnType: txn.txnType,
        status: txn.status,
        externalTxnId: txn.externalTxnId,
        accountNumber: txn.accountNumber,
        ifsc: txn.ifsc,
      },
    })
  );
}

export async function getTransactionById(userId: string, id: string): Promise<Transaction | null> {
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TableName.Transactions,
      Key: { pk: `USER#${userId}`, sk: `TXN#${id}` },
    })
  );
  const item = result.Item as any;
  if (!item) return null;
  return new Transaction({
    id: item.id,
    userId: item.userId,
    txnType: item.txnType,
    status: item.status,
    externalTxnId: item.externalTxnId,
    accountNumber: item.accountNumber,
    ifsc: item.ifsc,
  });
}

export async function listTransactionsByUser(
  userId: string,
  limit = 20,
  nextToken?: string
): Promise<{ items: Transaction[]; nextToken?: string }> {
  const exclusiveStartKey = nextToken
    ? (JSON.parse(Buffer.from(nextToken, "base64").toString("utf-8")) as any)
    : undefined;

  const result = await ddbDocClient.send(
    new QueryCommand({
      TableName: TableName.Transactions,
      KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "TXN#",
      },
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
      ScanIndexForward: false,
    })
  );

  const items: Transaction[] = (result.Items || []).map((item: any) =>
    new Transaction({
      id: item.id,
      userId: item.userId,
      txnType: item.txnType,
      status: item.status,
      externalTxnId: item.externalTxnId,
    })
  );

  const newToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
    : undefined;

  return { items, nextToken: newToken };
}

export async function saveUser(user: User): Promise<void> {
  await ddbDocClient.send(
    new PutCommand({
      TableName: TableName.Users,
      Item: {
        pk: `USER#${user.id}`,
        sk: `USER#${user.id}`,
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        currency: user.currency,
      },
    })
  );
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await ddbDocClient.send(
    new GetCommand({
      TableName: TableName.Users,
      Key: { pk: `USER#${id}`, sk: `USER#${id}` },
    })
  );

  const item = result.Item as any;
  if (!item) return null;
  return new User({
    id: item.id,
    name: item.name,
    email: item.email,
    balance: item.balance,
    currency: item.currency,
  });
}

// Transaction service
export async function findTransactionByIdempotentKey(idempotentKey: string): Promise<Transaction | null> {
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

export async function processAtomicTransaction(params: {
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

export async function createUser(input: CreateUserInput): Promise<{ success: boolean; message: string; user?: User }> {
  const { userId, name, email, initialBalance = 0, currency = "INR" } = input;

  // Check if user already exists
  const existingUser = await getUserById(userId);
  if (existingUser) {
    return {
      success: false,
      message: "User already exists",
    };
  }

  try {
    const newUser = new User({
      id: userId,
      name,
      email,
      balance: initialBalance,
      currency,
    });

    await saveUser(newUser);

    return {
      success: true,
      message: "User created successfully",
      user: newUser,
    };
  } catch (error) {
    console.error("User creation failed:", error);
    return {
      success: false,
      message: "User creation failed",
    };
  }
}

export async function transact(input: TransactInput): Promise<TransactResult> {
  const { idempotentKey, userId, amount, type } = input;
  
  // Validation for user existence
  const user = await getUserById(userId);
  if (!user) {
    return {
      success: false,
      message: "User not found",
    };
  }

  // Check for existing transaction with same idempotent key
  const existingTxn = await findTransactionByIdempotentKey(idempotentKey);
  if (existingTxn) {
    return {
      success: true,
      transactionId: existingTxn.id,
      newBalance: user.balance,
      message: "Transaction already processed",
      existingTransaction: existingTxn,
    };
  }

  // Validation for amount
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
   
    await processAtomicTransaction({
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
      const existingTxn = await findTransactionByIdempotentKey(idempotentKey);
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

// Router setup
export function createTransactionRouter(): Router {
  const router = Router();

  // Routes
  router.post("/initCrDr", validateBody(initTxnSchema), async (req: Request, res: Response) => {
    try {
      const { userId, amount, type, accountNumber, ifsc } = req.body as InitTxnInput;

      return res.status(200).json({
        status: "ok",
        action: "initCrDr",
        data: { userId, amount, type, accountNumber, ifsc },
      });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  });

  router.post("/transact", validateBody(transactSchema), async (req: Request, res: Response) => {
    try {
      const input = req.body as TransactInput;
      const result = await transact(input);

      if (result.success) {
        return res.status(200).json({
          status: "ok",
          data: {
            transactionId: result.transactionId,
            newBalance: result.newBalance,
            message: result.message,
            existingTransaction: result.existingTransaction,
          },
        });
      } else {
        return res.status(400).json({
          status: "error",
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Transaction error:", error);
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  });

  router.get(
    "/users/:userId/transactions",
    validateParams(getUserTxnsParamsSchema),
    validateQuery(getUserTxnsQuerySchema),
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params as { userId: string };
        const validatedQuery = (req as any).validatedQuery;
        const limit = validatedQuery.limit || 20;
        const nextToken = validatedQuery.nextToken;

        if (Number.isNaN(limit) || limit <= 0 || limit > 100) {
          return res.status(400).json({ status: "error", message: "limit must be 1-100" });
        }

        const result = await listTransactionsByUser(userId, limit, nextToken);
        return res.status(200).json({ status: "ok", ...result });
      } catch (error) {
        return res.status(500).json({ status: "error", message: "Internal Server Error" });
      }
    }
  );

  router.get("/users/:userId", validateParams(getUserParamsSchema), async (req: Request, res: Response) => {
    try {
      const { userId } = req.params as { userId: string };
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ status: "error", message: "User not found" });
      }

      return res.status(200).json({ status: "ok", data: user });
    } catch (error) {
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  });

  router.post("/users", validateBody(createUserSchema), async (req: Request, res: Response) => {
    try {
      const input = req.body as CreateUserInput;
      const result = await createUser(input);

      if (result.success) {
        return res.status(201).json({
          status: "ok",
          message: result.message,
          data: result.user,
        });
      } else {
        const statusCode = result.message === "User already exists" ? 409 : 400;
        return res.status(statusCode).json({
          status: "error",
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({ status: "error", message: "Internal Server Error" });
    }
  });

  return router;
}
