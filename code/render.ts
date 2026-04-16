import type {Trip, Ride, LocTime} from "./types";

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
    const locElem = getElem('div', {parent: parent, classes: ['loctime']});
    getElem('div', {'parent': locElem, 'text': locTime.where, classes: ['loctime-where']});
    if(locTime.point !== undefined) {
        getElem('div', {parent: locElem, text: locTime.point, classes: ['loctime-point']});
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
            if(STD_RIDE_TYPES.has(ride.type)) {
                getElem('div', {parent: header, classes: ['ride-type', 'ride-type-' + ride.type]});
            }
            else {
                getElem('div', {parent: header, text: ride.type, classes: ['ride-type']});
            }
            if(ride.carrier !== undefined) {
                getElem('div', {parent: header, text: ride.carrier, classes: ['ride-carrier']});
            }
            if(ride.number !== undefined) {
                getElem('div', {parent: header, text: ride.number, classes: ['ride-number']});
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
