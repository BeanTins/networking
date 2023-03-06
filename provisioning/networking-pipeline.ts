#!/usr/bin/env node
import { App, Fn } from "aws-cdk-lib"
import { ExportType, SCM } from "./pipeline-builder/pipeline-stack"
import { PipelineBuilder } from "./pipeline-builder/pipeline-builder"
import { NetworkingFactory} from "./networking-factory"
import { StageParameters } from "../infrastructure/stage-parameters"
import { BeanTinsCredentials, StoreType} from "../../credentials/infrastructure/beantins-credentials"
import { EmailListenerStack } from "../features/connections/service-tests/helpers/email-listener-stack"
import { EventListenerStack } from "../test-helpers/event-listener-stack"
import { MembershipEventBusFake } from "../features/connections/service-tests/helpers/membership-event-bus-fake"
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm"

interface StageConfiguration
{
  networkerProjectionTableArn: string
  connectionRequestTableArn: string
  connectionsTableArn: string
  userPoolArn: string
  notificationEmailAddress: string
}

interface TestResources
{
  membershipEventBus: MembershipEventBusFake
  eventListenerQueue: EventListenerStack
  emailListenerQueue: EmailListenerStack
  beanTinsCredentials: BeanTinsCredentials
}

async function main(): Promise<void> 
{
  const networkingFactory = new NetworkingFactory()

  const app = new App()

  const testResources = provisionTestResources(app)

  const testConfig = await getTestConfig()
  const prodConfig = await getProdConfig()
  const sourceCodeArnConnection = await getSourceCodeArnConnection()

  const pipeline = new PipelineBuilder(app, networkingFactory)

  pipeline.withName("Networking")

  pipeline.withCommitStage(
    {
      extractingSourceFrom: [
        { provider: SCM.GitHub, owner: "BeanTins", repository: "networking", branch: "main", accessIdentifier: sourceCodeArnConnection },
        { provider: SCM.GitHub, owner: "BeanTins", repository: "credentials", branch: "main", accessIdentifier: sourceCodeArnConnection }],
      executingCommands: ["cd ..\/credentials", "npm ci", "npm run build", "cd - ", "node -v", "npm ci", "npm run build", "npm run test:unit", "npx cdk synth"],
      reporting: {fromDirectory: "reports/unit-tests", withFiles: ["test-results.xml"]},
      withPermissionToAccess: [
        {resource: "*", withAllowableOperations: ["ssm:GetParameter"]}]
    })

  pipeline.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "networking", branch: "main", accessIdentifier: sourceCodeArnConnection},
                            { provider: SCM.GitHub, owner: "BeanTins", repository: "credentials", branch: "main", accessIdentifier: sourceCodeArnConnection }],
      executingCommands: ["cd ..\/credentials", "npm ci", "cd - ", "npm ci", "npm run test:service"],
      withEnvironmentVariables : {NetworkingTestEventListenerQueueName: Fn.importValue("NetworkingTestEventListenerQueueName"),
                                  NetworkingTestEmailListenerQueueName: Fn.importValue("NetworkingTestEmailListenerQueueName"),
                                  NetworkingTestUserPoolId: Fn.importValue("NetworkingTestUserPoolId"),
                                  NetworkingTestUserPoolMemberClientId: Fn.importValue("NetworkingTestUserPoolMemberClientId"),
                                  NetworkingTestMembershipEventBusFakeArn: Fn.importValue("NetworkingTestMembershipEventBusFakeArn")},
      reporting: {fromDirectory: "reports/service-tests", withFiles: ["test-results.xml", "tests.log"], exportingTo: ExportType.S3},
      withPermissionToAccess: [
        {resource: testConfig.networkerProjectionTableArn, withAllowableOperations: ["dynamodb:*"]},
        {resource: testConfig.connectionsTableArn, withAllowableOperations: ["dynamodb:*"]},
        {resource: testConfig.connectionRequestTableArn, withAllowableOperations: ["dynamodb:*"]},
        {resource: testConfig.userPoolArn, withAllowableOperations: ["cognito-idp:*"]},
        {resource: Fn.importValue("NetworkingTestMembershipEventBusFakeArn"), withAllowableOperations: ["events:*"]},
        {resource: Fn.importValue("NetworkingTestEventListenerQueueArn"), withAllowableOperations: ["sqs:*"]},
        {resource: Fn.importValue("NetworkingTestEmailListenerQueueArn"), withAllowableOperations: ["sqs:*"]},
        {resource: "*", withAllowableOperations: ["ssm:GetParameter"]}
      ],
      withCustomDefinitions: {userPoolArn: testConfig.userPoolArn, 
                              eventListenerQueueArn: Fn.importValue("NetworkingTestEventListenerQueueArn"),
                              membershipEventBusArn: Fn.importValue("NetworkingTestMembershipEventBusFakeArn"),
                              emailConfigurationSet: testResources.emailListenerQueue.ConfigSetName,
                              notificationEmailAddress: testConfig.notificationEmailAddress} 
    }
  )

  pipeline.withProductionStage(
    {
      manualApproval: true,
      withPermissionToAccess: [
        {resource: "*", withAllowableOperations: ["ssm:GetParameter"]},
        {resource: prodConfig.userPoolArn, withAllowableOperations: ["cognito-idp:*"]}],
      withCustomDefinitions: {userPoolArn: prodConfig.userPoolArn, 
                              membershipEventBusArn: Fn.importValue("NetworkingTestMembershipEventBusFakeArn")} // this needs to be the real prod event bus retrieved from parameter store
    }
  )

  const pipelineStack = pipeline.build()
  pipelineStack.addDependency(testResources.membershipEventBus)
  pipelineStack.addDependency(testResources.eventListenerQueue)
  pipelineStack.addDependency(testResources.emailListenerQueue)
  pipelineStack.addDependency(testResources.beanTinsCredentials)

  app.synth()
}

main().catch(console.error)

function provisionTestResources(app: App) {
  const eventListenerQueue = new EventListenerStack(app, "NetworkingTestEventListenerQueue", {
    deploymentName: "NetworkingTest",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })
  const emailListenerQueue = new EmailListenerStack(app, "NetworkingTestEmailListenerQueue", {
    deploymentName: "NetworkingTest",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })

  const beanTinsCredentials = new BeanTinsCredentials(app, "NetworkingTestCredentials", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    deploymentName: "NetworkingTest",
    storeTypeForSettings: StoreType.Output
  })

  const membershipEventBus = new MembershipEventBusFake(app, "NetworkingTestMembershipEventBusFake", {
    deploymentName: "NetworkingTest",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
  })

  return {
    eventListenerQueue: eventListenerQueue, 
    emailListenerQueue: emailListenerQueue, 
    beanTinsCredentials: beanTinsCredentials,
    membershipEventBus: membershipEventBus
  }
}

async function getTestConfig() : Promise<StageConfiguration>
{
  return {networkerProjectionTableArn: Fn.importValue("NetworkingTestConnectionNetworkerProjectionArn"),
          connectionRequestTableArn: Fn.importValue("NetworkingTestConnectionRequestTableArn"),
          connectionsTableArn: Fn.importValue("NetworkingTestConnectionConnectionsTableArn"),
          userPoolArn: Fn.importValue("NetworkingTestUserPoolArn"),
          notificationEmailAddress: await new StageParameters("us-east-1").retrieveFromStage("NotificationEmailAddress", "test")}
}

async function getProdConfig(): Promise<StageConfiguration>
{
  return {networkerProjectionTableArn: Fn.importValue("NetworkingProdConnectionNetworkerProjectionArnprod"),
    connectionRequestTableArn: Fn.importValue("NetworkingProdConnectionRequestTableArnprod"),
    connectionsTableArn: Fn.importValue("NetworkingProdConnectionConnectionsTableArnprod"),
    userPoolArn: await new StageParameters(process.env.AWS_REGION!).retrieveFromStage("userPoolArn", "prod"),
    notificationEmailAddress: await new StageParameters(process.env.AWS_REGION!).retrieveFromStage("NotificationEmailAddress", "prod")}
}

async function getSourceCodeArnConnection(): Promise<string>
{
  const ssm = new SSMClient({region: process.env.AWS_REGION})
  let parameterValue = ""
  var options = {
    Name: "SourceCodeConnectionArn",
    WithDecryption: true
  }

  try{
    const result = await ssm.send(new GetParameterCommand(options))
    parameterValue = result.Parameter!.Value!
  }
  catch (error)
  {
    console.error(error)
    throw error
  }

  return parameterValue
}

