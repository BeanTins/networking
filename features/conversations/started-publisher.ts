import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { ConversationStarted } from "./domain/events"
import { ConversationSnapshot } from "./infrastructure/conversation-snapshot"
import { unmarshall } from "@aws-sdk/util-dynamodb"
import { AttributeValue} from "@aws-sdk/client-dynamodb"
import logger from "../../infrastructure/lambda-logger"
import { EventDispatcher } from "../../infrastructure/event-dispatcher"

export const lambdaHandler = async (dynamoDBStreamEvent: DynamoDBStreamEvent, context: Context): Promise<any> => {
  
    try{
    const event = EventParser.parse(dynamoDBStreamEvent) 

    if (event != undefined)
    {
      const eventDispatcher = new EventDispatcher(process.env.AWS_REGION!)
        await eventDispatcher.dispatch(event)
    }
  }
  catch(error)
  {
    logger.error("Failed to publish conversation started event - " + error)
  }
}

export class EventParser{
  static parse(dynamoDBStreamEvent: DynamoDBStreamEvent){

    let event: ConversationStarted | undefined
    const record = dynamoDBStreamEvent.Records[0];
    const {
      // @ts-ignore
      dynamodb: { NewImage, OldImage },
      eventName,
    } = record

    if (eventName == "INSERT")
    {
      var conversation: ConversationSnapshot = this.resolveSnapshot(NewImage)

      event = new ConversationStarted(conversation.id, conversation.participantIds, conversation.adminIds, conversation.name)
    }

    return event
  }

  static resolveSnapshot(image: any)
  {
    const unmarshalledImage = unmarshall(
      image as {
        [key: string]: AttributeValue
      }
    )
  
    const snapshot = new ConversationSnapshot()
    snapshot.id = unmarshalledImage.id
    snapshot.name = unmarshalledImage.name
    snapshot.participantIds = new Set(unmarshalledImage.participantIds)
    snapshot.adminIds = new Set(unmarshalledImage.adminIds)
  
    return snapshot
  }
}



