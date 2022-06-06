import { lambdaHandler } from "../request"
import { APIGatewayEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "../../../test-helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"
import { ConnectionRequest} from "../infrastructure/connection-request-dao"

let event: APIGatewayEvent, context: Context
let members: DataMapperMock
let connections: DataMapperMock

beforeEach(() => {
    jest.clearAllMocks()

    let dataMapperFactory = new DataMapperFactoryMock()

    members = dataMapperFactory.create(Member.name)
    connections = dataMapperFactory.create(ConnectionRequest.name)
    
    DataMapperFactory.create = dataMapperFactory.map()
})

test("signup successful for new user", async () => {

    members.queryResponse([{name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"}])
    
    const result:APIGatewayProxyResult  = await whenRequestConnection("1234", "5678")
  
    expect(result.statusCode).toBe(201)
})

async function whenRequestConnection(initiatingMemberId: string|null, invitedMemberId: string|null){
  event = {
    body: JSON.stringify(
    {  
      initiatingMemberId: initiatingMemberId,    
      invitedMemberId: invitedMemberId
    })
  } as APIGatewayEvent

  return await lambdaHandler(event, context)
}
  
