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

function renderLocTime(locTime: LocTime, parent: Element): Element {
    const primary = locTime.where ?? locTime.airport ?? locTime.city;
    if(primary === undefined) {
        throw new Error('Missing place label.');
    }
    let secParts;
    if(primary === locTime.airport) {
        // secParts = [locTime.point, locTime.city, locTime.state, locTime.country].filter(notUndef);
        secParts = [locTime.point, locTime.city];
    }
    else {
        secParts = [locTime.point];
        if(locTime.locType === 'city') {
            if(primary !== locTime.city) {
                secParts.push(locTime.city);
            }
        }
        else if(locTime.locType === 'state') {
            secParts.push(locTime.city);
            secParts.push(locTime.state);
        }
        else if(locTime.locType === 'country') {
            secParts.push(locTime.city);
            secParts.push(locTime.state);
            secParts.push(locTime.country);
        }
    }
    const secParts2 = secParts.filter(x => x !== undefined);
    const secondary = (secParts2.length > 0) ? secParts2.join(', ') : undefined;

    const locElem = getElem('div', {parent: parent, classes: ['loctime']});
    getElem('div', {parent: locElem, text: primary, classes: ['loctime-where']});
    if(secondary !== undefined) {
        getElem('div', {parent: locElem, text: secondary, classes: ['loctime-point']});
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
    for(const ride of trip) {
        const isLayover = ride.type === 'layover';
        const rideClasses = isLayover ? ['layover'] : ['ride'];
        const rideElem = getElem('div', {parent: tripElem, classes: rideClasses});

        if(!isLayover) {
            const header = getElem('div', {parent: rideElem, classes: ['ride-head']});
            const headLeft = getElem('div', {parent: header, classes: ['ride-head-left']});
            const headRight = getElem('div', {parent: header, classes: ['ride-head-right']});
            if(STD_RIDE_TYPES.has(ride.type)) {
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
            const fromElem = renderLocTime(ride.from, body);
            fromElem.classList.add('ride-from');
        }
        const durElem = getElem('div', {parent: body, text: ride.duration, classes: ['ride-dur']});
        if(!isLayover) {
            const toElem = renderLocTime(ride.to, body);
            toElem.classList.add('ride-to');
        }
    }
    return tripElem;
}
