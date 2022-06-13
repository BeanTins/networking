import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import logger from "../../../../test-helpers/component-test-logger"

interface ConversationsParameters{
  tableName: string
}
export class ConversationsAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private tableName: string

  constructor(region: string, parameters: ConversationsParameters)
  {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client)
    this.tableName = parameters.tableName
  }

  async clear()
  {
    const queryTableName = {
        TableName: this.tableName
    }
    
    const items =  await this.dynamoDB.send(new ScanCommand(queryTableName))
    const tableName = this.tableName
    const dynamoDB = this.dynamoDB
  
    if (items.Items) {
      for await (const item of items.Items){
  
          var record = {
              TableName: tableName,
              Key: {"id": item["id"]}
          };
  
          logger.verbose("Clearing conversations - " + JSON.stringify(record))
          
          try
          {
              await dynamoDB.send(new DeleteCommand(record))
          }
          catch(error)
          {
            logger.error("Failed to clear record from " + tableName + " - " + error)
          }
      }
    }
  } 
}