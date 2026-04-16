import airports from "airports.json" with { type: "json" };
import tzMap from "tzMap.json" with { type: "json" };
const iataToAirportInfo = new Map(airports.map(x => [x.iata, x]));
function strToZdt(s, tz) {
    const [date, time] = s.split(' ');
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    return Temporal.ZonedDateTime.from({ 'year': year, 'month': month, 'day': day, 'hour': hour, 'minute': minute, timeZone: tz }, { 'disambiguation': 'reject', 'overflow': 'reject' });
}
function durationToStr(d) {
    d = d.round({ 'largestUnit': 'days', 'smallestUnit': 'minutes' });
    const hh = String(d.hours).padStart(2, '0');
    const mm = String(d.minutes).padStart(2, '0');
    let dayStr = '';
    if (d.days > 1) {
        dayStr = String(d.days) + ' days, ';
    }
    else if (d.days === 1) {
        dayStr = '1 day, ';
    }
    return `${dayStr}${hh}:${mm}`;
}
function timeToStr(t) {
    const hh = String(t.hour).padStart(2, '0');
    const mm = String(t.minute).padStart(2, '0');
    return hh + ':' + mm;
}
function locTimeDt(locTime) {
    const zdt = strToZdt(locTime.when, locTime.timezone);
    locTime.date = zdt.toPlainDate().toLocaleString('en-GB', { day: "numeric", month: "short", year: "numeric", weekday: "short" });
    locTime.time = timeToStr(zdt.toPlainTime());
    locTime.stdTime = zdt.toString();
    return zdt;
}
function computeDurations(trip) {
    let prevEndZdt = undefined;
    let prevTo = undefined;
    const origTrip = Array.from(trip);
    trip.length = 0;
    for (const ride of origTrip) {
        if (ride.from.timezone === undefined) {
            throw new Error('timezone missing in ' + JSON.stringify(ride.from));
        }
        if (ride.to.timezone === undefined) {
            throw new Error('timezone missing in ' + JSON.stringify(ride.to));
        }
        const zdt1 = locTimeDt(ride.from);
        const zdt2 = locTimeDt(ride.to);
        if (prevTo !== undefined && ride.type !== 'layover') {
            const layover = { 'type': 'layover', 'from': prevTo, 'to': ride.from };
            const d = zdt1.since(prevEndZdt);
            const durStr = durationToStr(d);
            layover.duration = durStr;
            trip.push(layover);
        }
        const d = zdt2.since(zdt1);
        const durStr = durationToStr(d);
        ride.duration = durStr;
        trip.push(ride);
        if (ride.type === 'layover') {
            prevEndZdt = undefined;
            prevTo = undefined;
        }
        else {
            prevEndZdt = zdt2;
            prevTo = ride.to;
        }
    }
}
function inferTzForLocTime(locTime) {
    if (locTime.timezone === undefined) {
        const airportInfo = iataToAirportInfo.get(locTime.where);
        if (airportInfo !== undefined) {
            locTime.timezone = airportInfo.tz;
        }
        else {
            locTime.timezone = tzMap[locTime.where];
        }
    }
}
function inferTzForTrip(trip) {
    for (const ride of trip) {
        inferTzForLocTime(ride.from);
        inferTzForLocTime(ride.to);
    }
}
function getTrackingUrls(trip) {
    for (const ride of trip) {
        if (ride.type === 'flight' && ride.carrier !== undefined && ride.number !== undefined) {
            const [date, _] = ride.from.when.split(' ');
            const [year, month, day] = date.split('-');
            ride.trackUrl = ('https://www.flightstats.com/v2/flight-tracker/'
                + `${ride.carrier}/${ride.number}?year=${year}&month=${month}&date=${day}`);
        }
    }
}
export default function processTrip(trip) {
    inferTzForTrip(trip);
    getTrackingUrls(trip);
    computeDurations(trip);
}
//# sourceMappingURL=process.js.map