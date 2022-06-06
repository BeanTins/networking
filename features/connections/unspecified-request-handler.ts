import { Context, EventBridgeEvent } from "aws-lambda"
import {MemberDAO} from "./infrastructure/member-dao"
import { ConnectionRequestDAO, ConnectionRequest } from "./infrastructure/connection-request-dao"
import { UnspecifiedConnectionRequest} from "./infrastructure/events"
import logger from "../../infrastructure/lambda-logger"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {

  try{
    const handler = new NotificationHandler()

    await handler.handle(new UnspecifiedConnectionRequest(event.detail.initiatingMemberId, event.detail.invitedMemberId))
  }
  catch(error)
  {
    logger.error("unspecified connection request failed for : " + JSON.stringify(event) + " with error:" + error)
    throw error
  }
}

class NotificationHandler
{
  private memberDAO: MemberDAO
  constructor()
  {
    this.memberDAO = new MemberDAO()
  }

  async handle(event: UnspecifiedConnectionRequest)
  {
    if(await this.memberDAO.exists(event.initiatingMemberId))
    {
      const connectionRequestDAO = new ConnectionRequestDAO()
      const connectionRequest = ConnectionRequest.create(event.initiatingMemberId, event.invitedMemberId)
      await connectionRequestDAO.add(connectionRequest)
    }
    else{
      throw Error("Unknown member initating connection request")
    }
  }
}

