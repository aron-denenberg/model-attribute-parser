import { Command, Option } from "commander";
import { ModelParser } from "./model-parser";

type CommandLineOptions = {
  cleanup: boolean;
  dryRun: boolean;
  port: number;
  save: 'direct' | 'upload' | '';
  organization: string;
  lastCreatedAt: string;
}

function getCommandLineOptions(): CommandLineOptions {
  const program = new Command();

  program
    .name('Model Field Attribute Parser')
    .description('Parses attributes from the `model` field of all assets and updates the asset records with the parsed attributes')
    .version('0.0.1')
    .allowUnknownOption()
    .option(
      '-c, --cleanup', 
      'When set, excess values will be removed from `model` field after parsing')
    .option(
      '-p, --port <port>', 
      'The port that the database is accessible through', '43346')
    .option(
      `-s, --save <'direct' | 'upload'>`,
      'When set, changes will be saved to the database', '')
    .option(
        '-o, --organization <organization>', 
        'When set, assets will be searched and updated for the specific organization')
    .option(
      '-l, --lastCreatedAt <lastCreatedAt>',
      'The last record to search from based on createdAt date. The search will search starting from this date and go in descending order until the first record is found or the limit is reached (1000)',
    )
    .parse();

  return program.opts<CommandLineOptions>();
}

function main() {
  const commandLineOptions = getCommandLineOptions();

  if (commandLineOptions.save && !['direct', 'upload'].includes(commandLineOptions.save)) {
    throw new Error('Invalid value for `save` option. Must be one of: `direct`, `upload`');
  }


  const modelParser = new ModelParser({
    cleanup: commandLineOptions.cleanup,
    dryRun: commandLineOptions.dryRun,
    port: commandLineOptions.port,
    save: commandLineOptions.save,
    organizationId: commandLineOptions.organization,
    lastCreatedAt: commandLineOptions.lastCreatedAt,
  });

  modelParser.run();
}

main();