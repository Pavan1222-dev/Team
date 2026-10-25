#!/usr/bin/env node

const { Command } = require("commander");
const { registerCommands } = require("./commands");

const program = new Command();

program
  .name("expense")
  .description("A CLI application to manage expenses")
  .version("1.0.0");

registerCommands(program);

program.parseAsync(process.argv).catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});









