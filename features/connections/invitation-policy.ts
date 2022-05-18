import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { AttributeValue} from "@aws-sdk/client-dynamodb"
import { ConnectionRequested } from "./domain/events"
import { MemberDAO } from "./infrastructure/member-dao"
import logger from "./infrastructure/logger"
import { InvitationSendEmailCommand } from "./infrastructure/invitation-send-email-command"
import { SESClient } from "@aws-sdk/client-ses"
import { EventDispatcher } from "./infrastructure/event-dispatcher"

export const lambdaHandler = async (event: DynamoDBStreamEvent, context: Context): Promise<any> => {

  const policy = new InvitationPolicy()

  await policy.invoke(event)
}

class InvitationPolicy {

  private commandHandler: SendInvitationEmailCommandHandler
  private eventDispatcher: EventDispatcher

  constructor(){
    this.commandHandler = new SendInvitationEmailCommandHandler()
    this.eventDispatcher = new EventDispatcher(process.env.AWS_REGION!)
  }

  async invoke(dynamoDBStreamEvent: DynamoDBStreamEvent) {

    try
    {
      const event = this.resolveConnectionRequestedEvent(dynamoDBStreamEvent)

      if (event != undefined)
      {
        const command = new SendInvitationEmailCommand(event.invitationId, event.initiatingMemberId, event.invitedMemberId)

        await this.commandHandler.handle(command)

        await this.eventDispatcher.dispatch(event)
      }
    }
    catch(error)
    {
      logger.error(error)
    }
  }

  resolveConnectionRequestedEvent(dynamoDBStreamEvent: DynamoDBStreamEvent): ConnectionRequested | undefined
  {
     let event: ConnectionRequested | undefined
     const record = dynamoDBStreamEvent.Records[0];
     const {
      // @ts-ignore
      dynamodb: { NewImage, OldImage },
      eventName,
    } = record
  
    if (eventName == "INSERT")
    {
      const connectionRequest = unmarshall(
        NewImage as {
          [key: string]: AttributeValue
        }
      )
    
      event = new ConnectionRequested(connectionRequest.initiatingMemberId, connectionRequest.invitedMemberId, connectionRequest.invitationId)
    }

    return event
  }
}

class SendInvitationEmailCommandHandler {

  private memberDAO: MemberDAO
  private emailClient: SESClient

  public constructor() {
    this.memberDAO = new MemberDAO()
    this.emailClient = new SESClient({ region: process.env.AWS_REGION! })
  }

  async handle(command: SendInvitationEmailCommand) {

    const sender = await this.memberDAO.load(command.initiatingMemberId)
    const recipient = await this.memberDAO.load(command.invitedMemberId)

    await this.emailClient.send(InvitationSendEmailCommand.build(sender!, recipient!, command.invitationId, process.env.NotificationEmailAddress!))
  }
}

class SendInvitationEmailCommand {

  constructor(invitationId: string, initiatingMemberId: string, invitedMemberId: string){
    this.invitationId = invitationId
    this.initiatingMemberId = initiatingMemberId
    this.invitedMemberId = invitedMemberId
  }

  invitationId: string
  initiatingMemberId: string
  invitedMemberId: string
}



     
