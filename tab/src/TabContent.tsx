import * as SDK from 'azure-devops-extension-sdk'
import {
  CommonServiceIds,
  type IProjectPageService,
  getClient,
} from 'azure-devops-extension-api'
import { type Build, BuildRestClient } from 'azure-devops-extension-api/Build'
import {
  type DeploymentAttempt,
  ReleaseRestClient,
} from 'azure-devops-extension-api/Release'
// biome-ignore lint/style/useImportType:
import * as React from 'react'
import { WebReport, type WebReportTab } from './WebReport'
import { createRoot } from 'react-dom/client'

const ATTACHMENT_TYPE = 'web-viewer'
const TASK_ID = 'c8dda2c7-518c-453d-a296-89daf80c1f86'

const renderRoot = (component: React.ReactElement) => {
  const container = document.getElementById('content')
  const root = createRoot(container)
  root.render(component)
}

type TabContext = {
  releaseEnvironment?: {
    id: number
    releaseId: number
    deployPhasesSnapshot: {
      workflowTasks: {
        taskId: string
      }[]
    }[]
  }
}

const searchForRunPlanId = (deployStep: DeploymentAttempt) => {
  for (const phase of deployStep.releaseDeployPhases) {
    for (const deploymentJob of phase.deploymentJobs) {
      for (const task of deploymentJob.tasks) {
        if (task.task?.id === TASK_ID) {
          return phase.runPlanId
        }
      }
    }
  }
  return undefined
}

const isTaskInEnvironment = (tabContext: TabContext | undefined): boolean => {
  if (tabContext?.releaseEnvironment?.deployPhasesSnapshot) {
    const taskIds = tabContext.releaseEnvironment.deployPhasesSnapshot.flatMap(
      (phase) => phase.workflowTasks.map((task) => task.taskId),
    )
    return taskIds.includes(TASK_ID)
  }
  return false
}

SDK.init()
SDK.register('registeredEnvironmentObject', () => ({
  isInvisible: (tabContext: TabContext | undefined) =>
    !isTaskInEnvironment(tabContext),
}))

const getAttachments = async (build: Build): Promise<WebReportTab[]> => {
  const buildClient: BuildRestClient = getClient(BuildRestClient)
  const attachments = await buildClient.getAttachments(
    build.project.id,
    build.id,
    ATTACHMENT_TYPE,
  )

  const accessToken = await SDK.getAccessToken()
  const b64encodedAuth = Buffer.from(`:${accessToken}`).toString('base64')
  const authHeaders = {
    headers: { Authorization: `Basic ${b64encodedAuth}` },
  }

  return Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment?._links?.self?.href) {
        throw new Error(`Attachment ${attachment?.name} is not downloadable`)
      }

      const response = await fetch(attachment._links.self.href, authHeaders)
      if (!response.ok) {
        throw new Error(response.statusText)
      }
      const content = JSON.parse(await response.text()) as WebReportTab

      return {
        url: content.url,
        tabName: content.tabName ?? 'Default',
      }
    }),
  )
}

const handleBuildChanged = async (build: Build) => {
  const tabs = await getAttachments(build)
  renderRoot(<WebReport tabs={tabs} />)
}

const handleReleaseEnvironment = async (config: TabContext) => {
  const environment = config.releaseEnvironment
  const releaseId = environment.releaseId
  const environmentId = environment.id
  const projectService = await SDK.getService<IProjectPageService>(
    CommonServiceIds.ProjectPageService,
  )
  const project = await projectService.getProject()

  const releaseClient = getClient(ReleaseRestClient)
  const release = await releaseClient.getRelease(project.id, releaseId)
  const env = release.environments.find((e) => e.id === environmentId)

  if (!env?.deploySteps?.length) {
    throw new Error('This release has not been deployed yet')
  }

  const deployStep = env.deploySteps[env.deploySteps.length - 1]
  if (!deployStep?.releaseDeployPhases?.length) {
    throw new Error('This release has no job')
  }

  const runPlanIds = deployStep.releaseDeployPhases.map(
    (phase) => phase.runPlanId,
  )
  if (!runPlanIds.length) {
    throw new Error('There are no plan IDs')
  }

  const runPlanId = searchForRunPlanId(deployStep)

  if (!runPlanId) {
    throw new Error('No matching run plan ID found')
  }

  const attachments = await releaseClient.getTaskAttachments(
    project.id,
    env.releaseId,
    env.id,
    deployStep.attempt,
    runPlanId,
    ATTACHMENT_TYPE,
  )

  const tabs = await Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment?._links?.self?.href) {
        throw new Error(`Attachment ${attachment?.name} is not downloadable`)
      }

      const response = await releaseClient.getTaskAttachmentContent(
        project.id,
        env.releaseId,
        env.id,
        deployStep.attempt,
        runPlanId,
        attachment.recordId,
        ATTACHMENT_TYPE,
        attachment.name,
      )

      const utf8 = new TextDecoder('utf-8')
      const array = new Uint8Array(response)
      const content = JSON.parse(utf8.decode(array)) as WebReportTab

      return {
        url: content.url,
        tabName: content.tabName ?? 'Default',
      }
    }),
  )

  renderRoot(<WebReport tabs={tabs} />)
}

SDK.ready().then(async () => {
  try {
    const config = SDK.getConfiguration()

    if (typeof config.onBuildChanged === 'function') {
      config.onBuildChanged(handleBuildChanged)
    } else if (typeof config.releaseEnvironment === 'object') {
      await handleReleaseEnvironment(config)
    } else {
      throw new Error('Unexpected contribution context')
    }
  } catch (error) {
    SDK.notifyLoadFailed(error)
  }
})
