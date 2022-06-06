import { Member } from "./member-dao";
import { SendEmailCommand } from "@aws-sdk/client-ses"
import logger from "../../../infrastructure/lambda-logger"

export class ConfirmationSendEmailCommand {

  static build(initiatingMember: Member, invitedMember: Member, senderEmail: string) {
    
    let command: any

    try{
      command = ConfirmationSendEmailCommand.buildCommand(initiatingMember, invitedMember, senderEmail)
    }
    catch(error)
    {
      logger.error(error)
      throw error
    }

    return command
  }

  static buildCommand(initiatingMember: Member, invitedMember: Member, senderEmail: string) {
    let params: any = {
      Destination: {
        ToAddresses: [initiatingMember.email],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: ConfirmationSendEmailCommand.getHtmlContent(initiatingMember.name, invitedMember.name),
          },
          Text: {
            Charset: 'UTF-8',
            Data: ConfirmationSendEmailCommand.getTextContent(initiatingMember.name, invitedMember.name),
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

  static getHtmlContent(initiatingMemberName: string, invitedMemberName: string) {

    return `
        <html>
          <body>
            <h1>Congratulations ${initiatingMemberName}, you are now connected to ${invitedMemberName}. </h1>
          </body>
        </html>
      `;
  }

  static getTextContent(initiatingMemberName: string, invitedMemberName: string) {

    return `
    Congratulations ${initiatingMemberName}, you are now connected to ${invitedMemberName}.
    `;
  }
}
