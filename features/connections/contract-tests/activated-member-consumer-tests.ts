import * as path from "path"
import { MessageConsumerPact, asynchronousBodyHandler, Matchers } from "@pact-foundation/pact"
import { lambdaHandler } from "../activated-member-handler"
import { EventBridgeEvent, Context } from "aws-lambda"
const {like, term, somethingLike} = Matchers
import { DataMapperFactoryMock} from "../../../test-helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"

let dataMapperFactory = new DataMapperFactoryMock()

dataMapperFactory.create(Member.name)

DataMapperFactory.create = dataMapperFactory.map()

const activatedMemberAdapter = async function (activatedMemberEvent: any) {
  let context: Context
  const event = {
    detail: 
    {  
      id: activatedMemberEvent["id"],
      name: activatedMemberEvent["name"],
      email: activatedMemberEvent["email"]
    }
  } as EventBridgeEvent<any, any>

  return await lambdaHandler(event, context!)
}

const messagePact = new MessageConsumerPact({
  consumer: "networkingservice",
  dir: path.resolve(process.cwd(), "pacts"),
  pactfileWriteMode: "update",
  provider: "membershipservice",
})

test("consume member activated event", () => {
  return (
    messagePact
      .expectsToReceive("a member activated event")
      .withContent({
        id: term({ generate: "1bcb1be1-8dc7-4071-904d-ef91c9c6f6a9", matcher: "^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$" }),
        name: somethingLike("biffo"),
        email: term({ generate: "biffo@beano.com", matcher: "^[a-zA-Z]+@[a-zA-Z]+\.[a-zA-Z]+$" }),
      })
      .withMetadata({
        "content-type": "application/json",
      })

      .verify(asynchronousBodyHandler(activatedMemberAdapter))
  )
})

