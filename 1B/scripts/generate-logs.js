
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';

const outputDir = path.resolve('logs');
const outputFile = path.join(outputDir, 'sample.log');

const targetMB = Number(process.argv[2] ?? 1);

if (!Number.isFinite(targetMB) || targetMB <= 0) {
  console.error('Usage: npm run generate -- <size-in-MB>');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const stream = fs.createWriteStream(outputFile);

const ips = [
  '192.168.1.10',
  '192.168.1.20',
  '10.0.0.5',
  '172.16.0.8'
];

const urls = [
  '/home',
  '/products',
  '/login',
  '/api/users',
  '/api/orders',
  '/checkout'
];

const statuses = [200, 200, 200, 201, 400, 404, 500];

const startTime = new Date('2026-10-17T10:00:00Z');
const targetBytes = targetMB * 1024 * 1024;

let bytesWritten = 0;
let requestNumber = 0;

//!strea.write handles backpressure using drain
async function writeChunk(chunk) {
  if (!stream.write(chunk)) {
    await once(stream, 'drain');
  }
}

async function generate() {
  try {
    while (bytesWritten < targetBytes) {
      let batch = '';

      // Build only a small batch in memory.
      for (let i = 0; i < 1000; i++) {
        const ip = ips[requestNumber % ips.length];
        const url = urls[requestNumber % urls.length];
        const status = statuses[requestNumber % statuses.length];

        const timestamp = new Date(
          startTime.getTime() + requestNumber * 1000
        );

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const day = String(timestamp.getUTCDate()).padStart(2, '0');
const month = months[timestamp.getUTCMonth()];
const year = timestamp.getUTCFullYear();

const hours = String(timestamp.getUTCHours()).padStart(2, '0');
const minutes = String(timestamp.getUTCMinutes()).padStart(2, '0');
const seconds = String(timestamp.getUTCSeconds()).padStart(2, '0');

const date = `${day}/${month}/${year}:${hours}:${minutes}:${seconds}`;

        const responseBytes = 500 + (requestNumber % 5000);
        const responseTime = 10 + (requestNumber % 400);

        batch +=
          `${ip} - - [${date} +0000] ` +
          `"GET ${url} HTTP/1.1" ${status} ` +
          `${responseBytes} ${responseTime}\n`;

        requestNumber++;
      }

      await writeChunk(batch);
      bytesWritten += Buffer.byteLength(batch);

      if (requestNumber % 100000 === 0) {
        console.log(
          `Generated ${(bytesWritten / 1024 / 1024).toFixed(2)} MB`
        );
      }
    }

    stream.end();
    await once(stream, 'finish');

    console.log('\nGeneration complete!');
    console.log(`File: ${outputFile}`);
    console.log(`Requests: ${requestNumber}`);
    console.log(`Actual size: ${(bytesWritten / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    stream.destroy();
    console.error('Generation failed:', error.message);
    process.exitCode = 1;
  }
}

generate();
