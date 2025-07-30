import * as _ from "lodash";
import * as fs from "fs";
import ora from "ora"

import { getIncidents, getCustomDetailsForIncident } from "../../lib/pagerduty";

export async function list(options: any) {
    console.log(`Using options: ${JSON.stringify(_.omit(options, "pagerdutyKey"), null, 2)}\n`);

    const listSpinner = ora(`Getting incidents from ${options.since} to ${options.until}...\n`).start();

    let more: boolean = true;
    let offset: number = 0;
    let incidents: any[] = [];

    // populate titles of each column
    let incidentOutput = "title,urgency,created_at,last_status_change_at,html_url";
    if (!_.isEmpty(options.customDetails)) {
        _.forEach(_.split(options.customDetails, ","), (field: string) => {
            incidentOutput += `,${field}`;
        });
    }
    incidentOutput += "\n";

    // get list of incidents in timeframe
    // TODO add a check for total and do separate calls if it's over 10k, offset can only go to 10k
    while (more) {
        let response: any;
        try {
            response = await getIncidents(options, offset);
        } catch (err: any) {
            listSpinner.fail(`Getting incidents from ${options.since} to ${options.until}. Error: ${err.message}`);
            return;
        }

        const body = JSON.parse(response.body);
        incidents = _.concat(incidents, body.incidents);
        more = body.more;
        offset += 100;
    }
    listSpinner.succeed();

    // retrieve details, including custom details, if required
    let count = 0;
    const detailSpinner = ora(`Getting details for ${count}/${_.size(incidents)} incidents...\n`).start();
    for (const incident of incidents) {
        incidentOutput += await getIncidentData(incident, options);
        count += 1;
        detailSpinner.text = `Getting details for ${count}/${_.size(incidents)} incidents...\n`;
    }
    detailSpinner.succeed();

    // write results to file
    const outputSpinner = ora(`Saving incidents to ${options.outputFilename}`).start();
    fs.writeFileSync(options.outputFilename, incidentOutput);
    outputSpinner.succeed();
}

async function getIncidentData(incident: any, options: any) {
    let output = "";
    let title = _.trim(incident.title);

    // only include incident if no filter is specified, or if filter matches the incident title
    if (_.isEmpty(options.filter) || (!_.isEmpty(options.filter) && _.includes(title, options.filter))) {
        // get custom details if requested
        if (!_.isEmpty(options.customDetails)) {
            const customDetails = await getCustomDetailsForIncident(incident.id, title, options);

            output += `${title},${incident.urgency},${incident.created_at},${incident.last_status_change_at},${incident.html_url}`;
            _.forEach(_.split(options.customDetails, ","), (field: string) => {
                let value = _.get(customDetails, field, "unknown");

                if (!_.isEmpty(options.customDetailsRegex)) {
                    const rx = new RegExp(options.customDetailsRegex);
                    const arr: any = rx.exec(value);
                    value = _.get(arr, "[1]", "unknown");
                }

                value = _.replace(value, /\n/gm, "");
                value = _.replace(value, /"/g, '""');
                output += `,${value}`;
            });
            output += "\n";
        } else {
            output += `${title},${incident.urgency},${incident.created_at},${incident.last_status_change_at},${incident.html_url}\n`;
        }
    }

    return output;
}