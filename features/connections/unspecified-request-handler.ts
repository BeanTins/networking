import { Context, EventBridgeEvent } from "aws-lambda"
import {NetworkerDAO} from "./infrastructure/networker-dao"
import { RequestDAO, ConnectionRequest } from "./infrastructure/request-dao"
import { UnspecifiedConnectionRequest} from "./infrastructure/events"
import logger from "../../infrastructure/lambda-logger"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {

  try{
    const handler = new NotificationHandler()

    await handler.handle(new UnspecifiedConnectionRequest(event.detail.initiatingNetworkerId, event.detail.invitedNetworkerId))
  }
  catch(error)
  {
    logger.error("unspecified connection request failed for : " + JSON.stringify(event) + " with error:" + error)
    throw error
  }
}

class NotificationHandler
{
  private networkerDAO: NetworkerDAO
  constructor()
  {
    this.networkerDAO = new NetworkerDAO(process.env.AWS_REGION!)
  }

  async handle(event: UnspecifiedConnectionRequest)
  {
    if(await this.networkerDAO.exists(event.initiatingNetworkerId))
    {
      const connectionRequestDAO = new RequestDAO(process.env.AWS_REGION!)
      await connectionRequestDAO.add(event.initiatingNetworkerId, event.invitedNetworkerId)
    }
    else{
      throw Error("Unknown networker initating connection request")
    }
  }
}

