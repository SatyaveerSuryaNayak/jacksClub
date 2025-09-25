import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddbDocClient } from "../database/dynamo.db";
import { User } from "../models/user.model";
import { TableName } from "../constants/constant";

const TABLE_NAME = TableName.Users;

export class UserRepository {
  public async save(user: User): Promise<void> {
    await ddbDocClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
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

  public async getById(id: string): Promise<User | null> {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
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
}

export const userRepository = new UserRepository();


