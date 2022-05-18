import { Member } from "./member-dao";
import { SendEmailCommand } from "@aws-sdk/client-ses"
import logger from "./logger"

export class InvitationSendEmailCommand {

  static build(sender: Member, recipient: Member, invitationId: string, senderEmail: string) {
    
    let command: any

    try{
      command = InvitationSendEmailCommand.buildCommand(sender, recipient, invitationId, senderEmail)
    }
    catch(error)
    {
      logger.error(error)
      throw error
    }

    return command
  }

  static buildCommand(sender: Member, recipient: Member, invitationId: string, senderEmail: string) {
    let params: any = {
      Destination: {
        ToAddresses: [recipient.email],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: InvitationSendEmailCommand.getHtmlContent(sender, recipient, invitationId),
          },
          Text: {
            Charset: 'UTF-8',
            Data: InvitationSendEmailCommand.getTextContent(sender, recipient, invitationId),
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: "Invitation to connect on BeanTins",
        },
      },
      Source: senderEmail,
    };

    if (process.env.emailConfigurationSet != undefined) {
      params["ConfigurationSetName"] = process.env.emailConfigurationSet;
    }

    return new SendEmailCommand(params)
  }

  static getHtmlContent(sender: Member, recipient: Member, invitationId: string) {
    const approvalUrl = InvitationSendEmailCommand.buildResponseUrl(invitationId, "approve")
    const rejectUrl = InvitationSendEmailCommand.buildResponseUrl(invitationId, "reject")

    return `
        <html>
          <body>
            <h1>${sender.name} would like to connect on BeanTins. </h1>
            <p style="font-size:12px">To approve, select the following: ${approvalUrl}</p>
            <p style="font-size:12px">To reject: select the following: ${rejectUrl}</p>
          </body>
        </html>
      `;
  }

  static getTextContent(sender: Member, recipient: Member, invitationId: string) {

    const approvalUrl = this.buildResponseUrl(invitationId, "approve")
    const rejectUrl = this.buildResponseUrl(invitationId, "reject")
    return `
      ${sender.name} would like to connect on BeanTins. 
      To approve, select the following: ${approvalUrl}
      To reject, select the following: ${rejectUrl}
    `;
  }

  static buildResponseUrl(invitationId: string, decision: string) {
    return process.env.ResponseUrl + "?invite=" + invitationId + "&decision=" + decision;
  }
}
