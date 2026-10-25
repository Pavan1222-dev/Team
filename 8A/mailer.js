
const nodemailer = require("nodemailer");

let transporter;

// Create an Ethereal test account
async function setupMailer() {
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host:  "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });

    console.log("Ethereal email account ready");
}

// Send an email with a report attachment

async function sendEmail(to, filePath, subject = "Scheduled Report") {
    const info = await transporter.sendMail({
        from: '"Report Mailer" <reports@example.com>',
        to,
        subject,
        text: filePath
            ? "Your report is attached."
            : "A scheduled report job failed.",
        attachments: filePath
            ? [{ filename: filePath.split(/[\\/]/).pop(), path: filePath }]
            : []
    });

    console.log("Email sent:", info.messageId);
    console.log("Preview email:", nodemailer.getTestMessageUrl(info));
}

module.exports = { setupMailer, sendEmail };
