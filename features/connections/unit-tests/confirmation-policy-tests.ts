import { lambdaHandler } from "../confirmation-policy"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { Networker } from "../infrastructure/networker-dao"
import {ConnectionRequest} from "../infrastructure/request-dao"
import {mockClient} from "aws-sdk-client-mock"
import {SESClient, SendEmailCommand} from "@aws-sdk/client-ses"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import {DynamoDBDocumentClient, GetCommand, QueryCommand, DeleteCommand} from "@aws-sdk/lib-dynamodb"

const dynamoMock = mockClient(DynamoDBDocumentClient)
const sesMock = mockClient(SESClient)
const eventbridgeMock = mockClient(EventBridgeClient)

let event: DynamoDBStreamEvent, context: Context

beforeEach(() => {
  jest.clearAllMocks()
  eventbridgeMock.reset()
  sesMock.reset()
  dynamoMock.reset()

  process.env.NetworkerProjection = "Networker"
  process.env.ConnectionRequestTable = "ConnectionRequest"
})

test("integration event is sent", async () => {

  process.env.EventBusName = "NetworkingEventBus"
  givenConnectionRequest({invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
  await whenConnectionAdded("5678", "9012")

  expectSentIntegrationEventToContain({
    Detail: JSON.stringify({
      networkerId: "5678",
      connectionNetworkerId: "9012"
    }),
    DetailType: "ConnectionAdded",
    EventBusName: "NetworkingEventBus",
    Source: "networking.beantins.com"
  })
})

test("email not sent if no connection request found", async () => {
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})

  await whenConnectionAdded("5678", "9012")

  expect(sesMock.commandCalls(SendEmailCommand).length).toBe(0)
})


test("email sent to initiating networker", async () => {

  givenConnectionRequest({invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
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
  givenConnectionRequest({invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
  await whenConnectionAdded("5678", "9012")

  expectEmailContaining({"Source": "beantins@dont-reply.com"})
})

test("email contains subject", async () => {

  givenConnectionRequest({invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
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

  givenConnectionRequest({invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
  await whenConnectionAdded("5678", "9012")

  const sendEmailCommand = sesMock.commandCalls(SendEmailCommand)[0].args[0]
  const message = sendEmailCommand!.input.Message!.Body!.Text!.Data
  expect(message).toContain("Congratulations Barney Rubble, you are now connected to Fred Flinstone.")
})

test("connection request is deleted", async () => {

  givenConnectionRequest({invitationId: "19fad027-c7b2-5c6b-9324-8ad086f04ff4", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
  await whenConnectionAdded("5678", "9012")

  thenConnectionRequestDeleted("19fad027-c7b2-5c6b-9324-8ad086f04ff4")
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

function givenConnectionRequest(request: ConnectionRequest)
{
  dynamoMock
    .on(QueryCommand).resolves({Items: [request]})

  // dynamoMock
  //   .on(GetCommand, {
  //     TableName: "ConnectionRequest",
  //     Key: {
  //       invitationId : request.invitationId,
  //     }
  //   }
  //   ).resolves({Item: request})
}

async function whenConnectionAdded(networkerId: string, connectionNetworkerId: string){
  event = 
   {Records: [{
    eventName: "INSERT",
    dynamodb: {
      NewImage: {
        networkerId: {
          S: networkerId
        },
        connectionNetworkerId: {
          S: connectionNetworkerId
        },
      },
      OldImage: {}
    }
  }]
  }

  return await lambdaHandler(event, context)
}

function thenConnectionRequestDeleted(invitationId: string)
{
  expect(dynamoMock.commandCalls(DeleteCommand).length).toBe(1)
  expect(dynamoMock.commandCalls(DeleteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Key: {invitationId: invitationId},
      TableName: "ConnectionRequest"
    })
  )

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



