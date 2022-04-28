import { RequestStack } from "../features/connections/request-stack"
import { InvitationPolicyStack } from "../features/connections/invitation-policy-stack"
import { MemberProjection } from "./member-projection"
import { ConnectionRequestTable } from "../features/connections/infrastructure/connection-request-table"
import { DeploymentStage } from "./pipeline-builder/deployment-stage"
import { CfnOutput, StageProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"
import { ActivatedMemberHandlerStack } from "../features/connections/activated-member-handler-stack"
import { UnspecifiedRequestHandlerStack } from "../features/connections/unspecified-request-handler-stack"
import { EventBus } from "aws-cdk-lib/aws-events"
import { NetworkingEventBus } from "../infrastructure/event-bus"

interface NetworkingStageProps extends StageProps{
  stageName: string
  membershipEventBusArn: string
  emailConfigurationSet?: string
  userPoolArn: string 
}

export class NetworkingStage extends Stage implements DeploymentStage{
  private connectionRequest: RequestStack
  private invitationPolicy: InvitationPolicyStack
  private connectionRequestTable: ConnectionRequestTable
  private activatedMemberHandler: ActivatedMemberHandlerStack
  private unspecifiedRequestHandler: UnspecifiedRequestHandlerStack
  private memberProjection: MemberProjection
  private eventBus: NetworkingEventBus
  get envvars(): Record<string, CfnOutput> {
    return {...this.memberProjection.envvars, ...this.connectionRequest.envvars}
  }
  
  constructor(scope: Construct, id: string, props: NetworkingStageProps) {
    super(scope, id, props)

    this.memberProjection = new MemberProjection(this, "MemberProjection", {stageName: props.stageName})
    this.connectionRequestTable = new ConnectionRequestTable(this, "ConnectionRequestTable", {stageName: props.stageName})
    
    this.eventBus = new NetworkingEventBus(this, "EventBus", {stageName: props.stageName})

    this.connectionRequest = new RequestStack(this, "ConnectionRequestCommand", 
     {memberProjectionName: this.memberProjection.name, 
      connectionRequestTableName: this.connectionRequestTable.name,
      stageName: props.stageName,
      userPoolArn: props.userPoolArn,
      eventBusName: this.eventBus.Name})
    this.memberProjection.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
    this.connectionRequestTable.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
    this.eventBus.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
  
    this.invitationPolicy = new InvitationPolicyStack(this, "ConnectionRequestOutbox", 
     {connectionRequestTable: this.connectionRequestTable.connectionRequests,
      memberProjectionName: this.memberProjection.name,
      eventBusName: this.eventBus.Name,
      emailConfigurationSet: props.emailConfigurationSet})
    this.memberProjection.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)
    this.eventBus.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)
    
    this.activatedMemberHandler = new ActivatedMemberHandlerStack(this, "MemberActivatedHandler", 
      {memberProjectionName: this.memberProjection.name, 
       membershipEventBusArn: props.membershipEventBusArn})
    this.memberProjection.grantAccessTo(this.activatedMemberHandler.lambda.grantPrincipal)

    this.unspecifiedRequestHandler = new UnspecifiedRequestHandlerStack(this, "UnspecifiedRequestHandler", 
      {memberProjectionName: this.memberProjection.name, 
      connectionRequestTableName: this.connectionRequestTable.name,
       networkingEventBusArn: this.eventBus.Arn})
    this.memberProjection.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)
    this.connectionRequestTable.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)
       
  }

}

