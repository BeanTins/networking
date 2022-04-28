import  { SQSClient, 
  
  ReceiveMessageCommand, 
  GetQueueUrlCommand, 
  ReceiveMessageResult,
  DeleteMessageCommand } from "@aws-sdk/client-sqs"
import logger from "./component-test-logger"

export interface EventResponse
{
  type: string
  data: object
}

export class EmailListenerQueueClient {
  public readonly sqsClient: SQSClient
  private url: string
  constructor(region: string) {
    this.sqsClient = new SQSClient({ region: region })
  }

  async clear()
  {
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url
      }   
    
      const command = new ReceiveMessageCommand(params)
      const response: ReceiveMessageResult = await this.sqsClient.send(command)
  
      logger.verbose("event listener queue response - " + JSON.stringify(response))

      if (response.Messages != undefined && response.Messages.length > 0)
      {
        for (const message of response.Messages)
        {
          await this.deleteMessage(message.ReceiptHandle!)
          logger.verbose("Deleted notification -" + message)
        }
      }
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
    
        logger.verbose("event listener queue url response - " + JSON.stringify(response))
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
    let event: EventResponse|undefined
    const url = await this.getUrl()

    try {
      const params = {
        QueueUrl: url,
        WaitTimeSeconds: 10
      }   
    
      const command = new ReceiveMessageCommand(params)
      const response: ReceiveMessageResult = await this.sqsClient.send(command)
  
      logger.verbose("event listener queue response - " + JSON.stringify(response))

      if (response.Messages != undefined && response.Messages.length > 0)
      {
        for (const message of response.Messages)
        {
          const body = message.Body!

          const bodyObject = JSON.parse(body)

          if (bodyObject.Type == "Notification")
          {
            try{
              const messageDetails = JSON.parse(bodyObject.Message)
              logger.verbose(JSON.stringify(messageDetails))

              const headers = messageDetails.mail.commonHeaders

              logger.verbose(JSON.stringify(headers))
              if ((headers.from[0] == sender) &&
                  (headers.to[0] == recipient) &&
                  (headers.subject == subject))
              {
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
          logger.verbose("event listener queu response has no messages")
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

      logger.verbose("event listener delete message response - " + JSON.stringify(response))
    }
    catch(error)
    {
      logger.error("Failed to delete message -  " + error)
      throw error
    }

    return event
  }  
}