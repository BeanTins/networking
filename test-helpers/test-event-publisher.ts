import  { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import logger from "./service-test-logger"

export class TestEventPublisher {
  private eventbridge: EventBridgeClient
  private eventBusName: string

  constructor(region: string)
  {
    this.eventbridge = new EventBridgeClient({region: region})
    this.eventBusName = process.env.MembershipEventBusFakeArn!
  }

  async activateMember(name: string, email: string, id: string | null)
  {
    const params = {
    Entries: [
      {
        Detail: JSON.stringify({name: name, email: email, id: id}),
        DetailType: "MemberActivatedEvent",
        EventBusName: this.eventBusName,
        Source: "membership.beantins.com",
      }
    ]
    }

    try
    {
       logger.verbose("post MemberActivatedEvent - " + JSON.stringify(params))
       const result = await this.eventbridge.send(new PutEventsCommand(params))
       logger.verbose("post MemberActivatedEvent successfully - " + JSON.stringify(result))
    }
    catch(error)
    {
      logger.error("Failed to post member activated event: " + error)
    }
  }
}
