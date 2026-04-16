import type {Trip, Ride, LocTime, AirportInfo} from "./types";
import airports from "airports.json" with { type: "json" };
import tzMap from "tzMap.json" with { type: "json" };

const iataToAirportInfo = new Map<string, AirportInfo>(airports.map(x => [x.iata, x]));

function strToZdt(s: string, tz: string): Temporal.ZonedDateTime {
    const [date, time] = s.split(' ');
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    return Temporal.ZonedDateTime.from(
        {'year': year, 'month': month, 'day': day, 'hour': hour, 'minute': minute, timeZone: tz},
        {'disambiguation': 'reject', 'overflow': 'reject'});
}

function durationToStr(d: Temporal.Duration): string {
    d = d.round({'largestUnit': 'days', 'smallestUnit': 'minutes'});
    const hh = String(d.hours).padStart(2, '0');
    const mm = String(d.minutes).padStart(2, '0');
    const dayStr = (d.days > 0) ? (String(d.days) + ' days, ') : '';
    return `${dayStr}${hh}:${mm}`;
}

function timeToStr(t: Temporal.PlainTime): string {
    const hh = String(t.hour).padStart(2, '0');
    const mm = String(t.minute).padStart(2, '0');
    return hh + ':' + mm;
}

function locTimeDt(locTime: LocTime): Temporal.ZonedDateTime {
    const zdt = strToZdt(locTime.when, locTime.timezone!);
    locTime.date = zdt.toPlainDate().toLocaleString('en-GB',
        {day: "numeric", month: "short", year: "numeric", weekday: "short"});
    locTime.time = timeToStr(zdt.toPlainTime());
    locTime.stdTime = zdt.toString();
    return zdt;
}

function computeDurations(trip: Trip): void {
    let prevEndZdt: Temporal.ZonedDateTime | undefined = undefined;
    let prevTo: LocTime | undefined = undefined;
    const origTrip = Array.from(trip);
    trip.length = 0;
    for(const ride of origTrip) {
        if(ride.from.timezone === undefined) {
            throw new Error('timezone missing in ' + JSON.stringify(ride.from));
        }
        if(ride.to.timezone === undefined) {
            throw new Error('timezone missing in ' + JSON.stringify(ride.to));
        }
        const zdt1 = locTimeDt(ride.from);
        const zdt2 = locTimeDt(ride.to);
        if(prevTo !== undefined && ride.type !== 'layover') {
            const layover: Ride = {'type': 'layover', 'from': prevTo, 'to': ride.from};
            const d = zdt1.since(prevEndZdt!);
            const durStr = durationToStr(d);
            layover.duration = durStr;
            trip.push(layover);
        }
        const d = zdt2.since(zdt1);
        const durStr = durationToStr(d);
        ride.duration = durStr;
        trip.push(ride);
        if(ride.type === 'layover') {
            prevEndZdt = undefined;
            prevTo = undefined;
        }
        else {
            prevEndZdt = zdt2;
            prevTo = ride.to;
        }
    }
}

function inferTzForLocTime(locTime: LocTime): void {
    if(locTime.timezone === undefined) {
        const airportInfo = iataToAirportInfo.get(locTime.where);
        if(airportInfo !== undefined) {
            locTime.timezone = airportInfo.tz;
        }
        else {
            locTime.timezone = tzMap[locTime.where];
        }
    }
}

function inferTzForTrip(trip: Trip): void {
    for(const ride of trip) {
        inferTzForLocTime(ride.from);
        inferTzForLocTime(ride.to);
    }
}

export default function processTrip(trip: Trip): void {
    inferTzForTrip(trip);
    computeDurations(trip);
}
