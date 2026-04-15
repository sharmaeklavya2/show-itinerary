interface AirportInfo {
    iata: string;
    city: string;
    country: string;
    tz: string;
    icao: string;
    name: string;
}

declare module "airports.json" {
    const airports: AirportInfo[];
    export default airports;
}

declare module "tzMap.json" {
    const tzMap: Record<string, string>;
    export default tzMap;
}

