import {Stage} from "aws-cdk-lib"

export interface DeploymentStage extends Stage
{
  readonly envvars: string[]
}

