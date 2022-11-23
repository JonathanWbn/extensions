import fs from "fs";
import { homedir } from "os";
import { Readable } from "stream";
import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import * as AWS from "aws-sdk";
import setupAws, { AWS_URL_BASE } from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";

const { region } = setupAws();
const s3 = new AWS.S3();

export default function S3() {
  const { data: buckets, error, isLoading } = useCachedPromise(fetchBuckets);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter buckets by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {buckets?.map((bucket) => (
        <S3Bucket key={bucket.Name} bucket={bucket} />
      ))}
    </List>
  );
}

function S3Bucket({ bucket }: { bucket: AWS.S3.Bucket }) {
  const name = bucket.Name || "";

  return (
    <List.Item
      icon={Icon.Folder}
      title={name}
      actions={
        <ActionPanel>
          <Action.Push target={<S3BucketObjects bucketName={name} />} title="List Objects" />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${AWS_URL_BASE}/s3/buckets/${name}?region=${region}&tab=objects`}
          />
          <Action.CopyToClipboard title="Copy Name" content={name} />
        </ActionPanel>
      }
      accessories={[{ date: bucket.CreationDate }]}
    />
  );
}

function S3BucketObjects({ bucketName }: { bucketName: string }) {
  const { data: objects, error, isLoading } = useCachedPromise(fetchBucketObjects, [bucketName]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter objects by name...">
      {error && <List.EmptyView title={error.message} icon={Icon.Warning} />}
      {objects?.map((object) => {
        const key = object.Key || "";

        return (
          <List.Item
            key={key}
            icon={Icon.Document}
            title={key}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={`${AWS_URL_BASE}/s3/object/${bucketName}?region=${region}&prefix=${key}`}
                />
                <Action.SubmitForm
                  title="Download"
                  icon={Icon.Download}
                  onSubmit={async () => {
                    const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading..." });

                    try {
                      const data = await s3.getObject({ Bucket: bucketName, Key: key }).promise();
                      Readable.from(data.Body as Buffer).pipe(
                        fs.createWriteStream(`${homedir()}/Downloads/${object.Key?.split("/").pop()}`)
                      );
                      toast.style = Toast.Style.Success;
                      toast.title = "Downloaded to Downloads folder";
                    } catch (err) {
                      toast.style = Toast.Style.Failure;
                      toast.title = "Failed to download";
                    }
                  }}
                />
                <Action.CopyToClipboard title="Copy Key" content={key} />
              </ActionPanel>
            }
            accessories={[{ text: humanFileSize(object.Size || 0) }]}
          />
        );
      })}
    </List>
  );
}

async function fetchBuckets() {
  const { Buckets } = await s3.listBuckets().promise();

  return Buckets;
}

async function fetchBucketObjects(
  bucket: string,
  nextMarker?: string,
  objects: AWS.S3.Object[] = []
): Promise<AWS.S3.ObjectList> {
  const { Contents, NextMarker } = await s3.listObjects({ Bucket: bucket, Marker: nextMarker }).promise();

  const combinedObjects = [...objects, ...(Contents || [])];

  if (NextMarker) {
    return fetchBucketObjects(bucket, NextMarker, combinedObjects);
  }

  return combinedObjects;
}

// inspired by https://stackoverflow.com/a/14919494
function humanFileSize(bytes: number) {
  const threshold = 1000;

  if (Math.abs(bytes) < threshold) {
    return bytes + " B";
  }

  const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let u = -1;
  const r = 10;

  do {
    bytes /= threshold;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= threshold && u < units.length - 1);

  return bytes.toFixed() + " " + units[u];
}
