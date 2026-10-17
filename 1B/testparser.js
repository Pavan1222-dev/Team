
import { parseLogLine } from './src/parser.js';

const line =
  '192.168.1.10 - - [17/Oct/2026:10:00:00 +0000] "GET /home HTTP/1.1" 200 500 10';

console.log(parseLogLine(line));
console.log(parseLogLine('this is not a valid log line'));
