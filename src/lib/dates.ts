import * as _ from "lodash";
import * as fs from "fs";

export function isFirstDayOfMonth(date: Date) {
    var test = new Date(date.getTime()),
        month = test.getMonth();

    test.setDate(test.getDate() - 1);
    return test.getMonth() !== month;
}

export function isDateInTimeframes(givenDate: Date, datesFilename: string): boolean {
    let result = false;

    const datesFile: any = fs.readFileSync(datesFilename);
    const dates: any = JSON.parse(datesFile);

    _.each(dates, (datesWindow: any) => {
        const startDate = new Date(datesWindow.start);
        const endDate = new Date(datesWindow.end);

        if (isDateWithinRange(givenDate, startDate, endDate)
            || datesOnSameDay(givenDate, startDate)
            || datesOnSameDay(givenDate, endDate)
        ) {
            result = true;
            return false;
        }
    });

    return result;
}

export function isDateWithinRange(givenDate: Date, startDate: Date, endDate: Date): boolean {
    return givenDate >= startDate && givenDate < endDate;
}

export function datesOnSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}