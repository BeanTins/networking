import { lambdaHandler } from "../activated-member-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "../../../test-helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"
import { ConnectionRequest} from "../infrastructure/connection-request-dao"

let event: EventBridgeEvent<any, any>
let context: Context
let members: DataMapperMock
let connections: DataMapperMock

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

beforeEach(() => {
    jest.clearAllMocks()

    let dataMapperFactory = new DataMapperFactoryMock()

    members = dataMapperFactory.create(Member.name)
    
    DataMapperFactory.create = dataMapperFactory.map()
})

test("event stored", async () => {

  whenActivatedMember("09040739-830c-49d3-b8a5-1e6c9270fdb2", "bing jacob", "bing.jacob@hotmail.com")
  
  const result:APIGatewayProxyResult  = await lambdaHandler(event, context)

  expect(members.put).toBeCalledWith({"id": "09040739-830c-49d3-b8a5-1e6c9270fdb2", "name": "bing jacob", "email": "bing.jacob@hotmail.com"}
  )
})

function whenActivatedMember(id: string|null, name: string|null, email: string|null){
  event = {
    detail: 
    {  
      id: id,    
      name: name,
      email: email
    }
  } as EventBridgeEvent<any, any>

}
  
