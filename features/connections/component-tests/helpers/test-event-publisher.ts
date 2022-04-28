import  { EventBridge } from "aws-sdk"
import AWS from "aws-sdk"
import logger from "./component-test-logger"

export class TestEventPublisher {
  private eventbridge: EventBridge
  private eventBusName: string

  constructor(region: string)
  {
    AWS.config.update({region: region})
    this.eventbridge = new EventBridge()
    this.eventBusName = process.env.MembershipEventBusFakeArn!
  }

  async activateMember(name: string, email: string, id: string | null)
  {
    const params: EventBridge.PutEventsRequest = {
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
       const result = await this.eventbridge.putEvents(params).promise()
       logger.verbose("post MemberActivatedEvent successfully - " + JSON.stringify(result))
    }
    catch(error)
    {
      logger.error("Failed to post member activated event: " + error)
    }
  }
}
