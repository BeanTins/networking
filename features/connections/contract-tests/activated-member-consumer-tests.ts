import * as path from "path"
import { MessageConsumerPact, asynchronousBodyHandler, Matchers } from "@pact-foundation/pact"
import { ActivatedMemberHandler } from "../activated-member-handler"
const {like, term, somethingLike} = Matchers

const activatedMemberAdapter = async function (activatedMemberEvent: any) {
  await new ActivatedMemberHandler().handle(activatedMemberEvent)
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

      .verify(asynchronousBodyHandler(activatedMemberAdapter))
  )
})

