
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import { OpenAPISpecBuilder, HttpMethod} from "../../infrastructure/open-api-spec"
import { MemberDAO } from "./infrastructure/member-dao"
import { ConnectionRequestDAO, ConnectionRequest } from "./infrastructure/connection-request-dao"
import { HttpResponse } from "../../infrastructure/http-response"
import logger  from "../../infrastructure/lambda-logger"
import { EventDispatcher } from "../../infrastructure/event-dispatcher"
import { UnspecifiedConnectionRequest} from "./infrastructure/events"

export class SpecBuilderFactory
{
  static create()
  {
    const specBuilder = new OpenAPISpecBuilder("3.0.0")

    specBuilder.describedAs("connection request", "member request to connect with another member on the BeanTins service", "1.9.0")
  
    const endpoint = specBuilder.withEndpoint("/connection/request", HttpMethod.Post)
    endpoint.withRequestBodyStringProperty({name: "initiatingMemberId", required: true})
    endpoint.withRequestBodyStringProperty({name: "invitedMemberId", required: true})
    endpoint.withResponse("201", "connection requested")
    endpoint.withResponse("400", "connection request failed")
  
    return specBuilder
  }
}

export const lambdaHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => { 
    var controller: RequestController = new RequestController()
  
    return await controller.request(event.body)
  }
  
export class RequestController {

async request(requestDTO: any) {
    var response: any

    try {
      logger.verbose("incoming request - " + JSON.stringify(requestDTO))
      
      const command = JSON.parse(requestDTO)

      const commandHandler = new RequestCommandHandler()

      await commandHandler.handle(command)

      response = HttpResponse.created("connection request")
    }
    catch (error) {

      const statusCodeMap = new Map<any, number>([
      ])

      logger.error(error)

      response = HttpResponse.error(error, statusCodeMap)
    }

    return response
}
}

export class RequestCommandHandler {

  private memberDAO: MemberDAO
  private connectionRequestDAO: ConnectionRequestDAO
  private dispatcher: EventDispatcher

  public constructor() {
    this.memberDAO = new MemberDAO()
    this.connectionRequestDAO = new ConnectionRequestDAO()
    this.dispatcher = new EventDispatcher(process.env.AWS_REGION!)
  }

  async handle(command: RequestCommand) {
    if(await this.memberDAO.exists(command.initiatingMemberId))
    {
      const connectionRequest = ConnectionRequest.create(command.initiatingMemberId, command.invitedMemberId)
      await this.connectionRequestDAO.add(connectionRequest) 
    }
    else
    {
      const event = new UnspecifiedConnectionRequest(command.initiatingMemberId, command.invitedMemberId)

      await this.dispatcher.dispatch(event)     
    }
  }
}

export class RequestCommand {
  initiatingMemberId: string
  invitedMemberId: string
}

  
  
