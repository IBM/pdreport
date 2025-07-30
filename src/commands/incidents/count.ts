import * as _ from "lodash";
import * as fs from "fs";
import ora from "ora"

import { getIncidentsInTimeframeWithOffset } from "../../lib/pagerduty";
import { isFirstDayOfMonth, isDateInTimeframes } from "../../lib/dates";

export async function count(options: any) {
    console.log(`Using options: ${JSON.stringify(_.omit(options, "pagerdutyKey"), null, 2)}\n`);

    console.log(`Getting incident counts for ${options.iterationCount} ${options.iteration}(s) starting on ${options.since}...\n`);

    var start = new Date(options.since);
    var end = new Date(options.since);
    end.setDate(end.getDate() + 1);

    let counts: any = {};
    let countsOutput: string = "Incident Title";
    let iterationNumber: number = 1;
    let dayCount: number = 0;

    console.log(`Iteration: ${options.iteration} ${iterationNumber}`);
    countsOutput += `,${options.iteration} starting ${_.split(start.toISOString(), "T")[0]}`

    while (iterationNumber <= options.iterationCount) {
        console.log("  Getting day starting: " + start.toISOString() + ", ending: " + end.toISOString());

        let isDateExcluded: boolean = false;
        if (!_.isEmpty(options.excludeDatesFilename)) {
            isDateExcluded = isDateInTimeframes(start, options.excludeDatesFilename);
        }

        let isDateIncluded: boolean = true;
        if (!_.isEmpty(options.includeDatesFilename)) {
            isDateIncluded = isDateInTimeframes(start, options.includeDatesFilename);
        }

        if (isDateExcluded) {
            console.log("     SKIPPING since date is excluded");
        } else {
            if (isDateIncluded) {
                let more: boolean = true;
                let offset: number = 0;
                let alerts: any[] = [];
                while (more) {
                    const response: any = await getIncidentsInTimeframeWithOffset(options, start.toISOString(), end.toISOString(), offset);

                    const body = JSON.parse(response.body);
                    alerts = _.concat(alerts, body.incidents);
                    more = body.more;
                    offset += 100;
                }

                _.each(alerts, (incident) => {
                    let title = encodeBraces(incident.title, true);
                    title = parseTitle(title);

                    if (_.isEmpty(options.filter) || (!_.isEmpty(options.filter) && _.includes(title, options.filter))) {
                        _.set(
                            counts,
                            `${title}.${options.iteration}${iterationNumber}`,
                            _.get(counts, `${title}.${options.iteration}${iterationNumber}`, 0) + 1
                        );
                    }
                })
            } else {
                console.log("     SKIPPING since date is not included");
            }
        }

        // Increment dates
        start.setDate(start.getDate() + 1);
        end.setDate(end.getDate() + 1);
        dayCount += 1;

        // Handle iteration increments
        if (options.iteration === "day"
            || (options.iteration === "week" && dayCount === 7)
            || (options.iteration === "month" && isFirstDayOfMonth(start))) {
            dayCount = 0;
            iterationNumber += 1;

            // Log new iteration
            if (iterationNumber <= options.iterationCount) {
                console.log(`Iteration: ${options.iteration} ${iterationNumber}`);
                countsOutput += `,${options.iteration} starting ${_.split(start.toISOString(), "T")[0]}`
            } else {
                console.log(" ");
            }
        }
    }

    const outputSpinner = ora(`Saving incidents to ${options.outputFilename}`).start();

    // output file contents
    countsOutput += "\n";
    _.each(counts, (iterationCounts, alertName) => {
        countsOutput += `${encodeBraces(alertName, false)}`
        iterationNumber = 1;
        while (iterationNumber <= options.iterationCount) {
            countsOutput += `,${_.get(iterationCounts, `${options.iteration}${iterationNumber}`, 0)}`
            iterationNumber += 1;
        }
        countsOutput += "\n";
    });

    fs.writeFileSync(options.outputFilename, countsOutput)

    outputSpinner.succeed();
}

function encodeBraces(input: string, encode: boolean) {
    let ret = input;
    if (encode) {
        ret = _.replace(ret, "[", "||--");
        ret = _.replace(ret, "]", "--||");
    } else {
        ret = _.replace(ret, "||--", "[");
        ret = _.replace(ret, "--||", "]");
    }
    return ret;
}

function parseTitle(input: string) {
    let ret = _.trim(input);

    // Implement custom title parsing here, for example:
    // ret = _.split(ret, " on ")[0]; // Only return the words before "on" in the title

    return ret;
}