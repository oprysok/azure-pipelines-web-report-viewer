import * as tl from "azure-pipelines-task-lib/task";
// biome-ignore lint/style/useNodejsImportProtocol:
import * as fs from "fs";
// biome-ignore lint/style/useNodejsImportProtocol:
import { resolve } from "path";

const dashify = (input: string) => {
  return input
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9À-ž]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
};

try {
  const jobName = dashify(tl.getVariable("Agent.JobName") || "empty");
  const stageName = dashify(
    tl.getVariable("System.StageDisplayName") || "empty"
  );
  const stageAttempt = tl.getVariable("System.StageAttempt") || "empty";
  const location = tl.getVariable("Build.SourcesDirectory") || "";

  const url = tl.getInput("url", true);
  const tabName = tl.getInput("tabName", true);
  const id = `${dashify(tabName)}.${jobName}.${stageName}.${stageAttempt}`;

  const path = resolve(location, `web-viewer-${id}.json`);

  fs.writeFileSync(
    path,
    JSON.stringify({
      url,
      tabName,
    })
  );

  tl.addAttachment("web-viewer", id, path);
} catch (error) {
  tl.setResult(tl.TaskResult.Failed, error.message);
}
