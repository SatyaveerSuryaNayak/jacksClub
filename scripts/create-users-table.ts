import { CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { ddbClient } from "../database/dynamo.db";
import { TableName } from "../constants/constant";

const TABLE_NAME = TableName.Users;

async function ensureUsersTable(): Promise<void> {
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table '${TABLE_NAME}' already exists.`);
    return;
  } catch (_) {
    // continue to create
  }

  await ddbClient.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  console.log(`Table '${TABLE_NAME}' created.`);
}

ensureUsersTable().catch((err) => {
  console.error("Failed to ensure Users table:", err);
  process.exit(1);
});


