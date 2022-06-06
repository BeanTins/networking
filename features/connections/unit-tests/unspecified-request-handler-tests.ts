import { lambdaHandler } from "../unspecified-request-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "../../../test-helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"
import { ConnectionRequest} from "../infrastructure/connection-request-dao"

let event: EventBridgeEvent<any, any>, context: Context
let members: DataMapperMock
let connections: DataMapperMock

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

beforeEach(() => {
    jest.clearAllMocks()

    let dataMapperFactory = new DataMapperFactoryMock()

    members = dataMapperFactory.create(Member.name)
    connections = dataMapperFactory.create(ConnectionRequest.name)
    
    DataMapperFactory.create = dataMapperFactory.map()
})

test("still unspecified", async () => {

    members.queryResponse([])
    unspecifiedRequest("1234", "5678")
    
    await expect(async() => {
        const result:APIGatewayProxyResult  = await lambdaHandler(event, context)
      })
    .rejects
    .toThrow('Unknown member initating connection request');

})

test("now specified", async () => {

  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")
  members.querySequenceResponses([[Member.create("Barney Rubble", "brubble@hotmail.com", "5678")],
                                  [Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")]])
  
  unspecifiedRequest("5678", "9012")
  
  const result:APIGatewayProxyResult  = await lambdaHandler(event, context)

  expect(connections.put).toBeCalledWith({"initiatingMemberId": "5678", "invitationId": "09040739-830c-49d3-b8a5-1e6c9270fdb2", "invitedMemberId": "9012"}
  )
})

function unspecifiedRequest(initiatingMemberId: string|null, invitedMemberId: string|null){
  
  event = {
    detail: 
    {  
      initiatingMemberId: initiatingMemberId,    
      invitedMemberId: invitedMemberId
    }
  } as EventBridgeEvent<any, any>
}
  
