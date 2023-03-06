import { lambdaHandler } from "../response"
import { APIGatewayEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { ConnectionRequest} from "../infrastructure/request-dao"
import { LambdaEventBuilder } from "./helpers/lambda-event-builder"
import {mockClient} from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand, DeleteCommand, TransactWriteCommand} from "@aws-sdk/lib-dynamodb"
import {Networker} from "../infrastructure/networker-dao"

const loggerVerboseMock = jest.fn()
const loggerErrorMock = jest.fn()
jest.mock("../../../infrastructure/lambda-logger", () => ({ verbose: (message: string) => loggerVerboseMock(message), 
  error: (message: string) => loggerErrorMock(message) }))

const dynamoMock = mockClient(DynamoDBDocumentClient)
let event: APIGatewayEvent, context: Context

beforeEach(() => {
    jest.clearAllMocks()

    dynamoMock.reset()
    process.env.ConnectionsTable = "ConnectionsTable"
    process.env.NetworkerProjection = "Networker"
    process.env.ConnectionRequestTable = "ConnectionRequest"
})

test("approved connection response", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  givenConnectionRequest({invitationId: "1234", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  
  const result:APIGatewayProxyResult = await whenConnectionResponse("1234", "approve")

  expect(result.statusCode).toBe(201)
})

test("rejected connection response", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  givenConnectionRequest({invitationId: "1234", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})

  const result:APIGatewayProxyResult = await whenConnectionResponse("1234", "reject")

  expect(result.statusCode).toBe(200)
})

test("connection response fails if decision type is unknown", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  givenConnectionRequest({invitationId: "1234", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  
  const result:APIGatewayProxyResult = await whenConnectionResponse("1234", "maybe")

  expect(result.statusCode).toBe(400)
  expect(result.body).toEqual(JSON.stringify({message: "unknown decision"}))
  expect(loggerErrorMock).toBeCalledWith("Command response failed - Error: response for invitation 1234 failed due to unknown decision: maybe")
})

test("rejected connection removes request", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  givenConnectionRequest({invitationId: "1234", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  
  const result:APIGatewayProxyResult = await whenConnectionResponse("1234", "reject")

  thenConnectionRequestDeleted("1234")
})

test("after approved connection both members have each other as connection", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  givenConnectionRequest({invitationId: "1234", initiatingNetworkerId: "5678", invitedNetworkerId: "9012"})
  
  await whenConnectionResponse("1234", "approve")

  thenConnectionsInterconnected("5678", "9012")
})

async function whenConnectionResponse(invitationId: string|null, decision: string){

  event = new LambdaEventBuilder().withPathParameters({invitationId: invitationId, decision: decision}).build()

  return await lambdaHandler(event, context)
}

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
    .on(GetCommand, {
      TableName: "ConnectionRequest",
      Key: {
        invitationId : request.invitationId,
      }
    }
    ).resolves({Item: request})
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

function thenConnectionsInterconnected(firstNetworkerId: string, secondNetworkerId: string)
{
  expect(dynamoMock.commandCalls(TransactWriteCommand).length).toBe(1)
  expect(dynamoMock.commandCalls(TransactWriteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      TransactItems:expect.arrayContaining([
        expect.objectContaining({
          Put: expect.objectContaining({
            TableName: "ConnectionsTable",
            Item: expect.objectContaining({networkerId: firstNetworkerId, connectionNetworkerId: secondNetworkerId})
          })
        }),
        expect.objectContaining({
          Put: expect.objectContaining({
            TableName: "ConnectionsTable",
            Item: expect.objectContaining({networkerId: secondNetworkerId, connectionNetworkerId: firstNetworkerId})
          })
        })        
      ])
    })
  )

}



  
