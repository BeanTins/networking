import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { EventBridge } from "aws-sdk"
import { AttributeValue} from "aws-sdk/clients/dynamodb"
import { ConnectionRequestedEvent } from "./domain/events"
import { MemberDAO } from "./infrastructure/member-dao"
import logger from "./infrastructure/logger"
import { ConnectionInvitationEmailSender } from "./infrastructure/connection-invitation-email-sender"

export const lambdaHandler = async (event: DynamoDBStreamEvent, context: Context): Promise<any> => {

  const policy = new InviteConnectionPolicy()

  await policy.invokeInvitation(event)
}

class InviteConnectionPolicy {

  private commandHandler: SendConnectionEmailCommandHandler

  constructor(){
    this.commandHandler = new SendConnectionEmailCommandHandler()
  }

  async invokeInvitation(dynamoDBStreamEvent: DynamoDBStreamEvent) {

    try
    {
      const event = this.resolveConnectionRequestedEvent(dynamoDBStreamEvent)

      if (event != undefined)
      {
        const command = new SendConnectionEmailCommand(event.invitationId, event.initiatingMemberId, event.invitedMemberId)

        await this.commandHandler.handle(command)

        await this.postAsIntegrationEvent(event)
      }
    }
    catch(error)
    {
      logger.error(error)
    }
  }

  resolveConnectionRequestedEvent(dynamoDBStreamEvent: DynamoDBStreamEvent)
  {
     let event: ConnectionRequestedEvent | undefined
     const record = dynamoDBStreamEvent.Records[0];
     const {
      // @ts-ignore
      dynamodb: { NewImage, OldImage },
      eventName,
    } = record
  
    if (eventName == "INSERT")
    {
      const unmarshalledImage = unmarshall(
        NewImage as {
          [key: string]: AttributeValue
        }
      )
    
      event = <ConnectionRequestedEvent>unmarshalledImage
    }

    return event
  }

  async postAsIntegrationEvent(event: ConnectionRequestedEvent) {

    const eventbridge = new EventBridge()

    const params = {
        Entries: [
            {
                Detail: JSON.stringify(event),
                DetailType: event.constructor.name,
                EventBusName: process.env.eventBusName,
                Source: "networking.beantins.com",
            },
        ]
    }

    const result = await eventbridge.putEvents(params).promise()
  }
}

class SendConnectionEmailCommandHandler {

  private memberDAO: MemberDAO
  private emailSender: ConnectionInvitationEmailSender

  public constructor() {
    this.memberDAO = new MemberDAO()
    this.emailSender = new ConnectionInvitationEmailSender("us-east-1")
  }

  async handle(command: SendConnectionEmailCommand) {

    const sender = await this.memberDAO.load(command.initiatingMemberId)
    const recipient = await this.memberDAO.load(command.invitedMemberId)

    await this.emailSender.sendConnectionInvite(sender!, recipient!, command.invitationId)
  }
}

class SendConnectionEmailCommand {

  constructor(invitationId: string, initiatingMemberId: string, invitedMemberId: string){
    this.invitationId = invitationId
    this.initiatingMemberId = initiatingMemberId
    this.invitedMemberId = invitedMemberId
  }

  invitationId: string
  initiatingMemberId: string
  invitedMemberId: string
}

class ConnectionRequestedEventResolveError extends Error{}


     
