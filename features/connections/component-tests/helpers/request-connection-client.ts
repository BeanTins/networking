import got from "got"
import logger from "../../../../test-helpers/component-test-logger"

interface ConnectionRequestParameters{
    endpoint: string
    intiatingMemberId: string | null
    invitedMemberId: string | null
    idToken: string | undefined}

export async function requestConnection(parameters: ConnectionRequestParameters)
{
    let responseBody: any = {}
    let requestBody: any = {}
    requestBody.initiatingMemberId = parameters.intiatingMemberId

    if (parameters.invitedMemberId != undefined)
    {
      requestBody.invitedMemberId = parameters.invitedMemberId
    }

    try{
        const url = parameters.endpoint

        logger.verbose("Request connection at url - " + url + " with body " + JSON.stringify(requestBody))

        responseBody = await got.post(url!, {
            headers: {
                Authorization: "Bearer " + parameters.idToken
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

