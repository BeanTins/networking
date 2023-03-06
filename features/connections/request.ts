
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import { OpenAPISpecBuilder, HttpMethod} from "../../infrastructure/open-api-spec"
import { NetworkerDAO } from "./infrastructure/networker-dao"
import { RequestDAO, ConnectionRequest } from "./infrastructure/request-dao"
import { HttpResponse } from "../../infrastructure/http-response"
import logger  from "../../infrastructure/lambda-logger"
import { EventDispatcher } from "../../infrastructure/event-dispatcher"
import { UnspecifiedConnectionRequest} from "./infrastructure/events"

export class SpecBuilderFactory
{
  static create()
  {
    const specBuilder = new OpenAPISpecBuilder("3.0.0")

    specBuilder.describedAs("connection request", "request to connect with another netwoker on the BeanTins service", "1.9.0")
  
    const endpoint = specBuilder.withEndpoint("/connection/request", HttpMethod.Post)
    endpoint.withRequestBodyStringProperty({name: "initiatingNetworkerId", required: true})
    endpoint.withRequestBodyStringProperty({name: "invitedNetworkerId", required: true})
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

  private networkerDAO: NetworkerDAO
  private connectionRequestDAO: RequestDAO
  private dispatcher: EventDispatcher

  public constructor() {
    this.networkerDAO = new NetworkerDAO(process.env.AWS_REGION!)
    this.connectionRequestDAO = new RequestDAO(process.env.AWS_REGION!)
    this.dispatcher = new EventDispatcher(process.env.AWS_REGION!)
  }

  async handle(command: RequestCommand) {
    if(await this.networkerDAO.exists(command.initiatingNetworkerId))
    {
      await this.connectionRequestDAO.add(command.initiatingNetworkerId, command.invitedNetworkerId)
    }
    else
    {
      const event = new UnspecifiedConnectionRequest(command.initiatingNetworkerId, command.invitedNetworkerId)

      await this.dispatcher.dispatch(event)     
    }
  }
}

export class RequestCommand {
  initiatingNetworkerId: string
  invitedNetworkerId: string
}

  
  
