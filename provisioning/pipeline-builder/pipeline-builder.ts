import { App } from "aws-cdk-lib"
import { PipelineStack, CommitStageProperties, AcceptanceStageProperties, ProductionStageProperties } from "./pipeline-stack"
import { StageFactory } from "./stage-factory"

export class PipelineBuilder {
  private name: string
  private commitStage :CommitStageProperties
  private acceptanceStage :AcceptanceStageProperties
  private productionStage: ProductionStageProperties
  private app: App
  private stageFactory: StageFactory
  
  constructor(app: App, stageFactory: StageFactory) {
    this.app = app
    this.stageFactory = stageFactory
  }

  withName(name: string) {
    this.name = name
  }

  withCommitStage(properties: CommitStageProperties)
  {
    this.commitStage = properties
  }

  withAcceptanceStage(properties:AcceptanceStageProperties)
  {
    this.acceptanceStage = properties
  }

  withProductionStage(properties: ProductionStageProperties)
  {
    this.productionStage = properties
  }

  build(): PipelineStack {
    if (this.name == undefined)
    {
      throw Error("pipeline must have a name") 
    }

    if (this.commitStage == undefined)
    {
      throw("pipeline must have a commit stage")
    }
    
    return new PipelineStack(this.app, this.stageFactory, this.name, 
    {name: this.name, 
      commitStage: this.commitStage, 
      acceptanceStage: this.acceptanceStage,
      productionStage: this.productionStage})
  }
}

