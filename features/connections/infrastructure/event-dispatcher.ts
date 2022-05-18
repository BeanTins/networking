import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import logger from "./logger"

export class EventDispatcher{
    private client: EventBridgeClient

    constructor(region: string)
    {
       this.client = new EventBridgeClient({region: region})
    }
    async dispatch(event: any) {

      const eventName = event.constructor.name
      const params = {
          Entries: [
          {
            Detail: JSON.stringify(event),
            DetailType: eventName,
            EventBusName: process.env.EventBusName,
            Source: "networking.beantins.com",
          },
        ]
     }

     try{
       const result = await this.client.send(new PutEventsCommand(params))
     }
     catch(error)
     {
       logger.error("post " + eventName + " Integration event failed for params: " + JSON.stringify(params) + "with error: " + JSON.stringify(error))
     }
  }
}
