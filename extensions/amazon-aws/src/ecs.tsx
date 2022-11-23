import { ActionPanel, List, Action, Icon } from "@raycast/api";
import AWS from "aws-sdk";
import setupAws from "./util/setupAws";

import { useCachedPromise } from "@raycast/utils";

const preferences = setupAws();
const ecs = new AWS.ECS({ apiVersion: "2016-11-15" });

export default function ECS() {
  const { data: clusters, error, isLoading } = useCachedPromise(fetchClusters);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter instances by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {clusters?.map((c) => (
        <ECSCluster key={c.clusterArn} cluster={c} />
      ))}
    </List>
  );
}

function ECSCluster({ cluster }: { cluster: AWS.ECS.Cluster }) {
  return (
    <List.Item
      id={cluster.clusterArn}
      key={cluster.clusterArn}
      title={cluster.clusterName || "Unknown ECS name"}
      icon={Icon.Box}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://" +
              preferences.region +
              ".console.aws.amazon.com/ecs/home?region=" +
              preferences.region +
              "#clusters/" +
              cluster.clusterName
            }
          />
          <Action.CopyToClipboard title="Copy Cluster ARN" content={cluster.clusterArn || ""} />
        </ActionPanel>
      }
      accessories={[{ text: cluster.status }]}
    />
  );
}

async function fetchArns(token?: string, accClusters?: string[]): Promise<string[]> {
  const { clusterArns, nextToken } = await ecs.listClusters({ nextToken: token }).promise();
  const combinedClusters = [...(accClusters || []), ...(clusterArns || [])];

  if (nextToken) {
    return fetchArns(nextToken, combinedClusters);
  }

  return combinedClusters;
}

async function fetchClusters(): Promise<AWS.ECS.Cluster[]> {
  const clustersArns = await fetchArns();

  const { clusters } = await ecs.describeClusters({ clusters: clustersArns }).promise();
  return [...(clusters || [])];
}
