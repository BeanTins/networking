import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb"
import logger from "./component-test-logger"

export class MemberProjectionAccessor {
  
  private dynamoDB: DynamoDBDocumentClient
  private memberProjectionName: string

  constructor(region: string)
  {
    const client = new DynamoDBClient({region: region})
    this.dynamoDB = DynamoDBDocumentClient.from(client)
    this.memberProjectionName = process.env.MemberProjection!
    logger.verbose(process.env.MemberProjection)
  }

  async clear()
  {
    const queryTableName = {
        TableName: this.memberProjectionName
    }
    
    const items =  await this.dynamoDB.send(new ScanCommand(queryTableName))
    const tableName = this.memberProjectionName
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
              await dynamoDB.send(new DeleteCommand(memberRecord))
          }
          catch(error)
          {
            logger.error("Failed to clear record from " + tableName + " - " + error)
          }
      }
    }
  } 

  async waitForMembersToBeStored(nameList: String[], retries: number = 3, retryWaitInMillisecs = 500): Promise<boolean>
  {
    let memberPresent: boolean = false

    var nameObject: any = {};
    var index = 0;
    nameList.forEach(function(value) {
        index++;
        var titleKey = ":name"+index;
        nameObject[titleKey.toString()] = value;
    });
    
    var params = {
      FilterExpression: "#name IN ("+Object.keys(nameObject).toString()+ ")",
      ExpressionAttributeValues: nameObject,
      ExpressionAttributeNames: { "#name": "name" },
      TableName: this.memberProjectionName
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

