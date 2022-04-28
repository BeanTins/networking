import { Stack, RemovalPolicy, CfnOutput } from "aws-cdk-lib"
import { Construct } from "constructs"
import { CodePipeline, CodePipelineSource, CodeBuildStep, ManualApprovalStep } from "aws-cdk-lib/pipelines"
import { ReportGroup, BuildSpec } from "aws-cdk-lib/aws-codebuild"
import { Bucket } from "aws-cdk-lib/aws-s3"
import { StageFactory } from "./stage-factory"
import { DeploymentStage } from "./deployment-stage"
import { Role, ServicePrincipal, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam"
import { PropagatedTagSource } from "aws-cdk-lib/aws-ecs"

export enum SCM {
  GitHub = 1
}

export enum ExportType {
  S3 = 1
}

export interface SourceCodeRepoProperties {
  readonly owner: string
  readonly repository: string
  readonly branch: string
}

export interface SourceCodeProperties extends SourceCodeRepoProperties {
  readonly provider?: SCM
  readonly accessIdentifier: string
}

export interface ReportingProperties {
  readonly fromDirectory: string
  readonly withFiles: string[]
  readonly exportingTo?: ExportType
}

export interface ExecutionStageProperties {
  readonly extractingSourceFrom: SourceCodeProperties[]
  readonly executingCommands: string[]
  readonly reporting?: ReportingProperties
  readonly withEnvironmentVariables?: Record<string, any>
}

export interface ResourceAccess {
  readonly resource: string
  readonly withAllowableOperations: string[]
}

export interface CustomDefinitions {
  readonly [name: string]: string
}

export interface StageProperties {
  readonly withCustomDefinitions?: CustomDefinitions
  readonly withPermissionToAccess?: ResourceAccess[]
}

export interface CommitStageProperties extends ExecutionStageProperties, StageProperties {
}

export interface AcceptanceStageProperties extends ExecutionStageProperties, StageProperties{
  readonly exposingEnvVars?: boolean
}

export interface ProductionStageProperties extends StageProperties{
  readonly manualApproval?: boolean
}

export interface PipelineProperties {
  readonly name: string
  readonly commitStage: CommitStageProperties
  readonly acceptanceStage?: AcceptanceStageProperties
  readonly productionStage?: ProductionStageProperties
}

interface DeferredPermissionChange {
  (): void
}

export class PipelineStack extends Stack {
  private stageFactory: StageFactory
  private deferredReportGroupPermissionChanges: DeferredPermissionChange[]
  private cachedSources: Map<string, CodePipelineSource> = new Map()

  constructor(scope: Construct, stageFactory: StageFactory, id: string, props: PipelineProperties) {
    super(scope, id)
    this.stageFactory = stageFactory
    this.deferredReportGroupPermissionChanges = new Array()

    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: props.name,
      synth: this.buildCommitStageStep(props.commitStage)
    })

    if (props.acceptanceStage != undefined){

      const acceptanceDeploymentStage = this.stageFactory.create(this, "AcceptanceTest", "test", props.acceptanceStage.withCustomDefinitions)
    
      const buildStep = this.buildAcceptanceStageStep(props.acceptanceStage, acceptanceDeploymentStage)

      pipeline.addStage(acceptanceDeploymentStage, { post: [buildStep] })
    }

    if (props.productionStage != undefined){
      const productionDeploymentStage = this.stageFactory.create(this, "Production", "prod", props.productionStage.withCustomDefinitions)

      const buildStep = this.buildProductionStageStep(props.productionStage)

      pipeline.addStage(productionDeploymentStage,buildStep)
    }

    this.actionAnyDeferredPermissionChanges(pipeline)
  }

  private buildProductionStageStep(props: ProductionStageProperties) {
    let stepSetup: any = {}

    if (props.manualApproval) {
      stepSetup["pre"] = [new ManualApprovalStep('PromoteToProduction')]
    }

    let commands: string[] = [this.buildStageEnvVarCommand("prod")]

    stepSetup["commands"] = commands

    stepSetup["role"] = this.buildStagePermissionsRole("ProductionExecutionRole",
      props.withPermissionToAccess)

    return stepSetup 
  }

  private actionAnyDeferredPermissionChanges(pipeline: CodePipeline) {
    if (this.deferredReportGroupPermissionChanges.length > 0) {
      pipeline.buildPipeline()
      this.deferredReportGroupPermissionChanges.forEach((changePermission) => {
        changePermission()
      })
    }
  }

  private buildAcceptanceStageStep(props: AcceptanceStageProperties, deployedInfrastructure: DeploymentStage) {

    let buildStepSetup: any = this.buildStepSetupForSourceCode(props.extractingSourceFrom)

    buildStepSetup["commands"] = props.executingCommands

    let reportGroup: ReportGroup | undefined 

    if (props.reporting != undefined) {
      reportGroup = this.buildReportGroup(props.reporting.exportingTo, "Acceptance")
      buildStepSetup["partialBuildSpec"] = this.buildReportingSpec(reportGroup.reportGroupArn, props.reporting)
    }

    let commands: string[] = [this.buildStageEnvVarCommand("test")]

    if(props.exposingEnvVars){
      buildStepSetup["envFromCfnOutputs"] = deployedInfrastructure.envvars

      commands = commands.concat(this.buildEnvironmentVariableExportCommands(deployedInfrastructure.envvars))
    }

    if (props.withEnvironmentVariables != undefined)
    {
      commands = commands.concat(this.buildEnvironmentVariableCommands(props.withEnvironmentVariables))
    }

    commands = commands.concat(props.executingCommands)

    buildStepSetup["commands"] = commands

    buildStepSetup["role"] = this.buildStagePermissionsRole("AcceptanceTestExecutionRole", 
                                                            props.withPermissionToAccess)

    return this.buildBuildStep("AcceptanceTest", buildStepSetup, reportGroup)
  }  

  private buildStagePermissionsRole(name: string, withPermissionToAccess: ResourceAccess[]|undefined) {
    const role = new Role(this, name, {
      assumedBy: new ServicePrincipal("codebuild.amazonaws.com"),
      roleName: name
    })

    if (withPermissionToAccess != undefined) {
      for (const accessingResources of withPermissionToAccess) {

        role.addToPolicy(new PolicyStatement(
          {
            effect: Effect.ALLOW,
            resources: [accessingResources.resource],
            actions: accessingResources.withAllowableOperations
          }))
      }
    }
    return role
  }

  private buildEnvironmentVariableExportCommands(envvars: Record<string, CfnOutput>) {
    let exportEnvCommands = Array()
    let envName: keyof Record<string, CfnOutput>
    for (envName in envvars) {
      exportEnvCommands.push("export " + envName + "=$" + envName)
    }
    return exportEnvCommands
  }

  private buildEnvironmentVariableCommands(envvars: Record<string, any>) {
    let envCommands = Array()
    for (const [name, value] of Object.entries(envvars)) {
      envCommands.push("export " + name + "=" + value)
    }
    return envCommands
  }

  private buildAdditionalInput(sourceCodeProperties: SourceCodeProperties[], sourceCodeList: CodePipelineSource[])
  {
    let additionalInputs: Record<string, CodePipelineSource>|undefined = undefined

    if (sourceCodeList.length > 1)
    {
      additionalInputs = {}

      for (let index = 1; index < sourceCodeProperties.length; index++)
      {
        additionalInputs["..\/" + sourceCodeProperties[index].repository] = sourceCodeList[index]
      }
    }

    return additionalInputs
  }

  private buildStepSetupForSourceCode(sourceCodePropertiesList: SourceCodeProperties[])
  {
    const sourceCodeList = this.buildSourceCode(sourceCodePropertiesList)

    const additionalInputs = this.buildAdditionalInput(sourceCodePropertiesList, sourceCodeList)

    return {
      input: sourceCodeList[0],
      additionalInputs: additionalInputs
    }
  }

  private buildCommitStageStep(commitStageProps: CommitStageProperties) {
    
    let buildStepSetup: any = this.buildStepSetupForSourceCode(commitStageProps.extractingSourceFrom)


    let commands = [this.buildStageEnvVarCommand("commit")]

    if (commitStageProps.withEnvironmentVariables != undefined)
    {
      commands = commands.concat(this.buildEnvironmentVariableCommands(commitStageProps.withEnvironmentVariables))
    }

    commands = commands.concat(commitStageProps.executingCommands)

    buildStepSetup["commands"] = commands

    buildStepSetup["role"] = this.buildStagePermissionsRole("CommitExecutionRole", 
    commitStageProps.withPermissionToAccess)

    let reportGroup: ReportGroup | undefined 

    if (commitStageProps.reporting != undefined) {
      reportGroup = this.buildReportGroup(commitStageProps.reporting.exportingTo, "Commit")
      buildStepSetup["partialBuildSpec"] = this.buildReportingSpec(reportGroup.reportGroupArn, commitStageProps.reporting)
    }

    return this.buildBuildStep("Commit", buildStepSetup, reportGroup)
  }

  private buildStageEnvVarCommand(stage: string) {
    return "export PipelineStage=" + stage
  }

  private buildSourceCode(sourceCodePropertiesList: SourceCodeProperties[]): CodePipelineSource[] {
    let sourceCodeList: CodePipelineSource[] = []
    
    for (const sourceCodeProp of sourceCodePropertiesList)
    {
      if (this.cachedSources.has(JSON.stringify(sourceCodeProp))){
        sourceCodeList.push(this.cachedSources.get(JSON.stringify(sourceCodeProp))!)
      }
      else
      {
        const sourceCode = CodePipelineSource.connection(sourceCodeProp.owner + "/" + sourceCodeProp.repository,
                                                         sourceCodeProp.branch,
                                                         {connectionArn: sourceCodeProp.accessIdentifier})

        this.cachedSources.set(JSON.stringify(sourceCodeProp), sourceCode)
        sourceCodeList.push(sourceCode)
      }
    }
    return sourceCodeList
  }

  private buildBuildStep(name: string, buildStepSetup: any, reportGroup: ReportGroup | undefined) {
    const buildStep = new CodeBuildStep(name, buildStepSetup)
    if (reportGroup != undefined) {
      this.deferredReportGroupPermissionChanges.push(() => {
        if (reportGroup != undefined)
          reportGroup.grantWrite(buildStep.grantPrincipal)
      })
    }
    return buildStep
  }

  private buildReportingSpec(reportGroupArn: string, reporting: ReportingProperties) {

    const reportBuildSpec = BuildSpec.fromObject({
      version: '0.2',
      env: {
          shell: "bash"
      },
      reports: {
        [reportGroupArn]: {
          files: reporting.withFiles,
          'file-format': 'JUNITXML',
          'base-directory': reporting.fromDirectory
        }
      }
    })
    return reportBuildSpec
  }

  private buildReportGroup(exportType: ExportType | undefined, prependLabel: string) {
    let reportGroupSetup: any = {}
    if (exportType == ExportType.S3) {
      const reportBucket = new Bucket(this, prependLabel + "ReportExports", { removalPolicy: RemovalPolicy.DESTROY })

      reportGroupSetup["exportBucket"] = reportBucket
    }

    const jestReportGroup = new ReportGroup(this, prependLabel + "JestReportGroup", reportGroupSetup)
    return jestReportGroup
  }
}
