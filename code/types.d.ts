export interface LocTime {
    where: string;
    when: string;
    point?: string;
    timezone?: string;
}

export interface Ride {
    type: string;
    carrier?: string;
    number?: string;
    from: LocTime;
    to: LocTime;
    duration?: string;
}

type Trip = Ride[];

interface AirportInfo {
    iata: string;
    city: string;
    country: string;
    tz: string,
    icao: string,
    name: string;
}
