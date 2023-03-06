import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import logger from "../../../../test-helpers/service-test-logger"

interface networkerProjectionParameters{
  tableName: string
}
export class NetworkerProjectionAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private tableName: string

  constructor(region: string, parameters: networkerProjectionParameters)
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
  
          var memberRecord = {
              TableName: tableName,
              Key: {"id": item["id"]}
          };
  
          logger.verbose("Clearing member - " + JSON.stringify(memberRecord))
          
          try
          {
              logger.verbose(JSON.stringify(await dynamoDB.send(new DeleteCommand(memberRecord))))
          }
          catch(error)
          {
            logger.error("Failed to clear record from " + tableName + " - " + error)
          }
      }
    }
  } 

  async waitForMembersToBeStored(nameList: String[], retries: number = 4, retryWaitInMillisecs = 500): Promise<boolean>
  {
    let memberPresent: boolean = false

    var nameObject: any = {}
    var index = 0;
    nameList.forEach(function(value) {
        index++;
        var titleKey = ":name"+index
        nameObject[titleKey.toString()] = value
    });
    
    var params = {
      FilterExpression: "#name IN ("+Object.keys(nameObject).toString()+ ")",
      ExpressionAttributeValues: nameObject,
      ExpressionAttributeNames: { "#name": "name" },
      TableName: this.tableName
    }
    logger.verbose(JSON.stringify(params))
    try{
      for (let retry = 0; retry < retries; retry++) {
        let result = await this.dynamoDB.send(new ScanCommand(params))
        logger.verbose("wait for member presence scan result - " + JSON.stringify(result))
        if((result.Count != null) && result.Count == nameList.length)
        {
          const item = result.Items![0]
          logger.verbose("member is stored - " + item)

          memberPresent = true
          break
        }
        await new Promise(r => setTimeout(r, retryWaitInMillisecs * Math.pow(2, retry)))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return memberPresent
  }

}

