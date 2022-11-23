import { ActionPanel, List, Action, Icon } from "@raycast/api";
import * as AWS from "aws-sdk";
import { StackSummary } from "aws-sdk/clients/cloudformation";
import setupAws, { AWS_URL_BASE } from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const { region } = setupAws();
const cloudformation = new AWS.CloudFormation({ apiVersion: "2016-11-15" });

export default function CloudFormation() {
  const { data: stacks, error, isLoading } = useCachedPromise(fetchStacks);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter stacks by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {stacks?.map((s) => (
        <CloudFormationStack key={s.StackId} stack={s} />
      ))}
    </List>
  );
}

function CloudFormationStack({ stack }: { stack: StackSummary }) {
  return (
    <List.Item
      id={stack.StackName}
      key={stack.StackId}
      icon={Icon.AppWindowGrid3x3}
      title={stack.StackName}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${AWS_URL_BASE}/cloudformation/home?region=${region}#/stacks/stackinfo?stackId=${encodeURIComponent(
              stack.StackId as string
            )}`}
          />
          <Action.CopyToClipboard title="Copy Stack ID" content={stack.StackId || ""} />
        </ActionPanel>
      }
      accessories={[{ date: stack.LastUpdatedTime || stack.CreationTime }]}
    />
  );
}

async function fetchStacks(token?: string, stacks?: StackSummary[]): Promise<StackSummary[]> {
  const { NextToken, StackSummaries } = await cloudformation.listStacks({ NextToken: token }).promise();
  const combinedStacks = [...(stacks || []), ...(StackSummaries || [])];

  if (NextToken) {
    return fetchStacks(NextToken, combinedStacks);
  }

  return combinedStacks.filter((stack) => stack.StackStatus !== "DELETE_COMPLETE");
}
