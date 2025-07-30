#!/usr/bin/env node

import chalk from "chalk";
import * as figlet from "figlet";
import * as commander from "commander";
import { Option } from "commander";

import { list } from "./commands/incidents/list";
import { count } from "./commands/incidents/count"

console.log(
    chalk.green(
        figlet.textSync("pdreport", { horizontalLayout: "full" })
    )
);
console.log(" ");

commander.program
    .version("0.0.5")
    .description("A CLI for generating reports based on PagerDuty data");

// Command for getting a raw list of incidents
commander.program
    .command("list")
    .description("List all incidents in a given timeframe")
    .addOption(new Option("-k, --pagerduty-key <value>", "PagerDuty API key. Defaults to PAGERDUTY_KEY environment variable if set.")
        .env("PAGERDUTY_KEY")
        .makeOptionMandatory()
    )
    .addOption(new Option("-t, --team-ids <value>", "Comma separated list of PagerDuty team IDs. Defaults to PAGERDUTY_TEAM_IDS environment variable if set.")
        .env("PAGERDUTY_TEAM_IDS")
        .makeOptionMandatory()
    )
    .addOption(new Option("-r, --service-ids <value>", "Comma separated list of PagerDuty service IDs. Defaults to PAGERDUTY_SERVICE_IDS environment variable if set.")
        .env("PAGERDUTY_SERVICE_IDS")
        .makeOptionMandatory()
    )
    .requiredOption("-s, --since <value>", "Retrieve incidents created after this date. e.g. 2024-01-01T01:00:00")
    .option("-u, --until [value]", "Retrieve incidents created before this date. If not specified, will use current datetime.", (new Date()).toISOString())
    .option("-f, --filter [value]", "Optionally specify an incident title filter in order to only list specific incidents.")
    .option("--custom-details [value]", "Optionally specify a comma-separated list of additional fields to retrieve from the Custom Details of the incident.")
    .option("--custom-details-regex [value]", "Optionally specify a regex to apply to the value of the Custom Details fields. Will apply to all fields and retrieve the first group.")
    .option("-o, --output-filename [value]", "Optionally specify filename to write output to. Default is output.csv.", "output.csv")
    .action(list);

// Command for counting incidents grouped by day/week/month
commander.program
    .command("count")
    .description("Count occurrences of incidents in a given timeframe")
    .addOption(new Option("-k, --pagerduty-key <value>", "PagerDuty API key. Defaults to PAGERDUTY_KEY environment variable if set.")
        .env("PAGERDUTY_KEY")
        .makeOptionMandatory()
    )
    .addOption(new Option("-t, --team-ids <value>", "Comma separated list of PagerDuty team IDs. Defaults to PAGERDUTY_TEAM_IDS environment variable if set.")
        .env("PAGERDUTY_TEAM_IDS")
        .makeOptionMandatory()
    )
    .addOption(new Option("-r, --service-ids <value>", "Comma separated list of PagerDuty service IDs. Defaults to PAGERDUTY_SERVICE_IDS environment variable if set.")
        .env("PAGERDUTY_SERVICE_IDS")
        .makeOptionMandatory()
    )
    .requiredOption("-s, --since <value>", "Retrieve incidents created after this date. e.g. 2024-01-01T01:00:00")
    .addOption(new Option("-i, --iteration <value>", "Length of time to group incident counts by. Default is week.")
        .choices(["day", "week", "month"])
        .default("week")
        .makeOptionMandatory()
    )
    .requiredOption("-c, --iteration-count <number>", "How many iterations to retrieve starting at the given date. Default is 1.", "1")
    .option("-f, --filter [value]", "Optionally specify an incident title filter in order to only count specific incidents.")
    .option("-d, --include-dates-filename [value]", "Optionally specify filename with list of dates to include. Will only include these dates within the since/until timeframe. If date is also in excluded list, it will be excluded.")
    .option("-x, --exclude-dates-filename [value]", "Optionally specify filename with list of dates to exclude. No dates excluded by default. If date is also in included list, it will be excluded.")
    .option("-o, --output-filename [value]", "Optionally specify filename to write output to. Default is output.csv.", "output.csv")
    .action(count);

commander.program
    .parse(process.argv);