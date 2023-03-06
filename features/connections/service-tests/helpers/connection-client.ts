import got from "got"
import  { SQSClient, 
  
    ReceiveMessageCommand, 
    GetQueueUrlCommand, 
    ReceiveMessageResult,
    DeleteMessageCommand } from "@aws-sdk/client-sqs"
 
import logger from "../../../../test-helpers/service-test-logger"

interface ConnectionResponseParameters{
  endpoint: string
  invitationId: string
  decision: string
  idToken: string | undefined
}

interface ConnectionRequestParameters{
    endpoint: string
    intiatingNetworkerId: string | null
    invitedNetworkerId: string | null
    idToken: string | undefined
}

export class ConnectionsClient
{
    async response(parameters: ConnectionResponseParameters)
    {
        let responseBody: any = {}

        try{
            const urlbase = parameters.endpoint
            const url = this.buildResponseUrl(urlbase!, parameters.invitationId!, parameters.decision)

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

    async request(parameters: ConnectionRequestParameters)
    {
        let responseBody: any = {}
        let requestBody: any = {}
        requestBody.initiatingNetworkerId = parameters.intiatingNetworkerId
    
        if (parameters.invitedNetworkerId != undefined)
        {
          requestBody.invitedNetworkerId = parameters.invitedNetworkerId
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

    buildResponseUrl(urlBase: string, invitationId: string, decision: string)
    {
        logger.verbose(urlBase)
        return urlBase.replace("{invitationId}", invitationId).replace("{decision}", decision)
    }
}