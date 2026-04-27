import airports from "airports.json" with { type: "json" };
import places from "places.json" with { type: "json" };
import countries from "countries.json" with { type: "json" };

const iataToAirportInfo = new Map<string, AirportInfo>(airports.map(x => [x.iata, x]));

const placeMap = new Map<string, PlaceInfo>();

function notUndef<T>(x: T | undefined): boolean {
    return x !== undefined;
}

function fillPlaceMap(): void {
    for(const placeInfo of places) {
        if(placeInfo.city !== undefined) {
            if(placeInfo.state !== undefined) {
                placeMap.getOrInsert([placeInfo.city, placeInfo.state, placeInfo.country].join(', '), placeInfo);
                placeMap.getOrInsert([placeInfo.city, placeInfo.state].join(', '), placeInfo);
            }
            placeMap.getOrInsert([placeInfo.city, placeInfo.country].join(', '), placeInfo);
            placeMap.getOrInsert(placeInfo.city, placeInfo);
        }
        else if(placeInfo.state !== undefined) {
            const stateInfo = {'state': placeInfo.state, 'country': placeInfo.country, 'tz': placeInfo.tz};
            placeMap.getOrInsert([placeInfo.state, placeInfo.country].join(', '), stateInfo);
            placeMap.getOrInsert(placeInfo.state, stateInfo);
        }
    }
    for(const country of countries) {
        if(country.city !== undefined) {
            placeMap.getOrInsert([country.city, country.country].join(', '), country);
            placeMap.getOrInsert(country.city, country);
        }
        placeMap.getOrInsert(country.country, {'country': country.country, 'tz': country.tz});
    }
}
fillPlaceMap();

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
    let dayStr = '';
    if(d.days > 1) {
        dayStr = String(d.days) + ' days, ';
    }
    else if(d.days === 1) {
        dayStr = '1 day, ';
    }
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

function processLoc(locTime: LocTime): void {
    /* possibilities:
     * air travel: airport code decides tz
     * travel to/from major city: city decides tz
     * travel to/from non-major city: state decides tz
     * travel to/from non-city area (e.g., locality): city/state must be specified, and that decides tz
     */
    const origLocTime = JSON.stringify(locTime);

    let airportInfo;
    if(locTime.airport !== undefined) {
        airportInfo = iataToAirportInfo.get(locTime.airport);
    }
    else if(locTime.where !== undefined) {
        airportInfo = iataToAirportInfo.get(locTime.where);
        if(airportInfo !== undefined) {
            locTime.airport = locTime.where;
        }
    }
    if(airportInfo !== undefined) {
        if(locTime.city === undefined) {
            locTime.city = airportInfo.city;
        }
        else if(locTime.city !== airportInfo.city) {
            throw new Error(`city is ${locTime.city}, but airport ${locTime.airport} has city ${airportInfo.city}.`);
        }
    }

    let placeInfo;
    const parts = [locTime.city, locTime.state, locTime.country].filter(notUndef);
    for(let i=0; i < parts.length; ++i) {
        const key = parts.slice(i, parts.length).join(', ');
        placeInfo = placeMap.get(key);
    }
    if(placeInfo === undefined && locTime.where !== undefined) {
        placeInfo = placeMap.get(locTime.where);
    }
    if(placeInfo !== undefined) {
        if(placeInfo.city !== undefined && locTime.city === undefined) {
            locTime.city = placeInfo.city;
        }
        if(placeInfo.state !== undefined && locTime.state === undefined) {
            locTime.state = placeInfo.state;
        }
        if(locTime.country === undefined) {
            locTime.country = placeInfo.country;
        }
    }

    // Set TZ
    if(locTime.timezone === undefined) {
        if(airportInfo !== undefined) {
            locTime.timezone = airportInfo.tz;
        }
        else if(placeInfo !== undefined) {
            locTime.timezone = placeInfo.tz;
        }
        else {
            throw new Error(`Could not determine timezone for ${origLocTime}.`);
        }
    }

    // set loctype
    if(airportInfo !== undefined) {
        locTime.locType = 'airport';
    }
    else if(placeInfo !== undefined) {
        if(placeInfo.city !== undefined) {
            locTime.locType = 'city';
        }
        else if(placeInfo.state !== undefined) {
            locTime.locType = 'state';
        }
        else {
            locTime.locType = 'country';
        }
    }
    else {
        throw new Error(`No place label for ${origLocTime}.`);
    }
}

function processLocsInTrip(trip: Trip): void {
    for(const ride of trip) {
        processLoc(ride.from);
        processLoc(ride.to);
    }
}

function getTrackingUrls(trip: Trip): void {
    for(const ride of trip) {
        if(ride.type === 'flight' && ride.carrier !== undefined && ride.number !== undefined) {
            const [date, _] = ride.from.when.split(' ');
            const [year, month, day] = date.split('-');
            ride.trackUrl = ('https://www.flightstats.com/v2/flight-tracker/'
                + `${ride.carrier}/${ride.number}?year=${year}&month=${month}&date=${day}`);
        }
    }
}

export default function processTrip(trip: Trip): void {
    processLocsInTrip(trip);
    getTrackingUrls(trip);
    computeDurations(trip);
}
