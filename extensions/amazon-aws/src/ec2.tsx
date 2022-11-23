import { ActionPanel, List, Action, Icon } from "@raycast/api";
import AWS from "aws-sdk";
import setupAws from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const preferences = setupAws();
const ec2 = new AWS.EC2({ apiVersion: "2016-11-15" });

export default function EC2() {
  const { data: instances, error, isLoading } = useCachedPromise(fetchEC2Instances);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter instances by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {instances?.map((i) => (
        <EC2Instance key={i.InstanceId} instance={i} />
      ))}
    </List>
  );
}

function EC2Instance({ instance }: { instance: AWS.EC2.Instance }) {
  const name = instance.Tags?.find((t) => t.Key === "Name")?.Value?.replace(/-/g, " ");

  return (
    <List.Item
      id={instance.InstanceId}
      key={instance.InstanceId}
      title={name || "Unknown Instance name"}
      subtitle={instance.InstanceType}
      icon={Icon.Layers}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://" +
              preferences.region +
              ".console.aws.amazon.com/ec2/v2/home?region=" +
              preferences.region +
              "#InstanceDetails:instanceId=" +
              instance.InstanceId
            }
          />
          <Action.CopyToClipboard title="Copy Instance ID" content={instance.InstanceId || ""} />
          <Action.CopyToClipboard title="Copy Private IP" content={instance.PrivateIpAddress || ""} />
          {instance.PublicIpAddress && (
            <Action.CopyToClipboard title="Copy Public IP" content={instance.PublicIpAddress} />
          )}
        </ActionPanel>
      }
      accessories={[{ date: instance.LaunchTime }]}
    />
  );
}

async function fetchEC2Instances(token?: string, accInstances?: AWS.EC2.Instance[]): Promise<AWS.EC2.Instance[]> {
  const { NextToken, Reservations } = await ec2.describeInstances({ NextToken: token }).promise();
  const instances = (Reservations || []).reduce<AWS.EC2.Instance[]>(
    (acc, reservation) => [...acc, ...(reservation.Instances || [])],
    []
  );
  const combinedInstances = [...(accInstances || []), ...instances];

  if (NextToken) {
    return fetchEC2Instances(NextToken, combinedInstances);
  }

  return combinedInstances;
}
