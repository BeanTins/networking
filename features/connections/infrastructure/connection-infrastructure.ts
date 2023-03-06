import { Stage, StageProps } from "aws-cdk-lib"
import { NetworkingEventBus } from "../../../infrastructure/event-bus"
import { StackFactory } from "../../../provisioning/stack-factory"
import { RequestCommand } from "../request-stack"
import { ResponseCommand } from "../response-stack"
import { InvitationPolicyStack } from "../invitation-policy-stack"
import { ConfirmationPolicy } from "../confirmation-policy-stack"
import { NetworkerProjection } from "./networker-projection"
import { RequestTable } from "./request-table"
import { ConnectionsTable } from "./connections-table"
import { ActivatedMemberHandler } from "../activated-member-handler-stack"
import { UnspecifiedRequestHandler } from "../unspecified-request-handler-stack"
import { ValidateConnectionsQueues } from "./validate-connections-queues-stack"
import { ValidateQuery } from "../validate-query-stack"

interface SocialisingStageProps extends StageProps{
    stageName: string
    membershipEventBusArn: string
    emailConfigurationSet?: string
    userPoolArn: string 
    notificationEmailAddress: string
    eventListenerQueueArn?: string
    stackNamePrepend?: string
}
  
export class ConnectionInfrastructure{
  serviceName: string | undefined
  stage: Stage
  stackFactory: StackFactory

  private connectionRequest: RequestCommand
  private connectionResponse: ResponseCommand
  private confirmationPolicy: ConfirmationPolicy
  private invitationPolicy: InvitationPolicyStack
  private connectionRequestTable: RequestTable
  private connectionsTable: ConnectionsTable
  private activatedMemberHandler: ActivatedMemberHandler
  private unspecifiedRequestHandler: UnspecifiedRequestHandler
  private networkerProjection: NetworkerProjection
  private validateConnectionsQueues: ValidateConnectionsQueues
  private validateQuery: ValidateQuery 

  public constructor(serviceName: string | undefined, stage: Stage) {
    this.serviceName = serviceName
    this.stage = stage
    this.stackFactory = new StackFactory(serviceName, "Connection", stage)
  }

  build(membershipEventBusArn: string, 
    stageName: string, 
    eventBus: NetworkingEventBus,
    userPoolArn: string,
    emailConfigurationSet: string,
    notificationEmailAddress: string)
  {
    this.networkerProjection = this.stackFactory.create(NetworkerProjection, {stageName: stageName})
    this.connectionRequestTable = this.stackFactory.create(RequestTable, { stageName: stageName })
    this.connectionsTable = this.stackFactory.create(ConnectionsTable, {})
    this.validateConnectionsQueues = this.stackFactory.create(ValidateConnectionsQueues, {deploymentName: stageName})

    this.buildRequestCommand(stageName, userPoolArn, eventBus)
    this.buildResponseCommand(stageName, userPoolArn, eventBus)
    this.buildValidateQuery(stageName, userPoolArn, eventBus)
    this.buildConfirmationCommand(emailConfigurationSet, notificationEmailAddress, eventBus)
    this.buildInvitationPolicy(emailConfigurationSet, notificationEmailAddress, eventBus)
    this.buildActivatedMemberHandler(membershipEventBusArn)
    this.buildUnspecifiedRequestHandler(membershipEventBusArn, eventBus.Arn)
  }

  private buildRequestCommand(stageName: string, userPoolArn: string, eventBus: NetworkingEventBus) {

    this.connectionRequest = this.stackFactory.create(RequestCommand,
        {
          networkerProjectionName: this.networkerProjection.name,
          connectionRequestTableName: this.connectionRequestTable.name,
          stageName: stageName,
          userPoolArn: userPoolArn,
          eventBusName: eventBus.Name
        })
      this.networkerProjection.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
      this.connectionRequestTable.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
      eventBus.grantAccessTo(this.connectionRequest.lambda.grantPrincipal)
  
  }

  private buildResponseCommand(stageName: string, userPoolArn: string, eventBus: NetworkingEventBus) {
    this.connectionResponse = this.stackFactory.create(ResponseCommand,
        {
          networkerProjectionName: this.networkerProjection.name,
          connectionRequestTableName: this.connectionRequestTable.name,
          connectionsTableName: this.connectionsTable.name,
          stageName: stageName,
          userPoolArn: userPoolArn,
          eventBusName: eventBus.Name
        })
      this.networkerProjection.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)
      this.connectionRequestTable.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)
      this.connectionsTable.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)
      eventBus.grantAccessTo(this.connectionResponse.lambda.grantPrincipal)
  }

  private buildValidateQuery(stageName: string, userPoolArn: string, eventBus: NetworkingEventBus) {
    this.validateQuery = this.stackFactory.create(ValidateQuery,
        {
          connectionsTableName: this.connectionsTable.name,
          requestQueueArn: this.validateConnectionsQueues.requestQueue.queueArn,
          responseQueueName: this.validateConnectionsQueues.responseQueue.queueName
        })
      this.connectionsTable.grantAccessTo(this.validateQuery.lambda.grantPrincipal)
      this.validateConnectionsQueues.requestQueue.grantConsumeMessages(this.validateQuery.lambda.grantPrincipal)
      this.validateConnectionsQueues.responseQueue.grantSendMessages(this.validateQuery.lambda.grantPrincipal)
  }

  private buildConfirmationCommand(emailConfigurationSet: string, notificationEmailAddress: string, eventBus: NetworkingEventBus) {
    this.confirmationPolicy = this.stackFactory.create(ConfirmationPolicy,
        {
          connectionRequestTableName: this.connectionRequestTable.name,
          connectionsTable: this.connectionsTable.connections,
          networkerProjectionName: this.networkerProjection.name,
          eventBusName: eventBus.Name,
          emailConfigurationSet: emailConfigurationSet,
          notificationEmailAddress: notificationEmailAddress
        })
      this.networkerProjection.grantAccessTo(this.confirmationPolicy.lambda.grantPrincipal)
      this.connectionRequestTable.grantAccessTo(this.confirmationPolicy.lambda.grantPrincipal)
      eventBus.grantAccessTo(this.confirmationPolicy.lambda.grantPrincipal)
    }

    private buildInvitationPolicy(emailConfigurationSet: string, notificationEmailAddress: string, eventBus: NetworkingEventBus) {
        this.invitationPolicy = this.stackFactory.create(InvitationPolicyStack,
        {
            connectionRequestTable: this.connectionRequestTable.connectionRequests,
            networkerProjectionName: this.networkerProjection.name,
            eventBusName: eventBus.Name,
            emailConfigurationSet: emailConfigurationSet,
            notificationEmailAddress: notificationEmailAddress
        })
        this.networkerProjection.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)
        eventBus.grantAccessTo(this.invitationPolicy.lambda.grantPrincipal)
    }

    private buildActivatedMemberHandler(membershipEventBusArn: string) {
        this.activatedMemberHandler = this.stackFactory.create(ActivatedMemberHandler,
        {
            networkerProjectionName: this.networkerProjection.name,
            membershipEventBusArn: membershipEventBusArn
        })
        this.networkerProjection.grantAccessTo(this.activatedMemberHandler.lambda.grantPrincipal)
    }

    private buildUnspecifiedRequestHandler(membershipEventBusArn: string, eventBusArn: string) {
        this.unspecifiedRequestHandler = this.stackFactory.create(UnspecifiedRequestHandler,
            {
              networkerProjectionName: this.networkerProjection.name,
              connectionRequestTableName: this.connectionRequestTable.name,
              networkingEventBusArn: eventBusArn
            })
        this.networkerProjection.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)
        this.connectionRequestTable.grantAccessTo(this.unspecifiedRequestHandler.lambda.grantPrincipal)    
    }
}



