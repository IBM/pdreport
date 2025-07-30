// test/commands/incidents/count.test.ts

import fs from "fs";
import path from "path";
import * as pagerduty from "../../../src/lib/pagerduty";
import { count } from "../../../src/commands/incidents/count";
import { mocked } from "jest-mock";
import * as os from "os";

jest.mock("../../../src/lib/pagerduty", () => ({
  getIncidentsInTimeframeWithOffset: jest.fn(),
}));

describe("count command", () => {
  const mockedGetIncidentsInTimeframeWithOffset = mocked(
    pagerduty.getIncidentsInTimeframeWithOffset
  );
  let tempOutputFile: string;

  beforeEach(() => {
    tempOutputFile = path.join(os.tmpdir(), `count-output-${Date.now()}.csv`);
    mockedGetIncidentsInTimeframeWithOffset.mockReset();
  });

  afterEach(() => {
    if (fs.existsSync(tempOutputFile)) {
      fs.unlinkSync(tempOutputFile);
    }
  });

  test("Daily iteration: Confirm iteration increments by 1 day, CSV output structure", async () => {
    mockedGetIncidentsInTimeframeWithOffset
      // Day 1
      .mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [
            { title: "Incident Day1 #1" },
            { title: "Incident Day1 #2" },
          ],
          more: false,
        }),
      })
      // Day 2
      .mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [{ title: "Incident Day2 #1" }],
          more: false,
        }),
      })
      // Day 3
      .mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [
            { title: "Incident Day3 #1" },
            { title: "Incident Day3 #2" },
            { title: "Incident Day3 #3" },
          ],
          more: false,
        }),
      });

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-01T00:00:00Z",
      iteration: "day",
      iterationCount: 3,
      outputFilename: tempOutputFile,
    };

    await count(options);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    // CSV header check
    expect(output).toContain("Incident Title");
    expect(output).toContain("day starting 2025-01-01");
    expect(output).toContain("day starting 2025-01-02");
    expect(output).toContain("day starting 2025-01-03");

    // day 1 => 2 incidents
    expect(output).toContain("Incident Day1 #1");
    expect(output).toContain("Incident Day1 #2");

    // day 2 => 1 incident
    expect(output).toContain("Incident Day2 #1");

    // day 3 => 3 incidents
    expect(output).toContain("Incident Day3 #1");
    expect(output).toContain("Incident Day3 #2");
    expect(output).toContain("Incident Day3 #3");
  });

  test("Weekly iteration: Shortened date range so we only have to mock fewer daily calls", async () => {
    for (let i = 0; i < 14; i++) {
      mockedGetIncidentsInTimeframeWithOffset.mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [{ title: `Incident Wk day ${i}` }],
          more: false,
        }),
      });
    }

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-29T00:00:00Z",
      iteration: "week",
      iterationCount: 2,
      outputFilename: tempOutputFile,
    };

    await count(options);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    // columns => "Incident Title,week starting 2025-01-29,week starting 2025-02-05"
    expect(output).toContain("Incident Title,week starting 2025-01-29,week starting 2025-02-05");
    expect(output).toContain("Incident Wk day 0");
    expect(output).toContain("Incident Wk day 6");
    expect(output).toContain("Incident Wk day 13");
  });

  test("Monthly iteration: Shortened date range to minimize daily calls, but code lumps 2nd iteration on Feb 2", async () => {
    /**
     * Because of how isFirstDayOfMonth() works, the code lumps 
     * iteration #2 on 2025-02-02, not 2025-02-01 or 2025-03-01.
     * We'll provide 30 mocks so we don't run out:
     */
    for (let i = 0; i < 30; i++) {
      mockedGetIncidentsInTimeframeWithOffset.mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [{ title: `Incident #${i}` }],
          more: false,
        }),
      });
    }

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-31T00:00:00Z",
      iteration: "month",
      iterationCount: 2,
      outputFilename: tempOutputFile,
    };

    await count(options);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    // The code’s actual output lumps iteration #1 = Jan 31 + Feb 1,
    // then iteration #2 starts on 2025-02-02. 
    expect(output).toContain("Incident Title,month starting 2025-01-31,month starting 2025-02-02");
    expect(output).toContain("Incident #0");  // Jan 31 
    expect(output).toContain("Incident #1");  // Feb 1
    expect(output).toContain("Incident #29"); // The day it checks March 1 boundary
  });

  test("Inclusion/Exclusion Date Files: skip excluded date, include only included date", async () => {
    const excludeDatesFile = path.join(os.tmpdir(), `exclude-${Date.now()}.json`);
    const includeDatesFile = path.join(os.tmpdir(), `include-${Date.now()}.json`);

    try {
      fs.writeFileSync(
        excludeDatesFile,
        JSON.stringify([
          {
            start: "2025-01-02T00:00:00Z",
            end: "2025-01-02T23:59:59Z",
          },
        ])
      );

      fs.writeFileSync(
        includeDatesFile,
        JSON.stringify([
          {
            start: "2025-01-01T00:00:00Z",
            end: "2025-01-01T23:59:59Z",
          },
        ])
      );

      // iterationCount=3 => days: 2025-01-01, 2025-01-02, 2025-01-03
      mockedGetIncidentsInTimeframeWithOffset.mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [{ title: "Day1IncidentA" }, { title: "Day1IncidentB" }],
          more: false,
        }),
      });
      mockedGetIncidentsInTimeframeWithOffset.mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [{ title: "Day2IncidentA" }, { title: "Day2IncidentB" }],
          more: false,
        }),
      });
      mockedGetIncidentsInTimeframeWithOffset.mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [{ title: "Day3IncidentA" }],
          more: false,
        }),
      });

      const options = {
        pagerdutyKey: "test-key",
        serviceIds: "serviceA",
        teamIds: "teamA",
        since: "2025-01-01T00:00:00Z",
        iteration: "day",
        iterationCount: 3,
        outputFilename: tempOutputFile,
        excludeDatesFilename: excludeDatesFile,
        includeDatesFilename: includeDatesFile,
      };

      await count(options);

      const output = fs.readFileSync(tempOutputFile, "utf-8");
      // Day 1 => in the include file => keep
      expect(output).toContain("Day1IncidentA");
      expect(output).toContain("Day1IncidentB");
      // Day 2 => excluded => skip
      expect(output).not.toContain("Day2IncidentA");
      expect(output).not.toContain("Day2IncidentB");
      // Day 3 => not excluded, but not in the include list => skip
      expect(output).not.toContain("Day3IncidentA");
    } finally {
      if (fs.existsSync(excludeDatesFile)) fs.unlinkSync(excludeDatesFile);
      if (fs.existsSync(includeDatesFile)) fs.unlinkSync(includeDatesFile);
    }
  });

  test("Filtering by Title: only count incidents matching filter", async () => {
    mockedGetIncidentsInTimeframeWithOffset.mockResolvedValue({
      body: JSON.stringify({
        incidents: [
          { title: "Critical Database Error" },
          { title: "Minor Network Alert" },
        ],
        more: false,
      }),
    });

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-10T00:00:00Z",
      iteration: "day",
      iterationCount: 1,
      outputFilename: tempOutputFile,
      filter: "Database",
    };

    await count(options);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    expect(output).toContain("Critical Database Error");
    expect(output).not.toContain("Minor Network Alert");
  });

  test("Offset Handling: Large sets of incidents", async () => {
    for (let i = 0; i < 100; i++) {
      mockedGetIncidentsInTimeframeWithOffset.mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [{ title: `BigIncident #${i}` }],
          more: true,
        }),
      });
    }
    mockedGetIncidentsInTimeframeWithOffset.mockResolvedValueOnce({
      body: JSON.stringify({
        incidents: [],
        more: false,
      }),
    });

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-10T00:00:00Z",
      iteration: "day",
      iterationCount: 1,
      outputFilename: tempOutputFile,
    };

    await count(options);
    expect(mockedGetIncidentsInTimeframeWithOffset).toHaveBeenCalledTimes(101);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    expect(output).toContain("BigIncident #0");
    expect(output).toContain("BigIncident #99");
  });
});
