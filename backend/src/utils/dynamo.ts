import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config.js';
import { getStore } from './store.js';

type TableName = 'users' | 'materials' | 'requests' | 'favorites' | 'matches' | 'conversations' | 'messages';

const client = config.dynamoEnabled ? DynamoDBDocumentClient.from(new DynamoDBClient({})) : null;
const tableNames: Record<TableName, string> = {
  users: `${config.dynamoTablePrefix}Users`,
  materials: `${config.dynamoTablePrefix}Materials`,
  requests: `${config.dynamoTablePrefix}Requests`,
  favorites: `${config.dynamoTablePrefix}Favorites`,
  matches: `${config.dynamoTablePrefix}Matches`,
  conversations: `${config.dynamoTablePrefix}Conversations`,
  messages: `${config.dynamoTablePrefix}Messages`,
};

export function persistItem(table: TableName, item: Record<string, unknown>) {
  if (!client) return;
  void client.send(new PutCommand({ TableName: tableNames[table], Item: item })).catch((error) => {
    console.error(`DynamoDB write failed for ${tableNames[table]}`, error);
  });
}

export function removeItem(table: TableName, id: string) {
  if (!client) return;
  void client.send(new DeleteCommand({ TableName: tableNames[table], Key: { id } })).catch((error) => {
    console.error(`DynamoDB delete failed for ${tableNames[table]}`, error);
  });
}

export async function hydrateStore() {
  if (!client) return;
  const store = getStore();
  for (const table of Object.keys(tableNames) as TableName[]) {
    const result = await client.send(new ScanCommand({ TableName: tableNames[table] }));
    for (const item of result.Items ?? []) {
      if (!item.id) continue;
      store[table].set(String(item.id), item as never);
    }
  }
}

export function isDynamoEnabled() {
  return Boolean(client);
}

export async function persistItemAndWait(table: TableName, item: Record<string, unknown>) {
  if (!client) return;
  await client.send(new PutCommand({ TableName: tableNames[table], Item: item }));
}