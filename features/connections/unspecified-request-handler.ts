import { Context, EventBridgeEvent } from "aws-lambda"
import {MemberDAO} from "./infrastructure/member-dao"
import { ConnectionRequestDAO, ConnectionRequest } from "./infrastructure/connection-request-dao"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {
  
  const memberDAO = new MemberDAO()
  const initiatingMemberId = event.detail["initiatingMemberId"]
  const invitedMemberId = event.detail["invitedMemberId"]

  if(await memberDAO.exists(initiatingMemberId))
  {
    const connectionRequestDAO = new ConnectionRequestDAO()
    const connectionRequest = ConnectionRequest.create(initiatingMemberId, invitedMemberId)
    await connectionRequestDAO.add(connectionRequest)
  }
  else{
    throw Error("Unknown member initating connection request")
  }
}

