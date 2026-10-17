
import fs from 'node:fs';
import readline from 'node:readline';
import { parseLogLine } from './src/parser.js';

const inputFile = process.argv[2] ?? 'logs/sample.log';

async function analyzeFile() {
  const fileStream = fs.createReadStream(inputFile);

  const lineReader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let totalLines = 0;
  let validRequests = 0;
  let malformedLines = 0;

  for await (const line of lineReader) {
    totalLines++;

    const request = parseLogLine(line);

    if (request === null) {
      malformedLines++;
      continue;
    }

    validRequests++;

    // Display only the first 3 parsed requests.
    if (validRequests <= 3) {
      console.log(request);
    }
  }

  console.log('\nAnalysis complete');
  console.log('-----------------');
  console.log(`Total lines: ${totalLines}`);
  console.log(`Valid requests: ${validRequests}`);
  console.log(`Malformed lines: ${malformedLines}`);
}

analyzeFile().catch((error) => {
  console.error('Analysis failed:', error.message);
  process.exitCode = 1;
});
