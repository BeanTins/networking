import { Networker } from "./networker-dao";
import { SendEmailCommand } from "@aws-sdk/client-ses"
import logger from "../../../infrastructure/lambda-logger"

export class ConfirmationSendEmailCommand {

  static build(initiatingNetworker: Networker, invitedNetworker: Networker, senderEmail: string) {
    
    let command: any

    try{
      command = ConfirmationSendEmailCommand.buildCommand(initiatingNetworker, invitedNetworker, senderEmail)
    }
    catch(error)
    {
      logger.error(error)
      throw error
    }

    return command
  }

  static buildCommand(initiatingNetworker: Networker, invitedNetworker: Networker, senderEmail: string) {
    let params: any = {
      Destination: {
        ToAddresses: [initiatingNetworker.email],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: ConfirmationSendEmailCommand.getHtmlContent(initiatingNetworker.name, invitedNetworker.name),
          },
          Text: {
            Charset: 'UTF-8',
            Data: ConfirmationSendEmailCommand.getTextContent(initiatingNetworker.name, invitedNetworker.name),
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: "You have a new connection on BeanTins",
        },
      },
      Source: senderEmail,
    }

    if (process.env.emailConfigurationSet != undefined) {
      params["ConfigurationSetName"] = process.env.emailConfigurationSet;
    }

    return new SendEmailCommand(params)
  }

  static getHtmlContent(initiatingNetworkerName: string, invitedNetworkerName: string) {

    return `
        <html>
          <body>
            <h1>Congratulations ${initiatingNetworkerName}, you are now connected to ${invitedNetworkerName}. </h1>
          </body>
        </html>
      `;
  }

  static getTextContent(initiatingNetworkerName: string, invitedNetworkerName: string) {

    return `
    Congratulations ${initiatingNetworkerName}, you are now connected to ${invitedNetworkerName}.
    `;
  }
}
