
const db = require("./db");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

// Folder for generated reports
const reportFolder = path.join(__dirname, "reports");

if (!fs.existsSync(reportFolder)) {
    fs.mkdirSync(reportFolder);
}

// Generate PDF report
function generatePDF(title, rows, filePath) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        stream.on("finish", resolve);
        stream.on("error", reject);
        doc.on("error", reject);

        doc.pipe(stream);

        doc.fontSize(20).text(title, { align: "center" });
        doc.moveDown();

        rows.forEach(row => {
            doc.fontSize(12).text(JSON.stringify(row));
            doc.moveDown(0.5);
        });

        doc.end();
    });
}

// Generate Excel report
async function generateExcel(title, rows, filePath) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");

    if (rows.length > 0) {
        worksheet.columns = Object.keys(rows[0]).map(key => ({
            header: key,
            key,
            width: 22
        }));

        worksheet.addRows(rows);
    }

    worksheet.getRow(1).font = { bold: true };

    await workbook.xlsx.writeFile(filePath);
}

// Main report function
async function buildReport(reportType, format) {
    let title;
    let rows;

    if (reportType === "daily-sales") {
        title = "Daily Sales Summary";

        rows = db.prepare(`
            SELECT product, amount, sale_date
            FROM sales
            WHERE sale_date = ?
        `).all(
            require("dayjs")().format("YYYY-MM-DD")
        );

        // If today's data is empty, show all sample sales
        if (rows.length === 0) {
            rows = db.prepare(
                "SELECT product, amount, sale_date FROM sales"
            ).all();
        }
    } else if (reportType === "weekly-pending-tasks") {
        title = "Weekly Pending Tasks";

        rows = db.prepare(`
            SELECT id, task_name, status
            FROM tasks
            WHERE status = 'pending'
        `).all();
    } else {
        throw new Error("Invalid report type");
    }

    const extension = format.toLowerCase() === "pdf"
        ? "pdf"
        : "xlsx";

    const filePath = path.join(
        reportFolder,
        `${reportType}-${Date.now()}.${extension}`
    );

    if (format.toUpperCase() === "PDF") {
        await generatePDF(title, rows, filePath);
    } else if (format.toUpperCase() === "EXCEL") {
        await generateExcel(title, rows, filePath);
    } else {
        throw new Error("Format must be PDF or Excel");
    }

    console.log("Report generated:", filePath);

    return filePath;
}

module.exports = { buildReport };
