import { Construct } from "constructs"
import { DeploymentStage } from "./deployment-stage"
import { CustomDefinitions } from "./pipeline-stack"

export interface StageFactory {
  create(scope: Construct, name: string, stageName: string, customDefinitions?: CustomDefinitions): DeploymentStage;
}
