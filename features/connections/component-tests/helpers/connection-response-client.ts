import got from "got"
import logger from "../../../../test-helpers/component-test-logger"

interface ConnectionResponseParameters{
  endpoint: string
  invitationId: string
  decision: string
  idToken: string | undefined
}
export async function connectionResponse(parameters: ConnectionResponseParameters)
{
    let responseBody: any = {}

    try{
        const urlbase = parameters.endpoint
        const url = buildUrl(urlbase!, parameters.invitationId!, parameters.decision)

        logger.verbose("Response connection at url - " + url)

        let headers = {}
        if (parameters.idToken != undefined)
        {
            headers = {Authorization: "Bearer " + parameters.idToken}
        }
        
        responseBody = await got.post(url!, {
            headers: headers,
            throwHttpErrors: false,
            responseType: "json"
        })
        logger.verbose("Connection response - " + responseBody.message)
    }
    catch(error)
    {
        logger.error("Error from connection response" + JSON.stringify(error))
        throw error
    }

    return responseBody
}

function buildUrl(urlBase: string, invitationId: string, decision: string)
{
    logger.verbose(urlBase)
    return urlBase.replace("{invitationId}", invitationId).replace("{decision}", decision)
}
