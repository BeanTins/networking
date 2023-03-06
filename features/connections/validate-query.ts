
import { SQSEvent, Context } from "aws-lambda"
import { ConnectionsDAO} from "./infrastructure/connections-dao"
import { ValidateConnectionsResponseClient } from "./infrastructure/validate-connections-response-client"
import logger  from "../../infrastructure/lambda-logger"

export const lambdaHandler = async (event: SQSEvent, context: Context) => { 
  try{

    const queryDTO = JSON.parse(event.Records[0].body)

    const queryHandler = new ValidateRequestQueryHandler()
  
    await queryHandler.handle(queryDTO)
  }
  catch(error)
  {
    logger.error("Failed validate query with error - " + error)
  }
}
  
export class ValidateRequestQueryHandler {

  private connectionsDAO: ConnectionsDAO
  private client: ValidateConnectionsResponseClient

  public constructor() {
    this.connectionsDAO = new ConnectionsDAO(process.env.AWS_REGION!)
    this.client = new ValidateConnectionsResponseClient({region: process.env.AWS_REGION!, queueName: process.env.responseQueueName!})
  }

  async handle(rawQuery: ValidateRequestQuery) {

    try{
      const query = new ValidateRequestQuery(rawQuery)
      const validated = await this.connectionsDAO.isInstigatorConnectedWithEveryone(query.initiatingNetworkerId, query.requestedConnectionNetworkerIds)

      await this.client.send({correlationId: query.correlationId, validated: validated})
    }
    catch(error)
    {
      logger.error("validate query failed for command: " + JSON.stringify(rawQuery) + " with error:" + error)
      throw error
    }
  }
}

export class ValidateRequestQuery {

  constructor(query: any)
  {
    if ((query.correlationId == undefined) || 
        (query.initiatingNetworkerId == undefined) ||
        (query.requestedConnectionNetworkerIds == undefined))
    {
      throw new MalformedQuery(query)
    }

    this.correlationId = query.correlationId
    this.initiatingNetworkerId = query.initiatingNetworkerId
    this.requestedConnectionNetworkerIds = new Set(query.requestedConnectionNetworkerIds)
  }
  correlationId: string
  initiatingNetworkerId: string
  requestedConnectionNetworkerIds: Set<string>
}

class MalformedQuery extends Error
{
  constructor(query: any)
  {
    super("query: " + query)
  }

}


  
  
