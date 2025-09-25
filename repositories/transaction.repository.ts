import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../database/dynamo.db";
import { Transaction } from "../models/transaction.model";
import { TableName } from "../constants/constant";

const TABLE_NAME = TableName.Transactions;

export class TransactionRepository {
  public async save(txn: Transaction): Promise<void> {
    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
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

  public async getById(userId: string, id: string): Promise<Transaction | null> {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
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

  public async listByUser(userId: string, limit = 20): Promise<Transaction[]> {
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk and begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":sk": "TXN#",
        },
        Limit: limit,
        ScanIndexForward: false,
      })
    );
    return (
      result.Items || []
    ).map((item: any) =>
      new Transaction({
        id: item.id,
        userId: item.userId,
        txnType: item.txnType,
        status: item.status,
        externalTxnId: item.externalTxnId,
        accountNumber: item.accountNumber,
        ifsc: item.ifsc,
      })
    );
  }

  public async listByUserPaginated(
    userId: string,
    limit = 20,
    nextToken?: string
  ): Promise<{ items: Transaction[]; nextToken?: string }> {
    const exclusiveStartKey = nextToken
      ? (JSON.parse(Buffer.from(nextToken, "base64").toString("utf-8")) as any)
      : undefined;

    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
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
}

export const transactionRepository = new TransactionRepository();


