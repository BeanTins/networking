import { ConnectionRequestCommand } from "../features/connections/request-stack"
import { ConnectionResponseCommand } from "../features/connections/response-stack"
import { InvitationPolicyStack } from "../features/connections/invitation-policy-stack"
import { ConfirmationPolicy } from "../features/connections/confirmation-policy-stack"
import { MemberProjection } from "../features/connections/infrastructure/member-projection"
import { ConnectionRequestTable } from "../features/connections/infrastructure/connection-request-table"
import { ConnectionsTable } from "../features/connections/infrastructure/connections-table"
import { ConversationsTable } from "../features/conversations/infrastructure/conversations-table"
import { DeploymentStage } from "./pipeline-builder/deployment-stage"
import { StageProps, Stage } from "aws-cdk-lib"
import { Construct } from "constructs"
import { ActivatedMemberHandler } from "../features/connections/activated-member-handler-stack"
import { UnspecifiedRequestHandler } from "../features/connections/unspecified-request-handler-stack"
import { NetworkingEventBus } from "../infrastructure/event-bus"
import { ConversationStartCommand} from "../features/conversations/start-stack"
import { ConversationStartedPublisher } from "../features/conversations/started-publisher-stack"

interface NetworkingStageProps extends StageProps{
  stageName: string
  membershipEventBusArn: string
  emailConfigurationSet?: string
  userPoolArn: string 
  notificationEmailAddress: string
  eventListenerQueueArn?: string
  stackNamePrepend?: string
}

export class NetworkingStage extends Stage implements DeploymentStage{
  private connectionRequest: ConnectionRequestCommand
  private connectionResponse: ConnectionResponseCommand
  private confirmationPolicy: ConfirmationPolicy
  private invitationPolicy: InvitationPolicyStack
  private connectionRequestTable: ConnectionRequestTable
  private connectionsTable: ConnectionsTable
  private conversationsTable: ConversationsTable
  private activatedMemberHandler: ActivatedMemberHandler
  private unspecifiedRequestHandler: UnspecifiedRequestHandler
  private conversationStart: ConversationStartCommand
  private conversationStartedPublisher: ConversationStartedPublisher
  private memberProjection: MemberProjection
  private eventBus: NetworkingEventBus
  private customStackNamePrepend: string|undefined
  private _envvars: string[]

  get envvars(): string[] {
    return this._envvars
  }
  
  createStack<Type, PropType>(type: (new (scope: Construct, id: string, props: PropType) => Type), props?: PropType): Type {
    
    if (this.customStackNamePrepend != undefined)
    {
      //@ts-ignore
      props.stackName = this.customStackNamePrepend + type.name
    }

    let passedInProperties = props
    if (props == undefined)
    {
      //@ts-ignore
      passedInProperties = {}
    }
    const stack = new type(this, type.name, passedInProperties!)

    //@ts-ignore
    if (stack.envvars != undefined)
    {
      // @ts-ignore
      this._envvars = this._envvars.concat(stack.envvars)
    }

    return stack
  }

  constructor(scope: Construct, id: string, props: NetworkingStageProps) {
    
    super(scope, id, props)

    this._envvars = []
    this.customStackNamePrepend = props.stackNamePrepend
    this.memberProjection = this.createStack(MemberProjection, { stageName: props.stageName })

    this.eventBus = this.createStack(NetworkingEventBus, { stageName: props.stageName })

    if (props.eventListenerQueueArn != undefined) {
      this.eventBus.listenOnQueueFor(props.eventListenerQueueArn)
    }

    this.buildConnectionInfrastructure(props)

    this.buildConversationInfrastructure(props)
  }

  private buildConversationInfrastructure(props: NetworkingStageProps) {
    this.conversationsTable = this.createStack(ConversationsTable, { stageName: props.stageName })

    this.conversationStart = this.createStack(ConversationStartCommand, {
        conversationsTableName: this.conversationsTable.name,
        connectionsTableName: this.connectionsTable.name,
        stageName: props.stageName,
        userPoolArn: props.userPoolArn
    })
    this.connectionsTable.grantAccessTo(this.conversationStart.lambda.grantPrincipal)
    this.conversationsTable.grantAccessTo(this.conversationStart.lambda.grantPrincipal)

    this.conversationStartedPublisher = this.createStack(ConversationStartedPublisher,
    {
      conversationsTable: this.conversationsTable.conversations,
      eventBusName: this.eventBus.Name,
      eventBusArn: this.eventBus.Arn
    })
    this.conversationsTable.grantAccessTo(this.conversationStartedPublisher.lambda.grantPrincipal)      
    this.eventBus.grantAccessTo(this.conversationStartedPublisher.lambda.grantPrincipal)
  }

  private buildConnectionInfrastructure(props: NetworkingStageProps) {
    this.connectionRequestTable = this.createStack(ConnectionRequestTable, { stageName: props.stageName })
    this.connectionsTable = this.createStack(ConnectionsTable, {})
    this.connectionRequest = this.createStack(ConnectionRequestCommand,
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

    this.connectionResponse = this.createStack(ConnectionResponseCommand,
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

    this.confirmationPolicy = this.createStack(ConfirmationPolicy,
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

    this.invitationPolicy = this.createStack(InvitationPolicyStack,
      {
        connectionRequestTable: this.connectionRequestTable.connectionRequests,
        memberProjectionName: this.memberProjection.name,
        eventBusName: this.eventBus.Name,
        emailConfigurationSet: props.emailConfigurationSet,
        notificationEmailAddress: props.notificationEmailAddress
      })
    this.memberProjection.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)
    this.eventBus.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)

    this.activatedMemberHandler = this.createStack(ActivatedMemberHandler,
      {
        memberProjectionName: this.memberProjection.name,
        membershipEventBusArn: props.membershipEventBusArn
      })
    this.memberProjection.grantAccessTo(this.activatedMemberHandler.lambda.grantPrincipal)

    this.unspecifiedRequestHandler = this.createStack(UnspecifiedRequestHandler,
      {
        memberProjectionName: this.memberProjection.name,
        connectionRequestTableName: this.connectionRequestTable.name,
        networkingEventBusArn: this.eventBus.Arn
      })
    this.memberProjection.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)
    this.connectionRequestTable.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)
  }
}

