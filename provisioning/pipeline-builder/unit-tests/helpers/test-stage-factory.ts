import { Stage, Stack, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import { StageFactory } from "../../stage-factory"
import { DeploymentStage } from "../../deployment-stage"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { CustomDefinitions } from "../../pipeline-stack"

export class TestStageFactory implements StageFactory {

  private _createdStacks: string[] = new Array()
  public readonly stages: TestStage[] = new Array()

  public get createdStacks(){
    return this._createdStacks
  }

  public create(scope: Construct, 
                name: string, 
                stageName: string, 
                customDefinitions?: CustomDefinitions): DeploymentStage {
    this.createdStacks.push(name)

    let bucketName = "defaultbucket"
    if (customDefinitions != undefined)
    {
      bucketName = customDefinitions!["bucketName"]
    }
    const stage = new TestStage(scope, name, bucketName)
    this.stages.push(stage)

    return stage
  }
}

class TestStage extends Stage {
  public testStack: TestStack
  private testEnvvars: CfnOutput
  get envvars(): Record<string, CfnOutput> {return {testFunction: this.testEnvvars} }
  constructor(scope: Construct, id: string, bucketName: string|undefined) {
    super(scope, id)
    this.testStack = new TestStack(this, "TestStack", bucketName)
    this.testEnvvars = this.testStack.bucketName
  }
}

class TestStack extends Stack {
  private _bucketName: CfnOutput
  get bucketName(): CfnOutput {return this._bucketName}
  constructor(scope: Construct, id: string, bucketName: string|undefined) {
    super(scope, id)

    const bucket = new Bucket(this, "TestBucket", {bucketName: bucketName})
    
    this._bucketName = new CfnOutput(this, 'bucketName', {
      value: bucket.bucketName
    })
  }
}




