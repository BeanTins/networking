
import "source-map-support/register"
import { App, Fn } from "aws-cdk-lib"
import { BeanTinsCredentials, StoreType} from "../../credentials/infrastructure/beantins-credentials"
import { MembershipEventBusFake } from "../features/connections/component-tests/helpers/membership-event-bus-fake"
import { NetworkingStage } from "./networking-stage"
import { EmailListenerStack } from "../features/connections/component-tests/helpers/email-listener-stack"
import { EventListenerStack } from "../test-helpers/event-listener-stack"
import { StageParameters } from "../infrastructure/stage-parameters"

async function main(): Promise<void> 
{
  const app = new App()

  const NotificationEmailAddress = await new StageParameters("us-east-1").retrieve("NotificationEmailAddress")

  const beantinsCredentials = new BeanTinsCredentials(app, "NetworkingDev-BeanTinsCredentials", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    stageName: "dev",
    storeTypeForSettings: StoreType.Output 
  })

  const membershipEventBus = new MembershipEventBusFake(app, "NetworkingDev-MembershipEventBusFake", {
    stageName: "dev",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
  })

  const emailListener = new EmailListenerStack(app, "NetworkingDev-EmailListener", {stageName: "dev"})

  const eventListener = new EventListenerStack(app, "NetworkingDev-EventListener", {
    stageName: "dev",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })
  
  const stage = new NetworkingStage(app, "NetworkingDev", {
    stageName: "dev",
    notificationEmailAddress: NotificationEmailAddress,
    membershipEventBusArn: Fn.importValue("MembershipEventBusFakeArndev"),
    emailConfigurationSet: emailListener.ConfigSetName,
    userPoolArn: Fn.importValue("UserPoolArndev"),
    eventListenerQueueArn: Fn.importValue("EventListenerQueueArndev"),
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })

  app.synth()
}

main().catch(console.error)

