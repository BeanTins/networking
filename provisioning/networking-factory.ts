import { Construct } from "constructs"
import { NetworkingStage } from "./networking-stage"
import { StageFactory } from "./pipeline-builder/stage-factory"
import { DeploymentStage } from "./pipeline-builder/deployment-stage"
import { CustomDefinitions } from "./pipeline-builder/pipeline-stack"

export class NetworkingFactory implements StageFactory {
  create(scope: Construct, name: string, stageName: string, customDefinitions?: CustomDefinitions): DeploymentStage {
    return new NetworkingStage(scope, name, 
      {stageName: stageName, 
       userPoolArn: customDefinitions!["userPoolArn"],
       membershipEventBusArn: customDefinitions!["membershipEventBusArn"],
       emailConfigurationSet: customDefinitions!["emailConfigurationSet"],
       eventListenerQueueArn: customDefinitions!["eventListenerQueueArn"],
       notificationEmailAddress: customDefinitions!["notificationEmailAddress"]})
  }
}

