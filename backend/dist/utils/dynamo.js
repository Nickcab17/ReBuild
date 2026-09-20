import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config.js';
import { getStore } from './store.js';
const client = config.dynamoEnabled ? DynamoDBDocumentClient.from(new DynamoDBClient({})) : null;
const tableNames = {
    users: `${config.dynamoTablePrefix}Users`,
    materials: `${config.dynamoTablePrefix}Materials`,
    requests: `${config.dynamoTablePrefix}Requests`,
    favorites: `${config.dynamoTablePrefix}Favorites`,
    matches: `${config.dynamoTablePrefix}Matches`,
};
export function persistItem(table, item) {
    if (!client)
        return;
    void client.send(new PutCommand({ TableName: tableNames[table], Item: item })).catch((error) => {
        console.error(`DynamoDB write failed for ${tableNames[table]}`, error);
    });
}
export function removeItem(table, id) {
    if (!client)
        return;
    void client.send(new DeleteCommand({ TableName: tableNames[table], Key: { id } })).catch((error) => {
        console.error(`DynamoDB delete failed for ${tableNames[table]}`, error);
    });
}
export async function hydrateStore() {
    if (!client)
        return;
    const store = getStore();
    for (const table of Object.keys(tableNames)) {
        const result = await client.send(new ScanCommand({ TableName: tableNames[table] }));
        for (const item of result.Items ?? []) {
            if (!item.id)
                continue;
            store[table].set(String(item.id), item);
        }
    }
}
export function isDynamoEnabled() {
    return Boolean(client);
}
