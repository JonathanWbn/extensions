import { ActionPanel, List, Action, Icon } from "@raycast/api";
import * as AWS from "aws-sdk";
import setupAws, { AWS_URL_BASE } from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";
import { PipelineSummary } from "aws-sdk/clients/codepipeline";

const { region } = setupAws();
const pipeline = new AWS.CodePipeline({ apiVersion: "2016-11-15" });

export default function CodePipeline() {
  const { data: pipelines, error, isLoading } = useCachedPromise(fetchPipelines);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter codepipelines by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {pipelines?.map((i) => (
        <CodePipelineListItem key={i.name} pipeline={i} />
      ))}
    </List>
  );
}

function CodePipelineListItem({ pipeline }: { pipeline: PipelineSummary }) {
  const { data: execution } = useCachedPromise(fetchExecutionState, [pipeline.name]);

  const status = execution?.status || "Idle";
  const name = pipeline.name || "";

  return (
    <List.Item
      id={pipeline.name}
      key={pipeline.name}
      title={name}
      icon={Icon.List}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${AWS_URL_BASE}/codesuite/codepipeline/pipelines/${name}/view?region=${region}`}
          />
          <Action.CopyToClipboard title="Copy Pipeline Name" content={name} />
        </ActionPanel>
      }
      accessories={[{ date: pipeline.updated || pipeline.created }, { icon: iconMap[status], tooltip: status }]}
    />
  );
}

const iconMap: { [key: string]: Icon } = {
  Failed: Icon.ExclamationMark,
  Idle: Icon.Circle,
  InProgress: Icon.CircleProgress50,
  Succeeded: Icon.CircleProgress100,
  Stopped: Icon.CircleFilled,
};

async function fetchPipelines(token?: string, accPipelines?: PipelineSummary[]): Promise<PipelineSummary[]> {
  const { nextToken, pipelines } = await pipeline.listPipelines({ nextToken: token }).promise();
  const combinedPipelines = [...(accPipelines || []), ...(pipelines || [])];

  if (nextToken) {
    return fetchPipelines(nextToken, combinedPipelines);
  }

  return combinedPipelines.filter((p) => !!p.name);
}

async function fetchExecutionState(pipelineName?: string) {
  if (!pipelineName) {
    return;
  }
  const { pipelineExecutionSummaries } = await pipeline.listPipelineExecutions({ pipelineName }).promise();
  return pipelineExecutionSummaries?.[0];
}
