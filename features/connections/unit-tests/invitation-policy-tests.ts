import { lambdaHandler } from "../invitation-policy"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { Networker } from "../infrastructure/networker-dao"
import {mockClient} from "aws-sdk-client-mock"
import {SESClient, SendEmailCommand} from "@aws-sdk/client-ses"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"

const dynamoMock = mockClient(DynamoDBDocumentClient)
const sesMock = mockClient(SESClient)
const eventbridgeMock = mockClient(EventBridgeClient)
let event: DynamoDBStreamEvent, context: Context


beforeEach(() => {
  jest.clearAllMocks()

  sesMock.reset()
  eventbridgeMock.reset()
  dynamoMock.reset()

  process.env.NetworkerProjection = "Networker"
  process.env.ConnectionRequestTable = "ConnectionRequest"
})

test("integration event is sent", async () => {

  process.env.EventBusName = "NetworkingEventBus"
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
  await whenConnectionRequest("1234", "5678", "9012")

  expectSentEventToContain({
    Detail: JSON.stringify({
      initiatingNetworkerId: "5678",
      invitedNetworkerId: "9012",
      invitationId: "1234"
    }),
    DetailType: "ConnectionRequested",
    EventBusName: "NetworkingEventBus",
    Source: "networking.beantins.com"
  })
})

test("email contains recipient", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})

  await whenConnectionRequest("1234", "5678", "9012")

  expectEmailContaining({
    "Destination": expect.objectContaining({
      "ToAddresses": 
        ["fflinstone@gmail.com"]
      })
    }
  )
})

test("email contains sender", async () => {

  process.env.NotificationEmailAddress = "beantins@dont-reply.com"
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})

  await whenConnectionRequest("1234", "5678", "9012")

  expectEmailContaining({"Source": "beantins@dont-reply.com"})
})

test("email contains subject", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})

  await whenConnectionRequest("1234", "5678", "9012")

  expectEmailContaining({
    "Message": expect.objectContaining({
      "Subject": expect.objectContaining({
        "Data": "Invitation to connect on BeanTins"
      })
    })
  })
})

test("email contains message", async () => {

  process.env.ResponseUrl = "https://www.beantins.com/connection/response"
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
  await whenConnectionRequest("1234", "5678", "9012")

  const sendEmailCall = sesMock.commandCalls(SendEmailCommand)[0].args[0].input
  const message = sendEmailCall["Message"]!["Body"]!["Text"]!["Data"]
  
  expect(message).toContain("Barney Rubble would like to connect on BeanTins")
  expect(message).toContain("To approve, select the following: https://www.beantins.com/connection/response?invite=1234&decision=approve")
  expect(message).toContain("To reject, select the following: https://www.beantins.com/connection/response?invite=1234&decision=reject")
})

function givenNetworker(networker: Networker)
{
  dynamoMock
    .on(GetCommand, {
      TableName: "Networker",
      Key: {
        id : networker.id,
      }
    }
    ).resolves({Item: networker})
}

async function whenConnectionRequest(invitationId: string, initatingNetworkerId: string, invitedNetworkerId: string){
  event = 
   {Records: [{
    eventName: "INSERT",
    dynamodb: {
      NewImage: {
        invitationId: {
          S: invitationId
        },
        initiatingNetworkerId: {
          S: initatingNetworkerId
        },
        invitedNetworkerId: {
          S: invitedNetworkerId
        },
      },
      OldImage: {}
    }
  }]
  }

  return await lambdaHandler(event, context)
}

function expectSentEventToContain(matchingContent: any)
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



