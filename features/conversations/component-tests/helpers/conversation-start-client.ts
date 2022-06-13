import got from "got"
import logger from "../../../../test-helpers/component-test-logger"

interface ConversationsParameters{
  endpoint: string
  initiatingMemberId: string, 
  invitedMemberIds: string[]|null, 
  adminMemberIds?: string[],
  name?: string, 
  idToken: string | undefined
}
export async function startConversation(parameters: ConversationsParameters)
{
    let responseBody: any = {}
    let requestBody: any = {}
    
    requestBody.initiatingMemberId = parameters.initiatingMemberId

    if (parameters.invitedMemberIds != undefined)
    {
      requestBody.invitedMemberIds = parameters.invitedMemberIds
    }

    if (parameters.adminMemberIds != undefined)
    {
      requestBody.adminMemberIds = parameters.adminMemberIds
    }

    if (parameters.name != undefined)
    {
      requestBody.name = parameters.name
    }

    try{
        const url = parameters.endpoint

        logger.verbose("Conversation start url - " + url + " with body " + JSON.stringify(requestBody))

        responseBody = await got.post(url!, {
            headers: {
                Authorization: "Bearer " + parameters.idToken
            },
            json: requestBody,
            throwHttpErrors: false,
            responseType: "json"
        })
        logger.verbose("Conversation start - " + responseBody.message)
    }
    catch(error)
    {
        logger.error("Error from conversation start - " + JSON.stringify(error))
        throw error
    }

    return responseBody
}

