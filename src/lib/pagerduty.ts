import got, { Options } from "got";
import * as _ from "lodash";

const commonOptions: Options = {
    prefixUrl: "https://api.pagerduty.com",
    headers: {
        Accept: "application/vnd.pagerduty+json;version=2",
        "Content-Type": "application/json"
    }
};

// Util function to call PD alerts API with offset
export async function getIncidents(options: any, offset: number) {
    const params = [
        ["limit", "100"],
        ["offset", offset.toString()],
        ["since", options.since],
        ["until", options.until],
        ["time_zone", "UTC"]
    ];

    _.forEach(_.split(options.serviceIds, ","), (serviceId: string) => {
        params.push(["service_ids[]", serviceId]);
    });

    _.forEach(_.split(options.teamIds, ","), (teamId: string) => {
        params.push(["team_ids[]", teamId]);
    });

    const searchParams = new URLSearchParams(params);

    const apiOptions = _.merge(_.cloneDeep(commonOptions), {
        headers: {
            Authorization: `Token ${options.pagerdutyKey}`
        },
        searchParams: searchParams
    });

    // Wait to avoid getting rate limited by PD
    await new Promise(r => setTimeout(r, 2000));

    return got.get("incidents", apiOptions);
}

// Util function to call PD alerts API with start date, end date, and offset
export async function getIncidentsInTimeframeWithOffset(options: any, startDate: string, endDate: string, offset: number) {
    const params: string[][] = [
        ["limit", "100"],
        ["offset", offset.toString()],
        ["since", startDate],
        ["until", endDate],
        ["time_zone", "UTC"]
    ];

    _.forEach(_.split(options.serviceIds, ","), (serviceId: string) => {
        params.push(["service_ids[]", serviceId]);
    });

    _.forEach(_.split(options.teamIds, ","), (teamId: string) => {
        params.push(["team_ids[]", teamId]);
    });

    const searchParams = new URLSearchParams(params);

    const apiOptions = _.merge(_.cloneDeep(commonOptions), {
        headers: {
            Authorization: `Token ${options.pagerdutyKey}`
        },
        searchParams: searchParams
    });

    console.log(`    Offset: ${offset}`);

    if (offset >= 10000) {
        console.log("Warning: Offset is greater than the max allowed of 10000. Will not perform query.")

        const response = {
            body: JSON.stringify({
                incidents: [],
                more: false
            })
        };

        return Promise.resolve(response);
    } else {
        return got.get(`incidents`, apiOptions);
    }
}

export async function getCustomDetailsForIncident(incidentId: string, incidentTitle: string, options: any) {
    const response: any = await getAlertsForIncident(incidentId, options);
    const body = JSON.parse(response.body);
    let details = {};
    const alerts = _.get(body, "alerts", []);

    _.forEach(alerts, (alert: any) => {
        if(alert.summary === incidentTitle) {
            details = alert.body.details;
            return false; // break out of forEach
        }
    });

    return details;
}

export async function getAlertsForIncident(incidentId: string, options: any) {
    const apiOptions = _.merge(_.cloneDeep(commonOptions), {
        headers: {
            Authorization: `Token ${options.pagerdutyKey}`
        },
    });

    return got.get(`incidents/${incidentId}/alerts`, apiOptions);
}