# pdreport

```text
             _                                        _
 _ __     __| |  _ __    ___   _ __     ___    _ __  | |_
| '_ \   / _` | | '__|  / _ \ | '_ \   / _ \  | '__| | __|
| |_) | | (_| | | |    |  __/ | |_) | | (_) | | |    | |_
| .__/   \__,_| |_|     \___| | .__/   \___/  |_|     \__|
|_|                           |_|
```

A CLI for generating reports based on PagerDuty data.

## Table of Contents

* [Installation](#installation)
* [Usage](#usage)
  * [`pdreport`](#pdreport)
  * [`pdreport list`](#pdreport-list)
    * [`pdreport list` Required Options](#pdreport-list-required-options)
    * [`pdreport list` Additional Options](#pdreport-list-additional-options)
    * [`pdreport list` Example Usage](#pdreport-list-example-usage)
  * [`pdreport count`](#pdreport-list)
    * [`pdreport count` Required Options](#pdreport-count-required-options)
    * [`pdreport count` Additional Options](#pdreport-count-additional-options)
    * [`pdreport count` Example Usage](#pdreport-count-example-usage)
* [Limitations](#limitations)

## Installation

1. The following prerequisites must be installed.

    * npm and Node.js

        There are many different ways to install npm and Node.js. See [Downloading and installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

        If you use the recommended path of installing `nvm`, do the following:

        Install `nvm`:

        ```sh
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        ```

        Use `nvm` to install `node` v20 and `npm`:

        ```sh
        nvm install v20 --latest-npm
        ```

        Run the following commands to ensure `node` and `npm` are installed correctly:

        ```sh
        node -v
        npm -v
        ```

1. Get a PagerDuty API Key. See [PagerDuty support](https://support.pagerduty.com/docs/api-access-keys#section-generate-a-user-token-rest-api-key) for more information.

1. Clone this repo

    ```sh
    git clone git@github.ibm.com:cfjohnst/pdreport.git
    ```

1. Install `pdreport` locally

    ```sh
    npm run local-install
    ```

1. Set required environment variables:

    ```sh
    export PAGERDUTY_KEY = 'YOUR API KEY'
    export PAGERDUTY_TEAM_IDS = 'YOUR TEAM ID(S)'       # comma-separated list
    export PAGERDUTY_SERVICE_IDS = 'YOUR SERVICE ID(S)' # comma-separated list
    ```

1. You're ready to go 🎉 Run `pdreport --version` to verify installation.

### Updates

1. Once you have installed `pdreport`, use the command below to install any future updates:

    ```sh
    !git co master && git pull && npm run local-update
    ```

## Usage

### `pdreport`

Displays information about the pdreport CLI.

#### `pdreport` Options

* `-V, --version`

    Displays the currently installed version of pdreport.

    Usage:

    ```sh
    pdreport --version
    ```

* `-h, --help`

    Displays all of the available options and commands.

    ```sh
    pdreport --help
    ```

### `pdreport list`

Retrieve all incidents in a given timeframe and save them to a file. Output includes the incident title, urgency, created date, last status change date, and the URL.

You must minimally specify your PagerDuty API key, team ID(s), and service ID(s), as well as a since date to retrieve incidents. If no until date is specified, the current time will be used.

By default, incidents will be saved to a file named `output.csv`. For example:

```sh
$ pdreport list -s 2024-09-01T00:00:00

✔ Getting incidents from 2024-09-01T00:00:00 to 2024-09-02T04:00:00...

✔ Saving incidents to output.csv
```

#### `pdreport list` Required Options

You must minimally specify the options below.

* `-k, --pagerduty-key <value>` OR `PAGERDUTY_KEY` env var - Your PagerDuty API key. The environment variable will be used, if set, or it can be passed in as an argument using `-k, --pagerduty-key <value>`.
* `-t, --team-ids <value>` OR `PAGERDUTY_TEAM_IDS` env var - Comma separated list of PagerDuty team IDs. Reports will be limited to only include incident for the given team(s).
* `-r, --service-ids <value>` OR `PAGERDUTY_SERVICE_IDS` env var - Comma separated list of PagerDuty service IDs. Reports will be limited to only include incident for the given service(s).
* `-s, --since <value>` - Retrieve incidents created after this date. Must be in the format `2024-01-01T01:00:00`. Note timezone must be UTC.

#### `pdreport list` Additional Options

You may additionally specify the options below.

* `-u, --until [value]` - Retrieve incidents created before this date. Must be in the format `2024-01-01T01:00:00`. Note timezone must be UTC.
* `-f, --filter [value]` - Retrieve only incidents with a title that matches the given filter. Useful for looking at problematic incidents. For example, if the filter is set to `xyz`, it will match on `CPU xyz high`, `xyz title`, `Disk full on xyz`, etc.
* `--custom-details` - Optionally specify a comma-separated list of additional fields to retrieve from the Custom Details of the incident.
  * > ⚠️ NOTE
    >
    > Retrieving custom details require an additional PagerDuty API call for each incident, so it will take some time to complete.
* `--custom-details-regex` - Optionally specify a regex to apply to the value of the Custom Details fields. Will apply to all fields and retrieve the first group.
* `-o, --output-filename [value]` - Filename for the CSV report. By default the file will be named `output.csv` in the current working directory.

#### `pdreport list` Example Usage

1. **Filtering results**

    To list incidents with a title containing `CPUHigh` from September 1st, 2024 through September 15th, 2024:

    ```sh
    pdreport list --since 2024-09-01T00:00:00 --until 2024-09-15T23:59:59 --filter CPUHigh
    ```

2. **Change the output filename**

    To get all incidents in the month of September 2024 and change the name of the output file to incidents-sept-2024.csv:

    ```sh
    pdreport list --since 2024-09-01T00:00:00 --until 2024-09-30T23:59:59 --output-filename incidents-sept-2024.csv
    ```

3. **Specify Team or Service IDs on the command line**

    To specify a set of team IDs or service IDs on the command line:

    ```sh
    pdreport list --since 2024-09-01T00:00:00 --team-ids ABC123,DEF456 --service-ids QWE789,ZXC098
    ```

4. **Retrieve values from Custom Details**

    > ⚠️ NOTE
    >
    > Retrieving custom details requires an additional PagerDuty API call for each incident, so it will take some time to complete these types of requests.

    To list incidents since September 22nd, 2024 and retrieve the `num_firing` and `num_resolved` fields from the Custom Details section of each incident:

    ```sh
    pdreport list --since 2024-09-22T00:00:00 --custom-details num_firing,num_resolved
    ```

5. **Parse values out of Custom Details**

    > ⚠️ NOTE
    >
    > Retrieving custom details requires an additional PagerDuty API call for each incident, so it will take some time to complete these types of requests.

    For this example, assume there is a `firing` field in Custom Details for an incident contains that the following:

    ```text
    - environment = prod
    - location = us-south
    - severity = 3
    ```

    To list incidents since September 22nd, 2024, retrieve the `firing` field from the Custom Details section of each incident, and parse the location (e.g. `us-south`) out of the `firing` field:

    ```sh
    pdreport list --since 2024-09-22T10:00:00 --custom-details firing --custom-details-regex "location = ([a-z\-]*)"
    ```

### `pdreport count`

Count all incidents in a given timeframe, grouped by a given iteration (day, week, or month), and save them to a file. Output will include the incident title, and a column for each iteration and how many times each alert happened during that iteration.

You must minimally specify your PagerDuty API key, team ID(s), and service ID(s), as well as a since date to retrieve incidents. If no iteration length or count is specified, then the counts will be retrieved for one week following the since date.

By default, incident counts will be saved to a file named `output.csv`. For example:

```sh
$ pdreport count -s 2024-09-01T00:00:00

Getting incident counts for 1 week(s) starting on 2024-09-01T00:00:00...

...

✔ Saving incidents to output.csv
```

#### `pdreport count` Required Options

You must minimally specify the options below.

* `-k, --pagerduty-key <value>` OR `PAGERDUTY_KEY` env var - Your PagerDuty API key. The environment variable will be used, if set, or it can be passed in as an argument using `-k, --pagerduty-key <value>`.
* `-t, --team-ids <value>` OR `PAGERDUTY_TEAM_IDS` env var - Comma separated list of PagerDuty team IDs. Reports will be limited to only include incident for the given team(s).
* `-r, --service-ids <value>` OR `PAGERDUTY_SERVICE_IDS` env var - Comma separated list of PagerDuty service IDs. Reports will be limited to only include incident for the given service(s).
* `-s, --since <value>` - Retrieve incidents created after this date. Must be in the format `2024-01-01T01:00:00`. Note timezone must be UTC.
* `-i, --iteration <value>` - Length of time to group incident counts by. Default is "week". Choices are: "day", "week", "month".
* `-c, --iteration-count <number>` - How many iterations to retrieve starting at the given date. Default is 1.

#### `pdreport count` Additional Options

You may additionally specify the options below.

* `-f, --filter [value]` - Retrieve only incidents with a title that matches the given filter. Useful for looking at problematic incidents. For example, if the filter is set to `xyz`, it will match on `CPU xyz high`, `xyz title`, `Disk full on xyz`, etc.
* `-d, --include-dates-filename [value]` - A filename containing a JSON object that specifies dates to be excluded from counts. Useful if you only want to count incidents during a specific period like a release. For an example of the file format, see `examples/exclude-dates.json`. If a given date is in the excluded and included list, it will be excluded.
* `-x, --exclude-dates-filename [value]` - A filename containing a JSON object that specifies dates to be excluded from counts. Useful if you have an outlier event, such as a downstream impacting event, which you do not want to gather counts for. For an example of the file format, see `examples/exclude-dates.json`. If a date is in the excluded and included list, it will be excluded.
* `-o, --output-filename [value]` - Filename for the CSV report. By default the file will be named `output.csv` in the current working directory.

#### `pdreport count` Usage Examples

1. **Counting incidents with different iteration lengths**

    To retrieve counts of incidents per week for 8 weeks since June 1st, 2024:

    ```sh
    pdreport count -s 2024-06-01T00:00:00 -i week -c 8
    ```

    To retrieve counts of incidents per month for 3 months since June 1st, 2024:

    ```sh
    pdreport count -s 2024-06-01T00:00:00 -i month -c 3
    ```

    To retrieve counts of incidents per day for 7 days since September 1st, 2024:

    ```sh
    pdreport count -s 2024-09-01T00:00:00 -i day -c 7
    ```

2. **Exclude incidents from certain dates**

    To retrieve counts of incidents per week for 8 weeks since June 1st, 2024, but exclude counts for given date ranges:

    ```sh
    pdreport count -s 2024-06-01T00:00:00 -i week -c 8 -x examples/exclude-dates.json
    ```

3. **Include incidents from certain dates**

    To retrieve counts of incidents per week for 8 weeks since June 1st, 2024, and only include incidents containing `CPUHigh`:

    ```sh
    pdreport count -s 2024-06-01T00:00:00 -i week -c 8 -f CPUHigh
    ```

4. **Change the output filename**

    To retrieve counts of incidents per day for 7 days since September 1st, 2024, and save the output to `daily-incident-counts-sept-2024.csv`:

    ```sh
    pdreport count -s 2024-09-01T00:00:00 -i day -c 7 -o daily-incident-counts-sept-2024.csv
    ```

## Limitations

* Cannot get more than six months worth of incidents at a time.
* Dates must be given in the format `2024-09-01T00:00:00` and the timezone must be in UTC. Currently no other formats, or timezones are accepted.
* No sorting options are available, but many spreadsheet programs have such capabilities built in.
