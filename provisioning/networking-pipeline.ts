#!/usr/bin/env node
import { App, Fn } from "aws-cdk-lib"
import { ExportType, SCM } from "./pipeline-builder/pipeline-stack"
import { PipelineBuilder } from "./pipeline-builder/pipeline-builder"
import { NetworkingFactory} from "./networking-factory"
import { StageParameters } from "../infrastructure/stage-parameters"
import { BeanTinsCredentials, StoreType} from "../../credentials/infrastructure/beantins-credentials"
import { EmailListenerStack } from "../features/connections/component-tests/helpers/email-listener-stack"
import { EventListenerStack } from "../test-helpers/event-listener-stack"
import { MembershipEventBusFake } from "../features/connections/component-tests/helpers/membership-event-bus-fake"
import {SSM} from "aws-sdk"

interface StageConfiguration
{
  memberProjectionTableArn: string
  connectionRequestTableArn: string
  connectionsTableArn: string
  conversationsTableArn: string
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

  pipeline.withName("NetworkingPipeline")

  pipeline.withCommitStage(
    {
      extractingSourceFrom: [
        { provider: SCM.GitHub, owner: "BeanTins", repository: "networking", branch: "main", accessIdentifier: sourceCodeArnConnection },
        { provider: SCM.GitHub, owner: "BeanTins", repository: "credentials", branch: "main", accessIdentifier: sourceCodeArnConnection }],
      executingCommands: ["cd ..\/credentials", "npm ci", "npm run build", "cd - ", "npm ci", "npm run build", "npm run test:unit", "npx cdk synth"],
      reporting: {fromDirectory: "reports/unit-tests", withFiles: ["test-results.xml"]},
      withPermissionToAccess: [
        {resource: "*", withAllowableOperations: ["ssm:GetParameter"]}]
    })

  pipeline.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: sourceCodeArnConnection},
                            { provider: SCM.GitHub, owner: "BeanTins", repository: "credentials", branch: "main", accessIdentifier: sourceCodeArnConnection }],
      executingCommands: ["cd ..\/credentials", "npm ci", "cd - ", "npm ci", "npm run test:component"],
      withEnvironmentVariables : {EventListenerQueueNametest: Fn.importValue("EventListenerQueueNametest"),
                                  EmailListenerQueueNametest: Fn.importValue("EmailListenerQueueNametest"),
                                  userPoolIdtest: Fn.importValue("userPoolIdtest"),
                                  userPoolClientIdtest: Fn.importValue("UserPoolMemberClientIdtest")},
      reporting: {fromDirectory: "reports/component-tests", withFiles: ["test-results.xml", "tests.log"], exportingTo: ExportType.S3},
      exposingEnvVars: true,
      withPermissionToAccess: [
        {resource: testConfig.memberProjectionTableArn, withAllowableOperations: ["dynamodb:*"]},
        {resource: testConfig.connectionsTableArn, withAllowableOperations: ["dynamodb:*"]},
        {resource: testConfig.connectionRequestTableArn, withAllowableOperations: ["dynamodb:*"]},
        {resource: testConfig.conversationsTableArn, withAllowableOperations: ["dynamodb:*"]},
        {resource: testConfig.userPoolArn, withAllowableOperations: ["cognito-idp:*"]},
        {resource: Fn.importValue("EventListenerQueueArntest"), withAllowableOperations: ["sqs:*"]},
        {resource: Fn.importValue("EmailListenerQueueArntest"), withAllowableOperations: ["sqs:*"]}
      ],
      withCustomDefinitions: {userPoolArn: testConfig.userPoolArn, 
                              eventListenerQueueArn: Fn.importValue("EventListenerQueueArntest"),
                              membershipEventBusArn: Fn.importValue("MembershipEventBusFakeArndev"),
                              emailConfigurationSet: testResources.emailListenerQueue.ConfigSetName,
                              notificationEmailAddress: testConfig.notificationEmailAddress,
                            } 
    }
  )

  pipeline.withProductionStage(
    {
      manualApproval: true,
      withPermissionToAccess: [
        {resource: "*", withAllowableOperations: ["ssm:GetParameter"]},
        {resource: prodConfig.userPoolArn, withAllowableOperations: ["cognito-idp:*"]}],
      withCustomDefinitions: {userPoolArn: prodConfig.userPoolArn} 
    }
  )

  const pipelineStack = pipeline.build()
  pipelineStack.addDependency(testResources.eventListenerQueue)
  pipelineStack.addDependency(testResources.beanTinsCredentials)

  app.synth()
}

main().catch(console.error)

function provisionTestResources(app: App) {
  const eventListenerQueue = new EventListenerStack(app, "EventListenerQueuetest", {
    stageName: "test",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })
  const emailListenerQueue = new EmailListenerStack(app, "EmailListenerQueuetest", {
    stageName: "test",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })

  const beanTinsCredentials = new BeanTinsCredentials(app, "BeanTinsCredentialsTest", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    stageName: "test",
    storeTypeForSettings: StoreType.Output
  })

  const membershipEventBus = new MembershipEventBusFake(app, "NetworkingDev-MembershipEventBusFake", {
    stageName: "test",
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
  const notificationEmailAddress  = await new StageParameters("us-east-1").retrieve("NotificationEmailAddress")
  const memberProjectionTableArn = Fn.importValue("MemberProjectionArntest")
  const connectionRequestTableArn = Fn.importValue("ConnectionRequestTableArntest")
  const connectionsTableArn = Fn.importValue("ConnectionsTableArntest")
  const conversationsTableArn = Fn.importValue("ConversationsTableArntest")
  return {memberProjectionTableArn: memberProjectionTableArn,
          connectionRequestTableArn: connectionRequestTableArn,
          connectionsTableArn: connectionsTableArn,
          conversationsTableArn: conversationsTableArn,
          userPoolArn: Fn.importValue("userPoolArntest"),
          notificationEmailAddress: notificationEmailAddress}
}

async function getProdConfig(): Promise<StageConfiguration>
{
  return {memberProjectionTableArn: Fn.importValue("MemberProjectionArnprod"),
    connectionRequestTableArn: Fn.importValue("ConnectionRequestTableArnprod"),
    connectionsTableArn: Fn.importValue("ConnectionsTableArnprod"),
    conversationsTableArn: Fn.importValue("ConversationsTableArnprod"),
    userPoolArn: await new StageParameters(process.env.AWS_REGION!).retrieveFromStage("userPoolArn", "prod"),
    notificationEmailAddress: await new StageParameters(process.env.AWS_REGION!).retrieveFromStage("notificationEmailAddress", "prod")}
}

async function getSourceCodeArnConnection(): Promise<string>
{
  const ssm = new SSM({region: process.env.AWS_REGION})
  let parameterValue = ""
  var options = {
    Name: "SourceCodeConnectionArn",
    WithDecryption: true
  }

  try{
    const result = await ssm.getParameter(options).promise()
    parameterValue = result.Parameter!.Value!
  }
  catch (error)
  {
    console.error(error)
    throw error
  }

  return parameterValue
}

