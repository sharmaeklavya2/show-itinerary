interface LocTime {
    // Location and time at which the leg of a journey begins or ends.
    // Some of these fields are used to infer the values of other fields if those fields are blank.
    // The ones marked 'internal' must not be supplied in JSON; they will always be inferred.

    // time
    when: string;  // Local time in format "YYYY-MM-DD HH:MM".
    timezone?: string;  // IANA timezone. Inferred from airport, city, state, or country.
    date?: string;  // [internal] Date in locale-specific format. Inferred from `when`.
    time?: string;  // [internal] Time in HH:MM. Inferred from `when`.
    stdTime?: string;  // [internal] Timezone-aware datetime in RFC 9557 (extension of ISO 8601). Inferred from `when` and `timezone`.

    // location
    airport?: string;  // 3-letter IATA code. Is used to infer timezone, city, and country.
    // `city`, `state`, and `country` are renamed using rename.json. E.g., 'Illinois' becomes 'IL'.
    city?: string;  // City name. Is used to infer timezone and country (and sometimes state) if the city is in database.
    state?: string;  // State code, like 'IL'. Can sometimes be used to infer timezone.
    country?: string;  // Country name, like 'USA'. Can often be used to infer timezone.
    point?: string;  // Airport terminal, bus stop name, or precise location in city.
    where?: string;  // Location name. Used to infer city, state, country, or airport if found in database.
    tzPlace?: string;  // [currently not implemented] Place to use to infer timezone. E.g., Lemont (a suburb of Chicago in Illinois, USA) is not in database, so it can't be used to detect timezone. Entering 'Chicago' here allows detecting timezone.
}

interface Ride {
    // Leg of a journey.
    type?: string;  // Type of ride. Can be 'flight', 'bus', 'train', 'metro', 'car', 'taxi', or something else.
    carrier?: string;  // Name of company operating the ride. 2-character IATA code if type='flight'.
    number?: string;  // Number identifying the ride.
    from: LocTime;
    to: LocTime;
    duration?: string;  // [internal] Ride duration. Inferred from `from` and `to`.
    trackUrl?: string;  // Tracking URL. Can be inferred for type='flight' if `carrier` and `number` are present.
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

interface RenameTable {
    // For each level, maps alternative names to the names used in the database.
    city?: Record<string, string>;
    state?: Record<string, string>;
    country?: Record<string, string>;
}
