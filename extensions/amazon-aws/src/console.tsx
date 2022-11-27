import AWS from "aws-sdk";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";

export default function Console() {
  const { data: services, error, isLoading } = useCachedPromise(loadServices);
  const progressIcon = useProgressIcon({ show: isLoading && !services });

  return (
    <List isLoading={isLoading && !!services} searchBarPlaceholder="Filter services by name...">
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : progressIcon ? (
        <List.EmptyView
          title="Loading..."
          icon={progressIcon}
          description="The first run of this command will take a few seconds. But don't worry, the next time it'll already be very fast."
        />
      ) : (
        services?.map((service, index) => (
          <List.Item
            title={service?.name || service.id}
            key={index}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`https://eu-central-1.console.aws.amazon.com/${service.id}`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

interface Service {
  id: string;
  name: string;
}

async function loadServices(token?: string, accServices?: Service[]): Promise<Service[]> {
  // TODO: region config
  const ssm = new AWS.SSM({ region: "eu-central-1" });
  const prefix = "/aws/service/global-infrastructure";
  const { Parameters: idParameters, NextToken } = await ssm
    .getParametersByPath({ Path: `${prefix}/regions/eu-central-1/services`, Recursive: true, NextToken: token })
    .promise();

  const serviceIds = (idParameters || []).map((p) => p.Value).filter((v): v is string => !!v);

  const { Parameters: nameParameters } = await ssm
    .getParameters({ Names: serviceIds.map((id) => `${prefix}/services/${id}/longName`) })
    .promise();

  const services = serviceIds
    .map((id) => {
      const name = nameParameters?.find((p) => p.Name?.split("/").at(-2) === id)?.Value;
      return name && { id, name };
    })
    .filter((s): s is Service => !!s);

  if (NextToken) {
    return loadServices(NextToken, [...(accServices ?? []), ...services]);
  }

  return [...(accServices ?? []), ...services];
}

function useProgressIcon({ show }: { show: boolean }) {
  const [progress, setProgress] = useState<
    Icon.CircleProgress25 | Icon.CircleProgress50 | Icon.CircleProgress75 | Icon.CircleProgress100
  >(Icon.CircleProgress25);

  useEffect(() => {
    if (!show) {
      return;
    }

    const interval = setInterval(() => {
      setProgress((progress) => {
        switch (progress) {
          case Icon.CircleProgress25:
            return Icon.CircleProgress50;
          case Icon.CircleProgress50:
            return Icon.CircleProgress75;
          case Icon.CircleProgress75:
            return Icon.CircleProgress100;
          case Icon.CircleProgress100:
            return Icon.CircleProgress25;
        }
      });
    }, 700);

    return () => clearInterval(interval);
  }, [show]);

  return show ? progress : undefined;
}
