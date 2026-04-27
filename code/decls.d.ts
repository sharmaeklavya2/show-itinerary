interface LocTime {
    when: string;
    timezone?: string;
    date?: string;
    time?: string;
    stdTime?: string;  // time in RFC 9557 format (extension of ISO 8601)

    where?: string;
    point?: string;
    city?: string;
    state?: string;
    country?: string;
    airport?: string;
    locType?: 'airport' | 'city' | 'state' | 'country';
}

interface Ride {
    type?: string;
    carrier?: string;
    number?: string;
    from: LocTime;
    to: LocTime;
    duration?: string;
    trackUrl?: string;
    bookingInfo?: Record<string, string>;
}

type Trip = Ride[];

interface AirportInfo {
    iata: string;
    city: string;
    country: string;
    tz: string;
    icao: string;
    name: string;
}

interface PlaceInfo {
    city?: string;
    state?: string;
    country: string;
    tz: string;
}

declare module "airports.json" {
    const airports: AirportInfo[];
    export default airports;
}

declare module "places.json" {
    const places: PlaceInfo[];
    export default places;
}
declare module "countries.json" {
    const countries: PlaceInfo[];
    export default countries;
}
