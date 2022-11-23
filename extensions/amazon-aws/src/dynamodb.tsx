import { ActionPanel, List, Action, Icon } from "@raycast/api";
import AWS from "aws-sdk";

import setupAws, { AWS_URL_BASE } from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const { region } = setupAws();
const dynamoDB = new AWS.DynamoDB();

export default function DynamoDb() {
  const { data: tables, isLoading, error } = useCachedPromise(fetchTables);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tables by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {tables?.map((i, index) => (
        <DynamoDbTable key={index} tableName={i} />
      ))}
    </List>
  );
}

function DynamoDbTable({ tableName }: { tableName: AWS.DynamoDB.TableName }) {
  return (
    <List.Item
      title={tableName || "Unknown Table name"}
      icon={Icon.HardDrive}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${AWS_URL_BASE}/dynamodbv2/home?region=${region}#table?name=${tableName}`}
          />
          <Action.CopyToClipboard title="Copy Table Name" content={tableName || ""} />
        </ActionPanel>
      }
    />
  );
}

async function fetchTables(token?: string, accTables?: AWS.DynamoDB.TableName[]): Promise<AWS.DynamoDB.TableName[]> {
  const { LastEvaluatedTableName, TableNames } = await dynamoDB
    .listTables({ ExclusiveStartTableName: token })
    .promise();
  const combinedTables = [...(accTables || []), ...(TableNames || [])];

  if (LastEvaluatedTableName) {
    return fetchTables(LastEvaluatedTableName, combinedTables);
  }

  return combinedTables;
}
