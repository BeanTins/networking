import { Construct } from "constructs"
import { DeploymentStage } from "./deployment-stage"
import { CustomDefinitions } from "./pipeline-stack"

export interface StageFactoryProps{
  stageName: string
  stackNamePrepend?: string
  customDefinitions?: CustomDefinitions
}

export interface StageFactory {
  create(scope: Construct, id: string, props: StageFactoryProps): DeploymentStage
}
