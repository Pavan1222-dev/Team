
const { buildReport } = require("./reports");
const { setupMailer, sendEmail } = require("./mailer");

async function test() {
    await setupMailer();

    const filePath = await buildReport("daily-sales", "PDF");

    await sendEmail("customer@example.com", filePath);
}

test().catch(console.error);
