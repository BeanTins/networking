import { lambdaHandler } from "../confirmation-policy"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "../../../test-helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"
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
  members.queryResponse([Member.create("Barney Rubble", "brubble@hotmail.com", "5678")])
  
  await whenConnectionAdded("5678", "9012")

  expectSentIntegrationEventToContain({
    Detail: JSON.stringify({
      memberId: "5678",
      connectionMemberId: "9012"
    }),
    DetailType: "ConnectionAdded",
    EventBusName: "NetworkingEventBus",
    Source: "networking.beantins.com"
  })
})

test("email not sent if no connection request found", async () => {
  connectionRequests.queryResponse([])
  members.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionAdded("5678", "9012")

  expect(sesMock.commandCalls(SendEmailCommand).length).toBe(0)
})


test("email sent to initiating member", async () => {

  connectionRequests.queryResponse([
    {initiatingMemberId: "5678",
    invitedMemberId: "9012",
    invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4"}])
  members.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionAdded("5678", "9012")

  expectEmailContaining({
    "Destination": expect.objectContaining({
      "ToAddresses": 
        ["brubble@hotmail.com"]
      })
    }
  )
})

test("email contains sender", async () => {

  process.env.NotificationEmailAddress = "beantins@dont-reply.com"
  connectionRequests.queryResponse([
    {initiatingMemberId: "5678",
    invitedMemberId: "9012",
    invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4"}])
  members.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionAdded("5678", "9012")

  expectEmailContaining({"Source": "beantins@dont-reply.com"})
})

test("email contains subject", async () => {

  connectionRequests.queryResponse([
    {initiatingMemberId: "5678",
    invitedMemberId: "9012",
    invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4"}])
  members.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionAdded("5678", "9012")

  expectEmailContaining({
    "Message": expect.objectContaining({
      "Subject": expect.objectContaining({
        "Data": "You have a new connection on BeanTins"
      })
    })
  })
})

test("email contains message", async () => {

  connectionRequests.queryResponse([
    {initiatingMemberId: "5678",
    invitedMemberId: "9012",
    invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4"}])
  members.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionAdded("5678", "9012")

  const sendEmailCommand = sesMock.commandCalls(SendEmailCommand)[0].args[0]
  const message = sendEmailCommand!.input.Message!.Body!.Text!.Data
  expect(message).toContain("Congratulations Barney Rubble, you are now connected to Fred Flinstone.")
})

test("connection request is deleted", async () => {

  connectionRequests.queryResponse([
    {initiatingMemberId: "5678",
    invitedMemberId: "9012",
    invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4"}])
  members.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionAdded("5678", "9012")

  expect(connectionRequests.delete).toHaveBeenCalledWith({invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4"})
})

async function whenConnectionAdded(memberId: string, connectionMemberId: string){
  event = 
   {Records: [{
    eventName: "INSERT",
    dynamodb: {
      NewImage: {
        memberId: {
          S: memberId
        },
        connectionMemberId: {
          S: connectionMemberId
        },
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

function expectEmailContaining(matchingContent: any)
{
  expect(sesMock.commandCalls(SendEmailCommand)[0].args[0].input).toEqual(expect.objectContaining(matchingContent))
}



