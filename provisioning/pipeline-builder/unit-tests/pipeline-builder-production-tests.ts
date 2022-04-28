import { SCM } from "../pipeline-stack"
import { PipelineBuilder } from "../pipeline-builder"
import { App } from "aws-cdk-lib"
import { Template, Match } from "aws-cdk-lib/assertions"
import { TestStageFactory } from "./helpers/test-stage-factory"
import { expectAndFindPipelineStage, 
  expectActionsToContainPartialMatch} from "./helpers/pipeline-expect"

let stageFactory: TestStageFactory
let pipelineBuilder: PipelineBuilder
let app: App

beforeEach(() => {
  app = new App();
  stageFactory = new TestStageFactory()
  pipelineBuilder = new PipelineBuilder(app, stageFactory)
  pipelineBuilder.withName("MembershipPipeline")
  pipelineBuilder.withCommitStage(
    {
      extractingSourceFrom: [{ provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection" }],
      executingCommands: []
    })
  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm run test:component"],
    }
  )
})

test("Pipeline with approval required", () => {

  pipelineBuilder.withProductionStage({manualApproval: true})

  const stack = pipelineBuilder.build()

  const stageActions = expectAndFindPipelineStage(stack, "Production")

  expectActionsToContainPartialMatch(stageActions, "ActionTypeId", {Category: "Approval"})
})

test("Pipeline with deployment", () => {

  pipelineBuilder.withProductionStage({})

  const stack = pipelineBuilder.build()

  const stageActions = expectAndFindPipelineStage(stack, "Production")

  expect(stageFactory.createdStacks[1]).toEqual("Production")
})

test("Pipeline with access to resources", () => {

  pipelineBuilder.withProductionStage(
    {
      withPermissionToAccess: [{resource: "ProdResource", withAllowableOperations: ["dynamodb:*"]}]
    }
  )

  const template = Template.fromStack(pipelineBuilder.build())

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([Match.objectLike({
        Action: "dynamodb:*",
        Resource: "ProdResource"
      })])
    })
  })
})


