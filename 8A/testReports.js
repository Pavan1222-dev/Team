const { buildReport } = require("./reports");

async function test() {
    await buildReport("daily-sales", "PDF");
    await buildReport("weekly-pending-tasks", "EXCEL");

    console.log("Both reports generated successfully");
}

test().catch(console.error);