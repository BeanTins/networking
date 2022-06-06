import { lambdaHandler } from "../started-publisher"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "../../../test-helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import {mockClient} from "aws-sdk-client-mock"
import {SESClient, SendEmailCommand} from "@aws-sdk/client-ses"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"

const sesMock = mockClient(SESClient)
const eventbridgeMock = mockClient(EventBridgeClient)

let event: DynamoDBStreamEvent, context: Context
let members: DataMapperMock
let connectionRequests: DataMapperMock

beforeEach(() => {
  jest.clearAllMocks()
  eventbridgeMock.reset()
  sesMock.reset()

  let dataMapperFactory = new DataMapperFactoryMock()
  members = dataMapperFactory.create("Member")
  connectionRequests = dataMapperFactory.create("ConnectionRequest")
  DataMapperFactory.create = dataMapperFactory.map()
})

test("integration event is sent", async () => {

  process.env.EventBusName = "NetworkingEventBus"
  connectionRequests.queryResponse([
    {initiatingMemberId: "5678",
    invitedMemberId: "9012",
    invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4"}])
  
  await whenConversationStarted("19fad027-c7b2-5c6b-9324-8ad086f04ff4", 
  new Set(["19fad027-c7b2-5c6b-9324-8ad086f04ff4"]), 
  "Tuesday five-a-sides", 
  new Set(["19fad027-c7b2-5c6b-9324-8ad086f04ff4"]))

  expectSentIntegrationEventToContain({
    Detail: JSON.stringify({
      id: "19fad027-c7b2-5c6b-9324-8ad086f04ff4",
      participantIds: ["19fad027-c7b2-5c6b-9324-8ad086f04ff4"],
      adminIds: ["19fad027-c7b2-5c6b-9324-8ad086f04ff4"],
      name: "Tuesday five-a-sides"
    }),
    DetailType: "ConversationStarted",
    EventBusName: "NetworkingEventBus",
    Source: "networking.beantins.com"
  })
})

async function whenConversationStarted(id: string, participantIds: Set<string>, name: string, adminIds: Set<string>){
  event = 
   {Records: [{
    eventName: "INSERT",
    dynamodb: {
      NewImage: {
        id: {
          S: id
        },
        participantIds: {
          SS: Array.from(participantIds)
        },
        name: {
          S: name
        },
        adminIds: {
          SS: Array.from(adminIds)
        }
      },
      OldImage: {}
    }
  }]
  }

  return await lambdaHandler(event, context)
}

function expectSentIntegrationEventToContain(matchingContent: any)
{
  expect(eventbridgeMock.commandCalls(PutEventsCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Entries:expect.arrayContaining([
        expect.objectContaining(matchingContent)
      ])
    })
  )
}



