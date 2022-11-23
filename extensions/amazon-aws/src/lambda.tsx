import { ActionPanel, List, Action, Icon } from "@raycast/api";
import * as AWS from "aws-sdk";
import setupAws, { AWS_URL_BASE } from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const { region } = setupAws();

export default function Lambda() {
  const { data: functions, error, isLoading } = useCachedPromise(fetchFunctions);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter functions by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {functions?.map((func) => (
        <LambdaFunction key={func.FunctionName} func={func} />
      ))}
    </List>
  );
}

function LambdaFunction({ func }: { func: AWS.Lambda.FunctionConfiguration }) {
  const name = func.FunctionName || "";

  return (
    <List.Item
      icon={Icon.CodeBlock}
      title={name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${AWS_URL_BASE}/lambda/home?region=${region}#/functions/${name}?tab=monitoring`}
          />
          <Action.CopyToClipboard title="Copy Function Name" content={name} />
        </ActionPanel>
      }
      accessories={[
        { date: func.LastModified ? new Date(func.LastModified) : undefined },
        { icon: getRuntimeIcon(func.Runtime || ""), tooltip: func.Runtime || "" },
      ]}
    />
  );
}

async function fetchFunctions(
  nextMarker?: string,
  functions?: AWS.Lambda.FunctionList
): Promise<AWS.Lambda.FunctionList> {
  const { NextMarker, Functions } = await new AWS.Lambda().listFunctions({ Marker: nextMarker }).promise();

  const combinedFunctions = [...(functions || []), ...(Functions || [])];

  if (NextMarker) {
    return fetchFunctions(NextMarker, combinedFunctions);
  }

  return combinedFunctions;
}

const getRuntimeIcon = (runtime: AWS.Lambda.Runtime) => {
  if (runtime.includes("node")) {
    return "lambda-runtime-icons/nodejs.png";
  } else if (runtime.includes("python")) {
    return "lambda-runtime-icons/python.png";
  } else if (runtime.includes("java")) {
    return "lambda-runtime-icons/java.png";
  } else if (runtime.includes("dotnet")) {
    return "lambda-runtime-icons/dotnet.png";
  } else if (runtime.includes("go")) {
    return "lambda-runtime-icons/go.png";
  } else if (runtime.includes("ruby")) {
    return "lambda-runtime-icons/ruby.png";
  } else {
    return Icon.ComputerChip;
  }
};
