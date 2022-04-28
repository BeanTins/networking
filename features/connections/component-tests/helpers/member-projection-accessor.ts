import {DocumentClient} from "aws-sdk/clients/dynamodb"
import logger from "./component-test-logger"

export class MemberProjectionAccessor {
  
  private dynamoDB: DocumentClient
  private memberProjectionName: string

  constructor(region: string)
  {
    this.dynamoDB = new DocumentClient({region: region})
    this.memberProjectionName = process.env.MemberProjection!
    logger.verbose(process.env.MemberProjection)
  }

  async clear()
  {
    const queryTableName = {
        TableName: this.memberProjectionName
    }
    
    const items =  await this.dynamoDB.scan(queryTableName).promise()
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
              await dynamoDB.delete(memberRecord).promise()
          }
          catch(error)
          {
            logger.error("Failed to clear record from " + tableName + " - " + error)
          }
      }
    }
  } 

  async waitForMembersToBeStored(nameList: String[]): Promise<boolean>
  {
    let memberPresent: boolean = false
    var params = {
      FilterExpression: "#name = :name",
      ExpressionAttributeValues: {
        ":name": nameList 
      },
      ExpressionAttributeNames: { "#name": "name" },
      TableName: this.memberProjectionName
    }
    logger.verbose(JSON.stringify(params))
    try{
      for (let retry = 0; retry < 3; retry++) {
        let result = await this.dynamoDB.scan(params).promise()
        logger.verbose("wait for member presence scan result - " + JSON.stringify(result))
        if((result.Count != null) && result.Count > 0)
        {
          const item = result.Items![0]
          memberPresent = true
          break
        }
        await new Promise(r => setTimeout(r, 500))
      }
    }
    catch(err){
      logger.error(err)
    }
 
    return memberPresent
  }

}

