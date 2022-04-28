import {IPrincipal} from "aws-cdk-lib/aws-iam"
import {Stage, CfnOutput} from "aws-cdk-lib"

export interface DeploymentStage extends Stage
{
  readonly envvars: Record<string, CfnOutput> 
}

