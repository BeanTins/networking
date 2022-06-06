import { lambdaHandler } from "../start"
import { APIGatewayEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "../../../test-helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb"
import { ConversationSnapshot } from "../infrastructure/conversation-snapshot"

const loggerVerboseMock = jest.fn()
const loggerErrorMock = jest.fn()
jest.mock("../../../infrastructure/lambda-logger", () => ({ verbose: (message: string) => loggerVerboseMock(message), 
  error: (message: string) => loggerErrorMock(message) }))

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

const dynamoMock = mockClient(DynamoDBDocumentClient)

let event: APIGatewayEvent, context: Context
let conversations: DataMapperMock

beforeEach(() => {
    jest.clearAllMocks()

    let dataMapperFactory = new DataMapperFactoryMock()

    conversations = dataMapperFactory.create(ConversationSnapshot.name)
    
    DataMapperFactory.create = dataMapperFactory.map()
})

test("successful conversation start response", async () => {

  dynamoMock.on(QueryCommand).resolves({Items: [{memberId: "1234", connectedToMemberId: "5678"}], Count: 1})

  const result:APIGatewayProxyResult  = await whenConversationStart("1234", ["5678"])
  
  expect(result.statusCode).toBe(201)
  expect(result.body).toBe(JSON.stringify({message:"conversation created"}))
})

test("successful conversation start stores conversation", async () => {

  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")

  dynamoMock.on(QueryCommand).resolves({Items: [{memberId: "1234", connectedToMemberId: "5678"}], Count: 1})

  const result:APIGatewayProxyResult  = await whenConversationStart("1234", ["5678"], ["1234"], "surrey coding kata")
  
  expect(conversations.put).toBeCalledWith({adminIds: new Set(["1234"]), id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", name: "surrey coding kata", participantIds: new Set(["5678", "1234"])})
})

test("conversation start fails as instigator does not know everyone", async () => {

  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")

  dynamoMock.on(QueryCommand).resolves({Items: [{memberId: "1234", connectedToMemberId: "5678"}], Count: 1})

  const result:APIGatewayProxyResult  = await whenConversationStart("1234", ["5678", "9012"], ["1234"], "surrey coding kata")
  
  expect(result.statusCode).toBe(400)
  expect(result.body).toBe(JSON.stringify({message: "unknown connections"}))
  expect(loggerErrorMock).toBeCalledWith("conversation start failed for command: {\"initiatingMemberId\":\"1234\",\"invitedMemberIds\":{},\"name\":\"surrey coding kata\",\"adminIds\":{}} with error:Error: member 1234 not connected with all: [\"5678\",\"9012\"]")
  expect(conversations.put).toBeCalledTimes(0)
})

test("conversation start fails as admins not subset of participants", async () => {

  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")

  dynamoMock.on(QueryCommand).resolves({Items: [{memberId: "1234", connectedToMemberId: "5678"}, {memberId: "1234", connectedToMemberId: "9012"}], Count: 2})

  const result:APIGatewayProxyResult  = await whenConversationStart("1234", ["5678", "9012"], ["1234", "6789"], "surrey coding kata")

  expect(result.statusCode).toBe(400)
  expect(result.body).toBe(JSON.stringify({message: "admins not in conversation"}))
  expect(loggerErrorMock).toBeCalledWith("conversation start failed for command: {\"initiatingMemberId\":\"1234\",\"invitedMemberIds\":{},\"name\":\"surrey coding kata\",\"adminIds\":{}} with error:Error: Admin Ids: [6789] not in the conversation")
  expect(conversations.put).toBeCalledTimes(0)
})

async function whenConversationStart(
  initiatingMemberId: string, 
  invitedMemberIds: string[],
  adminIds: string[] = [],
  name: string | null = null){
  event = {
    body: JSON.stringify(
    {  
      initiatingMemberId: initiatingMemberId,    
      invitedMemberIds: invitedMemberIds,
      adminIds: adminIds,
      name: name
    })
  } as APIGatewayEvent

  return await lambdaHandler(event, context)
}
  
