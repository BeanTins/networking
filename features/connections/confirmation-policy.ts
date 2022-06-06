import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { AttributeValue} from "@aws-sdk/client-dynamodb"
import { ConnectionAdded } from "./domain/events"
import { ConnectionRequestDAO } from "./infrastructure/connection-request-dao"
import { MemberDAO } from "./infrastructure/member-dao"
import logger from "../../infrastructure/lambda-logger"
import { SESClient} from "@aws-sdk/client-ses"
import { ConfirmationSendEmailCommand } from "./infrastructure/confirmation-send-email-command"
import { EventDispatcher } from "../../infrastructure/event-dispatcher"

export const lambdaHandler = async (event: DynamoDBStreamEvent, context: Context): Promise<any> => {

  const policy = new ConfirmationPolicy()

  await policy.invoke(event)
}

class ConfirmationPolicy {

  private commandHandler: SendConfirmationEmailCommandHandler
  private eventDispatcher: EventDispatcher

  constructor(){
    this.commandHandler = new SendConfirmationEmailCommandHandler()
    this.eventDispatcher = new EventDispatcher(process.env.AWS_REGION!)
  }

  async invoke(dynamoDBStreamEvent: DynamoDBStreamEvent) {

    try
    {
      const event = this.resolveConnectionEvent(dynamoDBStreamEvent)

      if (event != undefined)
      {
        const command = new SendConfirmationEmailCommand(event.memberId, event.connectionMemberId)

        await this.commandHandler.handle(command)

        await this.eventDispatcher.dispatch(event)
      }
    }
    catch(error)
    {
      logger.error(error)
    }
  }

  resolveConnectionEvent(dynamoDBStreamEvent: DynamoDBStreamEvent) : ConnectionAdded | undefined
  {
     let event: ConnectionAdded | undefined
     const record = dynamoDBStreamEvent.Records[0];
     const {
      // @ts-ignore
      dynamodb: { NewImage, OldImage },
      eventName,
    } = record
  
    if (eventName == "INSERT")
    {
      const connection = unmarshall(
        NewImage as {
          [key: string]: AttributeValue
        }
      )
    
      event = new ConnectionAdded(connection.memberId, connection.connectionMemberId)
    }

    return event
  }
}

class SendConfirmationEmailCommandHandler {

  private memberDAO: MemberDAO
  private emailClient: SESClient
  private connectionRequest: ConnectionRequestDAO

  public constructor() {
    this.memberDAO = new MemberDAO()
    this.emailClient = new SESClient({ region: process.env.AWS_REGION })
    this.connectionRequest = new ConnectionRequestDAO()
  }

  async handle(command: SendConfirmationEmailCommand) {

    const invitationId = await this.connectionRequest.getInvitationId(command.memberId, command.connectionMemberId)

    if (invitationId != undefined)
    {
      const member = await this.memberDAO.load(command.memberId)
      const connectionMember = await this.memberDAO.load(command.connectionMemberId)

      await this.emailClient.send(ConfirmationSendEmailCommand.build(member!, connectionMember!, process.env.NotificationEmailAddress!))
      await this.connectionRequest.remove(invitationId)
    }
  }
}

class SendConfirmationEmailCommand {

  constructor(memberId: string, connectionMemberId: string){
    this.memberId = memberId
    this.connectionMemberId = connectionMemberId
  }

  memberId: string
  connectionMemberId: string
}


     
