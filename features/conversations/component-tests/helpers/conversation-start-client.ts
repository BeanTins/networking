import got from "got"
import logger from "../../../../test-helpers/component-test-logger"

export async function startConversation(
    initiatingMemberId: string, 
    invitedMemberIds: string[]|null, 
    adminMemberIds: string[],
    name: string, 
    idToken: string | undefined)
{
    let responseBody: any = {}
    let requestBody: any = {}
    
    requestBody.initiatingMemberId = initiatingMemberId

    if (invitedMemberIds != undefined)
    {
      requestBody.invitedMemberIds = invitedMemberIds
    }

    if (adminMemberIds != undefined)
    {
      requestBody.adminMemberIds = adminMemberIds
    }

    if (name != undefined)
    {
      requestBody.name = name
    }

    try{
        const url = process.env.ConversationStartEndpoint

        logger.verbose("Conversation start url - " + url + " with body " + JSON.stringify(requestBody))

        responseBody = await got.post(url!, {
            headers: {
                Authorization: "Bearer " + idToken
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

