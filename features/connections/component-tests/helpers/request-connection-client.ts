import got from "got"
import logger from "../../../../test-helpers/component-test-logger"

export async function requestConnection(intiatingMemberId: string | null, invitedMemberId: string | null, idToken: string | undefined)
{
    let responseBody: any = {}
    let requestBody: any = {}
    requestBody.initiatingMemberId = intiatingMemberId

    if (invitedMemberId != undefined)
    {
      requestBody.invitedMemberId = invitedMemberId
    }

    try{
        const url = process.env.ConnectionRequestEndpoint

        logger.verbose("Request connection at url - " + url + " with body " + JSON.stringify(requestBody))

        responseBody = await got.post(url!, {
            headers: {
                Authorization: "Bearer " + idToken
            },
            json: requestBody,
            throwHttpErrors: false,
            responseType: "json"
        })
        logger.verbose("Request connection response - " + responseBody.message)
    }
    catch(error)
    {
        logger.error("Error from request connection - " + JSON.stringify(error))
        throw error
    }

    return responseBody
}

