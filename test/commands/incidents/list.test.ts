// test/commands/incidents/list.test.ts

import fs from "fs";
import path from "path";
import * as pagerduty from "../../../src/lib/pagerduty";
import { list } from "../../../src/commands/incidents/list";
import { mocked } from "jest-mock";
import * as os from "os";

jest.mock("../../../src/lib/pagerduty", () => ({
  // Mock only the relevant methods used by list.ts
  getIncidents: jest.fn(),
  getCustomDetailsForIncident: jest.fn(),
}));

describe("list command", () => {
  const mockedGetIncidents = mocked(pagerduty.getIncidents);
  const mockedGetCustomDetailsForIncident = mocked(pagerduty.getCustomDetailsForIncident);

  let tempOutputFile: string;

  beforeEach(() => {
    tempOutputFile = path.join(os.tmpdir(), `test-output-${Date.now()}.csv`);
    mockedGetIncidents.mockReset();
    mockedGetCustomDetailsForIncident.mockReset();
  });

  afterEach(() => {
    if (fs.existsSync(tempOutputFile)) {
      fs.unlinkSync(tempOutputFile);
    }
  });

  test("Basic Functionality: no optional flags produces expected CSV output", async () => {
    mockedGetIncidents.mockResolvedValueOnce({
      body: JSON.stringify({
        incidents: [
          {
            id: "ABC123",
            title: "Incident 1 Title",
            urgency: "high",
            created_at: "2025-01-01T00:00:00Z",
            last_status_change_at: "2025-01-01T01:00:00Z",
            html_url: "http://example.com/incident-1",
          },
        ],
        more: false,
      }),
    });

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-01T00:00:00Z",
      until: "2025-01-02T00:00:00Z",
      outputFilename: tempOutputFile,
      filter: undefined,
      customDetails: undefined,
      customDetailsRegex: undefined,
    };

    await list(options);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    expect(output).toContain("title,urgency,created_at,last_status_change_at,html_url");
    expect(output).toContain("Incident 1 Title");
    expect(output).toContain("high");
    expect(output).toContain("2025-01-01T00:00:00Z");
    expect(output).toContain("2025-01-01T01:00:00Z");
    expect(output).toContain("http://example.com/incident-1");

    expect(mockedGetIncidents).toHaveBeenCalledTimes(1);
  });

  test("Filtering by Title: only include incidents that match filter", async () => {
    mockedGetIncidents.mockResolvedValue({
      body: JSON.stringify({
        incidents: [
          {
            id: "XYZ001",
            title: "Database Error: Connection Refused",
            urgency: "high",
            created_at: "2025-01-02T00:00:00Z",
            last_status_change_at: "2025-01-02T01:00:00Z",
            html_url: "http://example.com/xyz",
          },
          {
            id: "XYZ002",
            title: "Network Latency Alert",
            urgency: "low",
            created_at: "2025-01-02T02:00:00Z",
            last_status_change_at: "2025-01-02T03:00:00Z",
            html_url: "http://example.com/xyz2",
          },
        ],
        more: false,
      }),
    });

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-02T00:00:00Z",
      until: "2025-01-03T00:00:00Z",
      outputFilename: tempOutputFile,
      filter: "Connection",
      customDetails: undefined,
      customDetailsRegex: undefined,
    };

    await list(options);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    // Should only contain "Database Error: Connection Refused"
    expect(output).toContain("Database Error: Connection Refused");
    expect(output).not.toContain("Network Latency Alert");
  });

  test("Custom Details: uses --custom-details (no regex)", async () => {
    // Return a single incident
    mockedGetIncidents.mockResolvedValue({
      body: JSON.stringify({
        incidents: [
          {
            id: "INC001",
            title: "Incident with Details",
            urgency: "high",
            created_at: "2025-01-03T00:00:00Z",
            last_status_change_at: "2025-01-03T01:00:00Z",
            html_url: "http://example.com/inc001",
          },
        ],
        more: false,
      }),
    });
    // Return some custom details
    mockedGetCustomDetailsForIncident.mockResolvedValue({
      impactedHost: "server-1.example.com",
      rootCause: "Overloaded CPU",
      logs: "Line1\nLine2",
    });

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-03T00:00:00Z",
      until: "2025-01-04T00:00:00Z",
      outputFilename: tempOutputFile,
      customDetails: "impactedHost,rootCause,logs",
      // Remove the regex so it doesn’t force 'unknown'
      customDetailsRegex: undefined,
    };

    await list(options);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    // CSV header check
    expect(output).toMatch(
      /title,urgency,created_at,last_status_change_at,html_url,impactedHost,rootCause,logs/
    );
    // Data checks
    expect(output).toContain("Incident with Details");
    expect(output).toContain("server-1.example.com");
    // Since no regex transformation, we see the entire root cause
    expect(output).toContain("Overloaded CPU");
    // Newlines in logs are replaced with no line breaks
    expect(output).toContain("Line1Line2");
  });

  test("Error Handling: gracefully logs & returns instead of throwing", async () => {
    // Force the PD call to fail
    mockedGetIncidents.mockRejectedValue(new Error("PD API error"));

    const options = {
      pagerdutyKey: "test-key",
      serviceIds: "serviceA",
      teamIds: "teamA",
      since: "2025-01-04T00:00:00Z",
      until: "2025-01-05T00:00:00Z",
      outputFilename: tempOutputFile,
    };

    // Since list() catches the error, it won't throw; we just confirm it returns gracefully
    const result = await list(options);
    expect(result).toBeUndefined(); 
    // At this point, you can also spy on console.log or the spinner to confirm it reported the error.
  });

  test("Large Offset: Simulate retrieving more than 10k incidents", async () => {
    // Return 'more: true' many times
    for (let i = 0; i < 100; i++) {
      mockedGetIncidents.mockResolvedValueOnce({
        body: JSON.stringify({
          incidents: [
            {
              id: `INC_${i}`,
              title: `Incident #${i}`,
              urgency: "low",
              created_at: "2025-01-10T00:00:00Z",
              last_status_change_at: "2025-01-10T01:00:00Z",
              html_url: "http://example.com",
            },
          ],
          more: true,
        }),
      });
    }

    // On 101st call (offset = 10000), we'll return an empty set with more=false
    mockedGetIncidents.mockResolvedValueOnce({
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
      until: "2025-01-11T00:00:00Z",
      outputFilename: tempOutputFile,
    };

    await list(options);

    // We expect ~101 calls
    expect(mockedGetIncidents).toHaveBeenCalledTimes(101);

    const output = fs.readFileSync(tempOutputFile, "utf-8");
    // Just check if we have incidents from the first 100 calls
    expect(output).toContain("Incident #0");
    expect(output).toContain("Incident #99");
  });
});
