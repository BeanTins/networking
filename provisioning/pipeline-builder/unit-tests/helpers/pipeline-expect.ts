import { PipelineStack } from "../../pipeline-stack"
import { Template, Match, Capture } from "aws-cdk-lib/assertions"

export function expectCommandsToContain(stack: PipelineStack, commands: string[]) {
  const template = Template.fromStack(stack)

  template.hasResourceProperties("AWS::CodeBuild::Project",
  {
    Source: Match.objectLike({
      BuildSpec: Match.serializedJson(
        Match.objectLike({
          phases: Match.objectLike({
            build: Match.objectLike({ 
              commands: Match.arrayWith(commands)
            })
          })
        })
      )
    })
  })
}

export function expectAndFindPipelineStage(stack: PipelineStack, stageName: string): any{
  let template: Template = Template.fromStack(stack)

  const stagesCapture = new Capture()

  template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
    Stages: Match.arrayWith([Match.objectLike({"Name": stageName, "Actions": stagesCapture})])
  })

  return stagesCapture.asArray()
}

export function expectActionsToContainPartialMatch(stageActions: any[], actionName: string, partialObject: any){
  expect(stageActions).toEqual(
    expect.arrayContaining([
      expect.objectContaining(
         {[actionName]: expect.objectContaining(partialObject)})
]))
}
