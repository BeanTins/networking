import { lambdaHandler } from "../response"
import { APIGatewayEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "./helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"
import { ConnectionRequest} from "../infrastructure/connection-request-dao"
import { LambdaEventBuilder } from "./helpers/lambda-event-builder"
import {mockClient} from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, TransactWriteCommand} from "@aws-sdk/lib-dynamodb"

const dynamoMock = mockClient(DynamoDBDocumentClient);
let event: APIGatewayEvent, context: Context
let members: DataMapperMock
let connectionRequests: DataMapperMock

beforeEach(() => {
    jest.clearAllMocks()

    let dataMapperFactory = new DataMapperFactoryMock()

    members = dataMapperFactory.create(Member.name)
    connectionRequests = dataMapperFactory.create(ConnectionRequest.name)
    
    DataMapperFactory.create = dataMapperFactory.map()

    process.env.ConnectionsTable = "ConnectionsTable"
})

test("approved connection response", async () => {

    members.querySequenceResponses([[Member.create("Barney Rubble", "brubble@hotmail.com", "5678")],
                                    [Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")]])

    connectionRequests.get.mockReturnValue({invitationId: "1234", initiatingMemberId: "5678", invitedMemberId: "9012"})
    
    const result:APIGatewayProxyResult = await whenConnectionResponse("1234", "approve")

    expect(result.statusCode).toBe(201)
})

test("rejected connection response", async () => {

  members.queryUsingSet([Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
                         Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")], "id")

  connectionRequests.get.mockReturnValue({invitationId: "1234", initiatingMemberId: "5678", invitedMemberId: "9012"})
  
  const result:APIGatewayProxyResult = await whenConnectionResponse("1234", "reject")

  expect(result.statusCode).toBe(200)
})

test("rejected connection removes request", async () => {

  members.queryUsingSet([Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
                         Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")], "id")

  connectionRequests.get.mockReturnValue({invitationId: "1234", initiatingMemberId: "5678", invitedMemberId: "9012"})
  
  const result:APIGatewayProxyResult = await whenConnectionResponse("1234", "reject")

  expect(connectionRequests.delete).toBeCalledWith({invitationId: "1234"})
})

test("after approved connection both members have each other as connection", async () => {

  members.querySequenceResponses([[Member.create("Barney Rubble", "brubble@hotmail.com", "5678")],
                                  [Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")]])

  connectionRequests.get.mockReturnValue({invitationId: "1234", initiatingMemberId: "5678", invitedMemberId: "9012"})
  
  await whenConnectionResponse("1234", "approve")

  expect(dynamoMock.commandCalls(TransactWriteCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      TransactItems:expect.arrayContaining([
        expect.objectContaining({
          Put: expect.objectContaining({
            Item: expect.objectContaining({memberId: "5678", connectionMemberId: "9012"})
          })
        }),
        expect.objectContaining({
          Put: expect.objectContaining({
            Item: expect.objectContaining({memberId: "9012", connectionMemberId: "5678"})
          })
        })        
      ])
    })
  )
})

async function whenConnectionResponse(invitationId: string|null, decision: "approve"|"reject"){

  event = new LambdaEventBuilder().withPathParameters({invitationId: invitationId, decision: decision}).build()

  return await lambdaHandler(event, context)
}
  
