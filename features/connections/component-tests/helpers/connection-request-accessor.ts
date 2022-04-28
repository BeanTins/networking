import {DocumentClient} from "aws-sdk/clients/dynamodb"
import logger from "./component-test-logger"

export class ConnectionRequestAccessor {
  
  private dynamoDB: DocumentClient
  private connectionRequestTableName: string

  constructor(region: string)
  {
    this.dynamoDB = new DocumentClient({region: region})

    this.connectionRequestTableName = process.env.ConnectionRequestTable!
  }

  async clear()
  {
    const queryTableName = {
        TableName: this.connectionRequestTableName
    }
    
    const items =  await this.dynamoDB.scan(queryTableName).promise()
    const tableName = this.connectionRequestTableName
    const dynamoDB = this.dynamoDB
  
    if (items.Items) {
      for await (const item of items.Items){
  
          var record = {
              TableName: tableName,
              Key: {"invitationId": item["invitationId"]}
          };
  
          logger.verbose("Clearing connection request - " + JSON.stringify(record))
          
          try
          {
              await dynamoDB.delete(record).promise()
          }
          catch(error)
          {
            logger.error("Failed to clear record from " + tableName + " - " + error)
          }
      }
    }
  } 
}

