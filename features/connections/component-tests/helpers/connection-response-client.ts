import got from "got"
import logger from "./component-test-logger"

export async function connectionResponse(invitationId: string | null, decision: string, idToken: string | undefined)
{
    let responseBody: any = {}

    try{
        const urlbase = process.env.ConnectionResponseEndpoint
        const url = buildUrl(urlbase!, invitationId!, decision)

        logger.verbose("Response connection at url - " + url)

        responseBody = await got.post(url!, {
            headers: {
                Authorization: "Bearer " + idToken
            },
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
    return urlBase.replace("{invitationId}", invitationId).replace("{decision}", decision)
}
