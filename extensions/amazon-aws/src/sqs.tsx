import { ActionPanel, List, Action, confirmAlert, Toast, showToast, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWS from "aws-sdk";
import setupAws, { AWS_URL_BASE } from "./util/setupAws";

const { region } = setupAws();
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

export default function SQS() {
  const { data: queues, error, isLoading } = useCachedPromise(fetchQueues);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter queues by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {queues?.map((queue) => (
        <SQSQueue key={queue} queue={queue} />
      ))}
    </List>
  );
}

function SQSQueue({ queue }: { queue: string }) {
  const { data: attributes, revalidate } = useCachedPromise(fetchQueueAttributes, [queue]);

  function handlePurgeQueueAction() {
    confirmAlert({
      title: "Are you sure you want to purge the queue?",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Purge",
        onAction: async () => {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Purging queue..." });

          try {
            await sqs.purgeQueue({ QueueUrl: queue }).promise();
            toast.style = Toast.Style.Success;
            toast.title = "Purged queue";
          } catch (err) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to purge queue";
          } finally {
            revalidate();
          }
        },
      },
    });
  }

  return (
    <List.Item
      id={queue}
      key={queue}
      title={queue.slice(queue.lastIndexOf("/") + 1)}
      icon={Icon.Forward}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            shortcut={{ modifiers: [], key: "enter" }}
            url={`${AWS_URL_BASE}/sqs/v2/home?region=${region}#/queues/${encodeURIComponent(queue)}`}
          />
          <Action.CopyToClipboard title="Copy Queue URL" content={queue} />
          <Action.SubmitForm
            icon={Icon.Trash}
            title={`Purge Queue (${attributes?.ApproximateNumberOfMessages || "..."})`}
            onSubmit={handlePurgeQueueAction}
          />
        </ActionPanel>
      }
      accessories={[
        {
          icon: Icon.Message,
          text: attributes?.ApproximateNumberOfMessages || "",
          tooltip: "Messages available",
        },
        {
          icon: Icon.AirplaneLanding,
          text: attributes?.ApproximateNumberOfMessagesNotVisible || "...",
          tooltip: "Messages in flight",
        },
        {
          date: attributes && new Date(Number.parseInt(attributes.CreatedTimestamp) * 1000),
          tooltip: "Creation Time",
        },
      ]}
    />
  );
}

async function fetchQueues(token?: string, queues?: string[]): Promise<string[]> {
  const { NextToken, QueueUrls } = await sqs.listQueues({ NextToken: token }).promise();
  const combinedQueues = [...(queues ?? []), ...(QueueUrls ?? [])];

  if (NextToken) {
    fetchQueues(NextToken, combinedQueues);
  }

  return combinedQueues;
}

async function fetchQueueAttributes(queueUrl: string) {
  const { Attributes } = await sqs
    .getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesNotVisible", "CreatedTimestamp"],
    })
    .promise();

  return Attributes;
}
