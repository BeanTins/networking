
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import { OpenAPISpecBuilder, HttpMethod} from "../../infrastructure/open-api-spec"
import { RequestDAO } from "./infrastructure/request-dao"
import { ConnectionsDAO } from "./infrastructure/connections-dao"
import { HttpResponse } from "../../infrastructure/http-response"
import logger  from "../../infrastructure/lambda-logger"

export class SpecBuilderFactory
{
  static create()
  {
    const specBuilder = new OpenAPISpecBuilder("3.0.0")

    specBuilder.describedAs("connection response", "networker response to a connection invitation on the BeanTins service", "1.9.0")
  
    const endpoint = specBuilder.withEndpoint("/connection/request/{invitationId}/decision/{decision}", HttpMethod.Post)
  
    endpoint.withStringPathParameter({name: "invitationId", description: "the ID of a connection invitation from one networker to another"})
    endpoint.withStringPathParameter({name: "decision", description: "the decision that the invited networker has made on the connection request", enum: ["approve,reject"]})
    endpoint.withResponse("201", "connection created")
    endpoint.withResponse("400", "connection response failed")
  
    return specBuilder
  }
}

export const lambdaHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => { 
    var controller: ResponseController = new ResponseController()
  
    return await controller.request(event.pathParameters)
  }
  
export class ResponseController {

async request(responseDTO: any) {
    var response: any

    try {
      logger.verbose("incoming response - " + JSON.stringify(responseDTO))
      
      const command = responseDTO

      const commandHandler = new ResponseCommandHandler()

      const decision = await commandHandler.handle(command)

      if (decision == "approve")
      {
        response = HttpResponse.created("connection created")
      }
      else
      {
        response = HttpResponse.ok("connection rejected")  
      }
    }
    catch (error) {

      const statusCodeMap = new Map<any, number>([
        [UnknownDecision, 400]
      ])

      response = HttpResponse.error(error, statusCodeMap)
    }

    return response
}
}

export class ResponseCommandHandler {

  private connectionRequestDAO: RequestDAO
  private connectionDAO: ConnectionsDAO

  public constructor() {
    this.connectionRequestDAO = new RequestDAO(process.env.AWS_REGION!)
    this.connectionDAO = new ConnectionsDAO(process.env.AWS_REGION!)
  }

  async handle(command: ResponseCommand): Promise<"approve" | "reject"> {
    try{
      const connectionRequest = await this.connectionRequestDAO.get(command.invitationId)
      if(connectionRequest != undefined)
      {
        if (command.decision == "approve")
        {
          await this.connectionDAO.add(connectionRequest.initiatingNetworkerId, connectionRequest.invitedNetworkerId) 
        }
        else if (command.decision == "reject")
        {
          await this.connectionRequestDAO.remove(command.invitationId)
        }
        else
        {
          throw new UnknownDecision(command.invitationId, command.decision)
        }
      }
    }
    catch(error)
    {
      logger.error("Command response failed - " + error)
      throw error
    }
    return command.decision
  }

}

export class ResponseCommand {
  invitationId: string
  decision: "approve"|"reject"
}

 class UnknownDecision extends Error{
   constructor(invitationId: string, decision: string)
   {
     super("response for invitation " + invitationId + " failed due to unknown decision: " + decision)
   }
 }
  
