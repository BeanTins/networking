import { SCM, ExportType } from "../pipeline-stack"
import { PipelineBuilder } from "../pipeline-builder"
import { App } from "aws-cdk-lib"
import { Template, Match, Capture } from "aws-cdk-lib/assertions"
import { TestStageFactory } from "./helpers/test-stage-factory"
import { expectAndFindPipelineStage, 
  expectActionsToContainPartialMatch, 
  expectCommandsToContain } from "./helpers/pipeline-expect"

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
      extractingSourceFrom: [{ provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: []
    })
})

test("Pipeline with own source from github", () => {
  pipelineBuilder.withAcceptanceStage(
    {extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership-e2e-tests", branch: "main", accessIdentifier: "arn:scmconnection"}],
     executingCommands: []})

  const stack = pipelineBuilder.build()

  const stageActions = expectAndFindPipelineStage(stack, "Source")

  expectActionsToContainPartialMatch(stageActions, "ActionTypeId", {Provider: "CodeStarSourceConnection"})
  expectActionsToContainPartialMatch(stageActions, "Configuration", 
                                     {FullRepositoryId: "BeanTins/membership-e2e-tests", BranchName: "main", ConnectionArn:"arn:scmconnection"})
})

test("Pipeline with same source as commit", () => {
  pipelineBuilder.withAcceptanceStage(
    {extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
     executingCommands: []})

  const stack = pipelineBuilder.build()

  const stageActions = expectAndFindPipelineStage(stack, "Source")

  expectActionsToContainPartialMatch(stageActions, "ActionTypeId", {Provider: "CodeStarSourceConnection"})
  expectActionsToContainPartialMatch(stageActions, "Configuration", 
                                     {FullRepositoryId: "BeanTins/membership", BranchName: "main", ConnectionArn:"arn:scmconnection"})
})

test("Pipeline with source from github", () => {
  pipelineBuilder.withName("MembershipPipeline")
  pipelineBuilder.withAcceptanceStage(
    {extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
     executingCommands: []})

  const stack = pipelineBuilder.build()

  const stageActions = expectAndFindPipelineStage(stack, "Source")

  expectActionsToContainPartialMatch(stageActions, "ActionTypeId", {Provider: "CodeStarSourceConnection"})
  expectActionsToContainPartialMatch(stageActions, "Configuration", 
                                     {FullRepositoryId: "BeanTins/membership", BranchName: "main", ConnectionArn:"arn:scmconnection"})
})

test("Pipeline with stage export", () => {

  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: [],
    }
  )

  const stack = pipelineBuilder.build()

  expectCommandsToContain(stack, ["export PipelineStage=test"])

})

test("Pipeline with commands", () => {

  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm run test:component"],
    }
  )

  const stack = pipelineBuilder.build()

  expectCommandsToContain(stack, ["npm run test:component"])

})

test("Pipeline with deployment", () => {

  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm run test:component"],
    }
  )

  const stack = pipelineBuilder.build()

  const stageActions = expectAndFindPipelineStage(stack, "AcceptanceTest")

  expectActionsToContainPartialMatch(stageActions, "ActionTypeId", {Category: "Deploy"})

  expect(stageFactory.createdStacks[0]).toEqual("AcceptanceTest")

})

test("Pipeline with acceptance stage component test reporting", () => {
  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm run test:component"],
      reporting: {fromDirectory: "reports/component-tests", withFiles: ["test-results.xml"]}
    }
  )

  const template = Template.fromStack(pipelineBuilder.build())

  const reportingString = new Capture()

  template.hasResourceProperties("AWS::CodeBuild::Project", {
    Source:
      Match.objectLike(
        {BuildSpec: 
          Match.objectLike(
                {"Fn::Join": reportingString})})}) 

  let buildSpecText = reportingString.asArray().toString()
  expect(buildSpecText).toEqual(expect.stringMatching(/files.+test-results.xml/sm))
  expect(buildSpecText).toEqual(expect.stringMatching(/base-directory.+reports[/]component-tests/sm))
})

test("Pipeline with acceptance stage component test exporting", () => {
  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm run test:component"],
      reporting: 
      {fromDirectory: "reports/component-tests", withFiles: ["test-results.xml"], exportingTo: ExportType.S3}
    }
  )

  const template = Template.fromStack(pipelineBuilder.build())

  template.hasResourceProperties("AWS::CodeBuild::ReportGroup", {
    ExportConfig:
      Match.objectLike(
        {ExportConfigType: "S3"}
  )}) 

})

test("Pipeline with report creation permissions", () => {
  pipelineBuilder.withName("MembershipPipeline")
  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm ci"],
      reporting: {fromDirectory: "reports/unit-tests", withFiles: ["test-results.xml"]}
    }
  )

  const template = Template.fromStack(pipelineBuilder.build())

  const reportGroup = template.findResources("AWS::CodeBuild::ReportGroup")

  expect(reportGroup).toBeDefined()

  const reportGroupName = Object.keys(reportGroup)[0]

  expect(reportGroupName).toBeDefined()
  
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([
        Match.objectLike({
          "Action": ["codebuild:CreateReport", "codebuild:UpdateReport","codebuild:BatchPutTestCases"],
          "Resource": {
            "Fn::GetAtt": Match.arrayWith([reportGroupName])
          }
        })
      ])
    })
  })
})

test("Pipeline with endpoints as environment variables", () => {
  pipelineBuilder.withName("MembershipPipeline")
  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{ provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection" }],
      executingCommands: ["npm run test:component"],
      exposingEnvVars: true
    })

  const stack = pipelineBuilder.build()
  const template = Template.fromStack(stack)

  template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
    Stages: Match.arrayWith([
      Match.objectLike({
        "Name": "AcceptanceTest", 
        "Actions": Match.arrayWith([
          Match.objectLike({
            Configuration: Match.objectLike({
              EnvironmentVariables: Match.serializedJson(Match.arrayWith([
                Match.objectLike({
                  name: "testFunction"
                })
              ]))
            })
          })
        ])
      })
    ])
  })
  
  expectCommandsToContain(stack, ["export testFunction=$testFunction"])
})

test("Pipeline with access to test resources", () => {

  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm run test:component"],
      withPermissionToAccess: [{resource: "TestResource", withAllowableOperations: ["dynamodb:*"]}]
    }
  )

  const template = Template.fromStack(pipelineBuilder.build())

  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: Match.objectLike({
      Statement: Match.arrayWith([Match.objectLike({
        Action: "dynamodb:*",
        Resource: "TestResource"
      })])
    })
  })
})

test("Pipeline with custom definition", () => {

  pipelineBuilder.withAcceptanceStage(
    {
      extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
      executingCommands: ["npm run test:component"],
      withCustomDefinitions: {bucketName: "newbucket"}
    }
  )

  pipelineBuilder.build()

  const template = Template.fromStack(stageFactory.stages[0].testStack)

  template.hasResourceProperties("AWS::S3::Bucket", {
    BucketName: "newbucket"
  })
})

test("Pipeline with environment variables", () => {
  pipelineBuilder.withAcceptanceStage({extractingSourceFrom: [{provider: SCM.GitHub, owner: "BeanTins", repository: "membership", branch: "main", accessIdentifier: "arn:scmconnection"}],
                                   executingCommands: ["npm ci"],
                                   exposingEnvVars: true,
                                  withEnvironmentVariables: {envvar1: "test1", envvar2: "test2"}})

  const stack = pipelineBuilder.build()

  expectCommandsToContain(stack, ["export envvar1=test1", "export envvar2=test2"])
})



