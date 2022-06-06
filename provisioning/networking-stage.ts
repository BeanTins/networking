import { RequestStack } from "../features/connections/request-stack"
import { ResponseStack } from "../features/connections/response-stack"
import { InvitationPolicyStack } from "../features/connections/invitation-policy-stack"
import { ConfirmationPolicyStack } from "../features/connections/confirmation-policy-stack"
import { MemberProjection } from "../features/connections/infrastructure/member-projection"
import { ConnectionRequestTable } from "../features/connections/infrastructure/connection-request-table"
import { ConnectionsTable } from "../features/connections/infrastructure/connections-table"
import { ConversationsTable } from "../features/conversations/infrastructure/conversations-table"
import { DeploymentStage } from "./pipeline-builder/deployment-stage"
import { CfnOutput, StageProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"
import { ActivatedMemberHandlerStack } from "../features/connections/activated-member-handler-stack"
import { UnspecifiedRequestHandlerStack } from "../features/connections/unspecified-request-handler-stack"
import { NetworkingEventBus } from "../infrastructure/event-bus"
import { StartStack} from "../features/conversations/start-stack"
import { StartedPublisherStack } from "../features/conversations/started-publisher-stack"

interface NetworkingStageProps extends StageProps{
  stageName: string
  membershipEventBusArn: string
  emailConfigurationSet?: string
  userPoolArn: string 
  notificationEmailAddress: string
  eventListenerQueueArn?: string
}

export class NetworkingStage extends Stage implements DeploymentStage{
  private connectionRequest: RequestStack
  private connectionResponse: ResponseStack
  private confirmationPolicy: ConfirmationPolicyStack
  private invitationPolicy: InvitationPolicyStack
  private connectionRequestTable: ConnectionRequestTable
  private connectionsTable: ConnectionsTable
  private conversationsTable: ConversationsTable
  private activatedMemberHandler: ActivatedMemberHandlerStack
  private unspecifiedRequestHandler: UnspecifiedRequestHandlerStack
  private conversationStart: StartStack
  private conversationStartedPublisher: StartedPublisherStack
  private memberProjection: MemberProjection
  private eventBus: NetworkingEventBus
  get envvars(): Record<string, CfnOutput> {
    return {...this.memberProjection.envvars, ...this.connectionRequest.envvars}
  }
  
  constructor(scope: Construct, id: string, props: NetworkingStageProps) {
    super(scope, id, props)

    this.memberProjection = new MemberProjection(this, "MemberProjection", { stageName: props.stageName })

    this.eventBus = new NetworkingEventBus(this, "EventBus", { stageName: props.stageName })

    if (props.eventListenerQueueArn != undefined) {
      this.eventBus.listenOnQueueFor(props.eventListenerQueueArn)
    }

    this.buildConnectionInfrastructure(props)

    this.buildConversationInfrastructure(props)
       
  }

  private buildConversationInfrastructure(props: NetworkingStageProps) {
    this.conversationsTable = new ConversationsTable(this, "ConversationsTable", { stageName: props.stageName })

    this.conversationStart = new StartStack(this, "ConversationStartCommand",
      {
        conversationsTableName: this.conversationsTable.name,
        connectionsTableName: this.connectionsTable.name,
        stageName: props.stageName,
        userPoolArn: props.userPoolArn
      })
      this.connectionsTable.grantAccessTo(this.conversationStart.lambda.grantPrincipal)
      this.conversationsTable.grantAccessTo(this.conversationStart.lambda.grantPrincipal)

      this.conversationStartedPublisher = new StartedPublisherStack(this, "StartedPublisher", 
      {
        conversationsTable: this.conversationsTable.conversations,
        eventBusName: this.eventBus.Name,
        eventBusArn: this.eventBus.Arn
      })
      this.conversationsTable.grantAccessTo(this.conversationStartedPublisher.lambda.grantPrincipal)      
      this.eventBus.grantAccessTo(this.conversationStartedPublisher.lambda.grantPrincipal)
  }

  private buildConnectionInfrastructure(props: NetworkingStageProps) {
    this.connectionRequestTable = new ConnectionRequestTable(this, "ConnectionRequestTable", { stageName: props.stageName })
    this.connectionsTable = new ConnectionsTable(this, "ConnectionsTable", { stageName: props.stageName })

    this.connectionRequest = new RequestStack(this, "ConnectionRequestCommand",
      {
        memberProjectionName: this.memberProjection.name,
        connectionRequestTableName: this.connectionRequestTable.name,
        stageName: props.stageName,
        userPoolArn: props.userPoolArn,
        eventBusName: this.eventBus.Name
      })
    this.memberProjection.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
    this.connectionRequestTable.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
    this.eventBus.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)

    this.connectionResponse = new ResponseStack(this, "ConnectionResponseCommand",
      {
        memberProjectionName: this.memberProjection.name,
        connectionRequestTableName: this.connectionRequestTable.name,
        connectionsTableName: this.connectionsTable.name,
        stageName: props.stageName,
        userPoolArn: props.userPoolArn,
        eventBusName: this.eventBus.Name
      })
    this.memberProjection.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)
    this.connectionRequestTable.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)
    this.connectionsTable.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)
    this.eventBus.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)

    this.confirmationPolicy = new ConfirmationPolicyStack(this, "ConfirmationPolicy",
      {
        connectionRequestTableName: this.connectionRequestTable.name,
        connectionsTable: this.connectionsTable.connections,
        memberProjectionName: this.memberProjection.name,
        eventBusName: this.eventBus.Name,
        emailConfigurationSet: props.emailConfigurationSet,
        notificationEmailAddress: props.notificationEmailAddress
      })
    this.memberProjection.grantAccessTo(this.confirmationPolicy.lambda.grantPrincipal)
    this.connectionRequestTable.grantAccessTo(this.confirmationPolicy.lambda.grantPrincipal)
    this.eventBus.grantAccessTo(this.confirmationPolicy.lambda.grantPrincipal)

    this.invitationPolicy = new InvitationPolicyStack(this, "InvitationPolicy",
      {
        connectionRequestTable: this.connectionRequestTable.connectionRequests,
        memberProjectionName: this.memberProjection.name,
        eventBusName: this.eventBus.Name,
        emailConfigurationSet: props.emailConfigurationSet,
        notificationEmailAddress: props.notificationEmailAddress
      })
    this.memberProjection.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)
    this.eventBus.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)

    this.activatedMemberHandler = new ActivatedMemberHandlerStack(this, "MemberActivatedHandler",
      {
        memberProjectionName: this.memberProjection.name,
        membershipEventBusArn: props.membershipEventBusArn
      })
    this.memberProjection.grantAccessTo(this.activatedMemberHandler.lambda.grantPrincipal)

    this.unspecifiedRequestHandler = new UnspecifiedRequestHandlerStack(this, "UnspecifiedRequestHandler",
      {
        memberProjectionName: this.memberProjection.name,
        connectionRequestTableName: this.connectionRequestTable.name,
        networkingEventBusArn: this.eventBus.Arn
      })
    this.memberProjection.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)
    this.connectionRequestTable.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)
  }
}

