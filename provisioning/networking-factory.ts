import { Construct } from "constructs"
import { NetworkingStage } from "./networking-stage"
import { StageFactory, StageFactoryProps } from "./pipeline-builder/stage-factory"
import { DeploymentStage } from "./pipeline-builder/deployment-stage"

export class NetworkingFactory implements StageFactory {
  create(scope: Construct, id: string, props: StageFactoryProps): DeploymentStage {
    return new NetworkingStage(scope, id,  
      {stageName: props.stageName, 
       stackNamePrepend: props.stackNamePrepend,
       userPoolArn: props.customDefinitions!["userPoolArn"],
       membershipEventBusArn: props.customDefinitions!["membershipEventBusArn"],
       emailConfigurationSet: props.customDefinitions!["emailConfigurationSet"],
       eventListenerQueueArn: props.customDefinitions!["eventListenerQueueArn"],
       notificationEmailAddress: props.customDefinitions!["notificationEmailAddress"]})
  }
}

