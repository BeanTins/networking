
import "source-map-support/register"
import { App, Fn } from "aws-cdk-lib"
import { BeanTinsCredentials, StoreType} from "../../credentials/infrastructure/beantins-credentials"
import { MembershipEventBusFake } from "../features/connections/component-tests/helpers/membership-event-bus-fake"
import { NetworkingStage } from "./networking-stage"
import { EmailListenerStack } from "../features/connections/component-tests/helpers/email-listener-stack"

const app = new App()

const beantinsCredentials = new BeanTinsCredentials(app, "NetworkingDev-BeanTinsCredentials", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  stageName: "dev",
  storeTypeForSettings: StoreType.Output 
})

const emailListener = new EmailListenerStack(app, "NetworkingDev-EmailListener", {stageName: "dev"})

const membershipEventBus = new MembershipEventBusFake(app, "NetworkingDev-MembershipEventBusFake", {
  stageName: "dev",
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
})

const stage = new NetworkingStage(app, "NetworkingDev", {
  stageName: "dev",
  membershipEventBusArn: Fn.importValue("MembershipEventBusFakeArndev"),
  emailConfigurationSet: emailListener.ConfigSetName,
  userPoolArn: Fn.importValue("UserPoolArndev"),
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
})

app.synth()

