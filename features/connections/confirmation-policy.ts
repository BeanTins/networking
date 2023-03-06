import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { AttributeValue} from "@aws-sdk/client-dynamodb"
import { ConnectionAdded } from "./domain/events"
import { RequestDAO } from "./infrastructure/request-dao"
import { NetworkerDAO } from "./infrastructure/networker-dao"
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
        const command = new SendConfirmationEmailCommand(event.networkerId, event.connectionNetworkerId)

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
    
      event = new ConnectionAdded(connection.networkerId, connection.connectionNetworkerId)
    }

    return event
  }
}

class SendConfirmationEmailCommandHandler {

  private networkerDAO: NetworkerDAO
  private emailClient: SESClient
  private connectionRequest: RequestDAO

  public constructor() {
    this.networkerDAO = new NetworkerDAO(process.env.AWS_REGION!)
    this.emailClient = new SESClient({ region: process.env.AWS_REGION })
    this.connectionRequest = new RequestDAO(process.env.AWS_REGION!)
  }

  async handle(command: SendConfirmationEmailCommand) {

    const invitationId = await this.connectionRequest.getInvitationId(command.networkerId, command.connectionNetworkerId)

    if (invitationId != undefined)
    {
      const networker = await this.networkerDAO.load(command.networkerId)
      const connectionNetworker = await this.networkerDAO.load(command.connectionNetworkerId)

      await this.emailClient.send(ConfirmationSendEmailCommand.build(networker!, connectionNetworker!, process.env.NotificationEmailAddress!))
      await this.connectionRequest.remove(invitationId)
    }
  }
}

class SendConfirmationEmailCommand {

  constructor(networkerId: string, connectionNetworkerId: string){
    this.networkerId = networkerId
    this.connectionNetworkerId = connectionNetworkerId
  }

  networkerId: string
  connectionNetworkerId: string
}


     
