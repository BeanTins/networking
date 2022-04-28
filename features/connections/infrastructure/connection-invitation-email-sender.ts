import { Member } from "./member-dao";
import { SES } from "aws-sdk";
import { SendEmailRequest } from "aws-sdk/clients/ses";

export class ConnectionInvitationEmailSender {
  private emailClient: SES;

  constructor(region: string) {
    this.emailClient = new SES({ region: region });
  }

  async sendConnectionInvite(sender: Member, recipient: Member, invitationId: string) {
    const result = await this.emailClient.sendEmail(this.buildSendEmailParams(sender, recipient, invitationId)).promise();
  }

  buildSendEmailParams(sender: Member, recipient: Member, invitationId: string): SendEmailRequest {

    let params: any = {
      Destination: {
        ToAddresses: [recipient.email],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: this.getHtmlContent(sender, recipient, invitationId),
          },
          Text: {
            Charset: 'UTF-8',
            Data: this.getTextContent(sender, recipient, invitationId),
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: "Invitation to connect on BeanTins",
        },
      },
      Source: sender.email,
    };

    if (process.env.emailConfigurationSet != undefined) {
      params["ConfigurationSetName"] = process.env.emailConfigurationSet;
    }

    return params;
  }

  getHtmlContent(sender: Member, recipient: Member, invitationId: string) {
    const approvalUrl = this.buildResponseUrl(invitationId, "approve");
    const rejectUrl = this.buildResponseUrl(invitationId, "approve");

    return `
        <html>
          <body>
            <h1>${sender.name} would like to connect on BeanTins. </h1>
            <p style="font-size:12px">To approve, select the following: ${approvalUrl}</p>
            <p style="font-size:12px">To reject: slect the following: ${rejectUrl}</p>
          </body>
        </html>
      `;
  }

  getTextContent(sender: Member, recipient: Member, invitationId: string) {

    const approvalUrl = this.buildResponseUrl(invitationId, "approve");
    const rejectUrl = this.buildResponseUrl(invitationId, "reject");
    return `
      ${sender.name} would like to connect on BeanTins. 
      To approve, select the following: ${approvalUrl}
      To reject, select the following: ${rejectUrl}
    `;
  }

  buildResponseUrl(invitationId: string, decision: string) {
    return process.env.ResponseUrl + "?invite=" + invitationId + "&decision=" + decision;
  }
}
