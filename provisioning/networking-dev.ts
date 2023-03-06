
import "source-map-support/register"
import { App, Fn } from "aws-cdk-lib"
import { BeanTinsCredentials, StoreType} from "../../credentials/infrastructure/beantins-credentials"
import { MembershipEventBusFake } from "../features/connections/service-tests/helpers/membership-event-bus-fake"
import { NetworkingStage } from "./networking-stage"
import { EmailListenerStack } from "../features/connections/service-tests/helpers/email-listener-stack"
import { EventListenerStack } from "../test-helpers/event-listener-stack"
import { StageParameters } from "../infrastructure/stage-parameters"

async function main(): Promise<void> 
{
  const app = new App()

  const NotificationEmailAddress = await new StageParameters("us-east-1").retrieve("NotificationEmailAddress")

  const beantinsCredentials = new BeanTinsCredentials(app, "NetworkingDevCredentials", {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    deploymentName: "NetworkingDev",
    storeTypeForSettings: StoreType.Output 
  })

  const membershipEventBus = new MembershipEventBusFake(app, "NetworkingDevMembershipEventBusFake", {
    deploymentName: "NetworkingDev",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
  })

  const emailListener = new EmailListenerStack(app, "NetworkingDevEmailListener", {deploymentName: "NetworkingDev"})

  const eventListener = new EventListenerStack(app, "NetworkingDevEventListener", {
    deploymentName: "NetworkingDev",
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  })
  
  const stage = new NetworkingStage(app, "NetworkingDev", {
    stageName: "dev",
    notificationEmailAddress: NotificationEmailAddress,
    membershipEventBusArn: Fn.importValue("NetworkingDevMembershipEventBusFakeArn"),
    emailConfigurationSet: emailListener.ConfigSetName,
    userPoolId: Fn.importValue("NetworkingDevUserPoolId"),
    userPoolArn: Fn.importValue("NetworkingDevUserPoolArn"),
    eventListenerQueueArn: Fn.importValue("NetworkingDevEventListenerQueueArn"),
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
    stackNamePrepend: "NetworkingDev"
  })

  app.synth()
}

main().catch(console.error)

