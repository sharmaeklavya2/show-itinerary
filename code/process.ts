import airports from "../airports.json" with { type: "json" };
import places from "../places.json" with { type: "json" };
import countries from "../countries.json" with { type: "json" };
import renames from "../rename.json" with { type: "json" };

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

const PLACE_LEVELS = ['city', 'state', 'country'] as const;
type PlaceLevel = typeof PLACE_LEVELS[number];

function makeRenameMaps(): Record<PlaceLevel, Map<string, string>> {
    const renameMaps = {} as Record<PlaceLevel, Map<string, string>>;
    for(const level of PLACE_LEVELS) {
        const levelMap = new Map<string, string>(Object.entries(renames[level] ?? {}));
        for(const [oldName, newName] of levelMap) {
            if(levelMap.has(newName)) {
                throw new Error(`rename.json: ${level} ${oldName} is renamed to ${newName}, which is itself renamed.`);
            }
        }
        renameMaps[level] = levelMap;
    }
    return renameMaps;
}
const renameMaps = makeRenameMaps();

function rename(level: PlaceLevel, name: string): string {
    return renameMaps[level].get(name) ?? name;
}

const WHEN_REGEX = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

function strToZdt(s: string, tz: string): Temporal.ZonedDateTime {
    if(typeof s !== 'string') {
        throw new Error('"when" is missing or is not a string.');
    }
    const match = WHEN_REGEX.exec(s);
    if(match === null) {
        throw new Error(`"when" is "${s}", but it must have format "YYYY-MM-DD HH:MM".`);
    }
    const [year, month, day, hour, minute] = match.slice(1).map(Number);
    let pdt: Temporal.PlainDateTime;
    try {
        pdt = Temporal.PlainDateTime.from({year, month, day, hour, minute}, {'overflow': 'reject'});
    }
    catch(e) {
        throw new Error(`"${s}" is not a valid date and time.`, {cause: e});
    }
    let zdt: Temporal.ZonedDateTime;
    try {
        zdt = pdt.toZonedDateTime(tz, {'disambiguation': 'earlier'});
    }
    catch(e) {
        throw new Error(`"${tz}" is not a valid IANA timezone.`, {cause: e});
    }
    if(!zdt.toPlainDateTime().equals(pdt)) {
        throw new Error(`${s} does not exist in timezone ${tz}, since clocks skip forward at that time`
            + ' (e.g., when daylight saving time starts).');
    }
    if(!zdt.equals(pdt.toZonedDateTime(tz, {'disambiguation': 'later'}))) {
        throw new Error(`${s} is ambiguous in timezone ${tz}, since clocks go back at that time and it occurs twice`
            + ' (e.g., when daylight saving time ends).');
    }
    return zdt;
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

function locTimeDt(locTime: LocTime, label: string): Temporal.ZonedDateTime {
    let zdt: Temporal.ZonedDateTime;
    try {
        zdt = strToZdt(locTime.when, locTime.timezone!);
    }
    catch(e) {
        const msg = (e instanceof Error) ? e.message : String(e);
        throw new Error(`${label}: ${msg}`, {cause: e});
    }
    locTime.date = zdt.toPlainDate().toLocaleString('en-GB',
        {day: "numeric", month: "short", year: "numeric", weekday: "short"});
    locTime.time = timeToStr(zdt.toPlainTime());
    locTime.stdTime = zdt.toString({timeZoneName: 'never'});
    return zdt;
}

function computeDurations(trip: Trip): void {
    let prevEndZdt: Temporal.ZonedDateTime | undefined = undefined;
    let prevTo: LocTime | undefined = undefined;
    const origTrip = Array.from(trip);
    trip.length = 0;
    for(const [i, ride] of origTrip.entries()) {
        if(ride.from.timezone === undefined) {
            throw new Error('timezone missing in ' + JSON.stringify(ride.from));
        }
        if(ride.to.timezone === undefined) {
            throw new Error('timezone missing in ' + JSON.stringify(ride.to));
        }
        const zdt1 = locTimeDt(ride.from, `trip[${i}].from`);
        const zdt2 = locTimeDt(ride.to, `trip[${i}].to`);
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

    for(const level of PLACE_LEVELS) {
        const name = locTime[level];
        if(name !== undefined) {
            locTime[level] = rename(level, name);
        }
    }

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
        const airportCity = rename('city', airportInfo.city);
        if(locTime.city === undefined) {
            locTime.city = airportCity;
        }
        else if(locTime.city !== airportCity) {
            throw new Error(`city is ${locTime.city}, but airport ${locTime.airport} has city ${airportCity}.`);
        }
        const airportCountry = rename('country', airportInfo.country);
        if(locTime.country === undefined) {
            locTime.country = airportCountry;
        }
        else if(locTime.country !== airportCountry) {
            throw new Error(`country is ${locTime.country}, but airport ${locTime.airport} has country ${airportCountry}.`);
        }
    }

    let placeInfo;
    const parts = [locTime.city, locTime.state, locTime.country].filter(notUndef);
    for(let i=0; i < parts.length && placeInfo === undefined; ++i) {
        const key = parts.slice(i, parts.length).join(', ');
        placeInfo = placeMap.get(key);
    }
    if(placeInfo === undefined && locTime.where !== undefined) {
        // `where` can be a city, state, or country, so try renaming it as each of these.
        const where = locTime.where;
        for(const level of PLACE_LEVELS) {
            placeInfo = placeMap.get(rename(level, where));
            if(placeInfo !== undefined) {
                break;
            }
        }
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

    if([locTime.where, locTime.airport, locTime.city, locTime.state, locTime.country].every(x => x === undefined)) {
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
    computeDurations(trip);  // validates `when`, so it must run before getTrackingUrls
    getTrackingUrls(trip);
}
