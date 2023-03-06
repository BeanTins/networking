import { MessageProviderPact } from "@pact-foundation/pact"
import { Context, SQSEvent } from "aws-lambda"
import {mockClient} from "aws-sdk-client-mock"
import  { SQSClient, 
    SendMessageCommand, GetQueueUrlCommand  } from "@aws-sdk/client-sqs"
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb"
import { EventBridgeClient } from "@aws-sdk/client-eventbridge"
import * as path from "path"
import { ValidateRequestQuery, ValidateRequestQueryHandler } from "../validate-query"

const JockAndRabChat = "27fcefea-2c04-4d7a-a038-2522c2f5a6d9"
const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const Rab = "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba"

const eventbridgeMock = mockClient(EventBridgeClient)
   
const sqsMock = mockClient(SQSClient)
const dynamoMock = mockClient(DynamoDBDocumentClient)

beforeEach(() => {
    jest.clearAllMocks()
    sqsMock.on(GetQueueUrlCommand).resolves({QueueUrl: "http://queue.com"})
    process.env.responseQueueName = "ValidationResponse"
})

interface Connection{
  networkerId: string
  connectedToNetworkerId: string
}
  
function givenConnections(connections: Connection[])
{
  dynamoMock.on(QueryCommand).resolves({Items: connections, Count: connections.length})
}

const request = {
  correlationId: JockAndRabChat,
  initiatingNetworkerId: Jock,
  requestedConnectionNetworkerIds: new Set([Rab])
}

const validateConnection = {
    respond: async() => {
      await new ValidateRequestQueryHandler().handle(request)

      const SendMessageParameter = sqsMock.commandCalls(SendMessageCommand)[0].args[0].input

      console.log("****" + JSON.stringify(SendMessageParameter))
      return new Promise((resolve, reject) => {
        resolve(JSON.parse(SendMessageParameter.MessageBody!))
      })
    }
}

describe("validate query producer tests", () => {
  const p = new MessageProviderPact({
    messageProviders: {
      "validate connection response": () => validateConnection.respond(),
    },
    provider: "networkingservice",
    providerVersion: "1.0.0",
    pactUrls: [
      path.resolve(
        process.cwd(),
        "pacts",
        "SocialisingService-NetworkingService.json"
      ),
    ],
    stateHandlers: {
      "two connected networkers": () => {
        givenConnections([{networkerId: Jock, connectedToNetworkerId: Rab}])
        return Promise.resolve()
      }
    }
    })

  // 3 Verify the interactions
  describe("validate connections response", () => {
    it("respond to validate connections between networkers", () => {
      return p.verify()
    })
  })
})






