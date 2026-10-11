function getElem(tagName: string, options?: {parent?: Element, text?: string,
        attrs?: Record<string, string>, classes?: string[]}): Element {
    const elem = document.createElement(tagName);
    if(options !== undefined) {
        if(options.text !== undefined) {
            elem.textContent = options.text;
        }
        if(options.attrs !== undefined) {
            for(const [k, v] of Object.entries(options.attrs)) {
                elem.setAttribute(k, v);
            }
        }
        if(options.classes !== undefined) {
            for(const c of options.classes) {
                elem.classList.add(c);
            }
        }
        if(options.parent !== undefined) {
            options.parent.appendChild(elem);
        }
    }
    return elem;
}

interface ShownLevels {
    // Which parts of a place to show in the location line.
    city: boolean;
    state: boolean;
    country: boolean;
}

function getShownLevels(trip: Trip): ShownLevels {
    // A level is shown if it varies across the trip, or if a higher level is shown.
    // States are compared together with their country, and cities together with their state and country.
    const countries = new Set<string>();
    const states = new Set<string>();
    const cities = new Set<string>();
    for(const ride of trip) {
        if(ride.type === 'layover') {
            continue;
        }
        for(const locTime of [ride.from, ride.to]) {
            if(locTime.country !== undefined) {
                countries.add(locTime.country);
            }
            if(locTime.state !== undefined) {
                states.add(JSON.stringify([locTime.country, locTime.state]));
            }
            if(locTime.city !== undefined) {
                cities.add(JSON.stringify([locTime.country, locTime.state, locTime.city]));
            }
        }
    }
    const country = countries.size > 1;
    const state = country || states.size > 1;
    const city = state || cities.size > 1;
    return {city, state, country};
}

function renderLocTime(locTime: LocTime, parent: Element, shownLevels: ShownLevels): Element {
    const label = locTime.where ?? locTime.airport ?? locTime.city ?? locTime.state ?? locTime.country;
    if(label === undefined) {
        throw new Error('Missing place label.');
    }
    const locationParts = [
        shownLevels.city ? locTime.city : undefined,
        shownLevels.state ? locTime.state : undefined,
        shownLevels.country ? locTime.country : undefined,
    ].filter(x => x !== undefined && x !== label);

    const locElem = getElem('div', {parent: parent, classes: ['loctime']});
    getElem('div', {parent: locElem, text: label, classes: ['loctime-label']});
    if(locTime.point !== undefined) {
        getElem('div', {parent: locElem, text: locTime.point, classes: ['loctime-point']});
    }
    if(locationParts.length > 0) {
        getElem('div', {parent: locElem, text: locationParts.join(', '), classes: ['loctime-location']});
    }
    getElem('div', {parent: locElem, text: locTime.date, classes: ['loctime-date']});
    const timeElem = getElem('time', {parent: locElem, text: locTime.time, classes: ['loctime-time']});
    if(locTime.stdTime !== undefined) {
        timeElem.setAttribute('datetime', locTime.stdTime);
        timeElem.setAttribute('title', locTime.stdTime);
    }
    return locElem;
}

const STD_RIDE_TYPES = new Set(['flight', 'bus', 'train', 'metro', 'car', 'taxi']);

export default function renderTrip(trip: Trip): Element {
    const tripElem = getElem('div', {classes: ['trip']});
    const shownLevels = getShownLevels(trip);
    for(const ride of trip) {
        const isLayover = ride.type === 'layover';
        const rideClasses = isLayover ? ['layover'] : ['ride'];
        const rideElem = getElem('div', {parent: tripElem, classes: rideClasses});

        if(!isLayover) {
            const header = getElem('div', {parent: rideElem, classes: ['ride-head']});
            const headLeft = getElem('div', {parent: header, classes: ['ride-head-left']});
            const headRight = getElem('div', {parent: header, classes: ['ride-head-right']});
            if(ride.type === undefined) {
                getElem('div', {parent: headLeft, classes: ['ride-type']});
            }
            else if(STD_RIDE_TYPES.has(ride.type)) {
                getElem('div', {parent: headLeft, classes: ['ride-type', 'ride-type-' + ride.type]});
            }
            else {
                getElem('div', {parent: headLeft, text: ride.type, classes: ['ride-type']});
            }
            if(ride.carrier !== undefined) {
                getElem('div', {parent: headLeft, text: ride.carrier, classes: ['ride-carrier']});
            }
            if(ride.number !== undefined) {
                getElem('div', {parent: headLeft, text: ride.number, classes: ['ride-number']});
            }
            if(ride.trackUrl !== undefined) {
                getElem('a', {parent: headLeft, text: '[track]', classes: ['ride-track-url'],
                    'attrs': {'href': ride.trackUrl, 'target': '_blank', 'rel': 'noopener noreferrer'}});
            }

            if(ride.bookingInfo !== undefined) {
                for(const [_, v] of Object.entries(ride.bookingInfo)) {
                    getElem('div', {parent: headRight, text: v});
                }
            }
        }

        const body = getElem('div', {parent: rideElem, classes: ['ride-body']});
        if(!isLayover) {
            const fromElem = renderLocTime(ride.from, body, shownLevels);
            fromElem.classList.add('ride-from');
        }
        const durElem = getElem('div', {parent: body, text: ride.duration, classes: ['ride-dur']});
        if(!isLayover) {
            const toElem = renderLocTime(ride.to, body, shownLevels);
            toElem.classList.add('ride-to');
        }
    }
    return tripElem;
}
