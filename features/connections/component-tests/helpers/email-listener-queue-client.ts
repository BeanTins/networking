import  { SQSClient, 
  
  ReceiveMessageCommand, 
  GetQueueUrlCommand, 
  ReceiveMessageResult,
  DeleteMessageCommand,
PurgeQueueCommand } from "@aws-sdk/client-sqs"
import logger from "./component-test-logger"

export interface EventResponse
{
  type: string
  data: object
}

export class EmailListenerQueueClient {
  private sqsClient: SQSClient
  private url: string
  constructor(region: string) {
    this.sqsClient = new SQSClient({ region: region })
  }

  async clear()
  {
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        MaxNumberOfMessages: 10
      }   
      const command = new ReceiveMessageCommand(params)
    
      let response: any
      do
      {
        response = await this.sqsClient.send(command)
  
        if (response.Messages != undefined && response.Messages.length > 0)
        {
          for (const message of response.Messages)
          {
            await this.deleteMessage(message.ReceiptHandle!)
            logger.verbose("Deleted email notification - " + JSON.stringify(message))
          }
        }
      } while((response.Messages != undefined) && (response.Messages.length < 10))
    }
    catch(error)
    {
      logger.error("Failed to receive event -  " + error)
      throw error
    }
  }  

  async getUrl()
  {
    if (this.url == undefined)
    {
      const input = {
        QueueName: process.env.EmailListenerQueueName,
      }
  
      try {
  
        const command = new GetQueueUrlCommand(input)
        const response = await this.sqsClient.send(command)
    
        logger.verbose("email event listener queue url response - " + JSON.stringify(response))
        this.url = response.QueueUrl!
      }
      catch(error)
      {
        logger.error("Failed to get event listener queue url -  " + error)
        throw error
      }
    }

    return this.url
  }

  async waitForEmail(sender: string, recipient: string, subject: string) : Promise<boolean>
  {
    let matchFound = false

    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 1,
      }   
    
      const command = new ReceiveMessageCommand(params)
      const response: ReceiveMessageResult = await this.sqsClient.send(command)
  
      logger.verbose("email event listener queue response - " + JSON.stringify(response))

      if (response.Messages != undefined && response.Messages.length > 0)
      {
        logger.verbose("response - " + JSON.stringify(response))
        for (const message of response.Messages)
        {
          const body = message.Body!

          const bodyObject = JSON.parse(body)

          logger.verbose(JSON.stringify(bodyObject))

          if (bodyObject.Type == "Notification")
          {
            try{
              const messageDetails = JSON.parse(bodyObject.Message)
              logger.verbose(JSON.stringify(messageDetails))

              const headers = messageDetails.mail.commonHeaders

              if (headers.from[0] != sender) 
              {
                logger.verbose("actual sender: " + headers.from[0] + " expected sender:" + sender)
              }
              else if (headers.to[0] != recipient)
              {
                logger.verbose("actual recipient: " + headers.to[0] + " expected recipient:" + recipient)
              }
              else if (headers.subject != subject)
              {
                logger.verbose("actual subject: " + headers.subject + " expected subject:" + subject)
              }
              else
              {
                logger.verbose("email match found")

                matchFound = true
              }
            }
            catch(error)
            {
               logger.verbose("ignoring message - " + bodyObject.Message)
            }
          }

          await this.deleteMessage(message.ReceiptHandle!)
        }
      }
      else
      {
          logger.verbose("email event listener queue response has no messages")
      }
    }
    catch(error)
    {
      logger.error("Failed to receive event -  " + error)
      throw error
    }

    return matchFound
  }

  async deleteMessage(receiptHandle: string)
  {
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        ReceiptHandle: receiptHandle
      }   
  
      const command = new DeleteMessageCommand(params)

      const response = await this.sqsClient.send(command)

      logger.verbose("email event listener delete message response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to delete message -  " + error)
      throw error
    }

    return event
  }  
}