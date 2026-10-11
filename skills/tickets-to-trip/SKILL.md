---
name: tickets-to-trip
description: Read a folder of travel tickets (flights, buses, trains, etc.) and write a trip.json itinerary in the show-itinerary format, for rendering with https://github.com/sharmaeklavya2/show-itinerary. Use when asked to turn tickets or booking confirmations into a trip/itinerary JSON for show-itinerary.
---

# Tickets to `trip.json`

Read all tickets in a folder and write a single `trip.json` in that folder, in the format used by
[show-itinerary](https://github.com/sharmaeklavya2/show-itinerary).
The user renders it themselves; your job is to produce correct JSON and a short report in the chat.

## 1. Learn the format

Read these files from the repo (use the raw URLs; they are plain text):

- `https://raw.githubusercontent.com/sharmaeklavya2/show-itinerary/main/readme.md`
- `https://raw.githubusercontent.com/sharmaeklavya2/show-itinerary/main/code/decls.d.ts`:
  the schema. `trip.json` must be of type `Trip`. Never fill fields marked `[internal]`.
- `https://raw.githubusercontent.com/sharmaeklavya2/show-itinerary/main/examples/1.json`, `2.json`, `3.json`: examples.

If the user's copy of the repo is available locally, you may read these files from it instead.

## 2. Collect the rides

Read every file in the folder: PDFs, images, emails, text. List any file you could not read.

- Add a ride only if there is a ticket for it, or if a file in the folder explicitly mentions it.
  Never infer rides that aren't documented (e.g., a taxi between a bus stop and a hotel).
- Merge duplicates: a booking confirmation, an e-ticket, and a boarding pass for the same ride are one ride.
- Leave out cancelled tickets, and rides replaced by a rebooking.
- A ticket with several legs (e.g., a connecting flight) gives one ride per leg.
  Don't add layovers; the app computes them.
- Order the rides chronologically by departure.

## 3. Fill each ride

- `type`: `flight`, `bus`, `train`, `metro`, `car`, or `taxi`; otherwise a short descriptive word.
- `carrier`: for flights, the airline's 2-character IATA code (e.g., `AI`, `JL`, `6E`).
  For other rides, the company name as on the ticket.
  If the IATA code is ambiguous (e.g., a codeshare whose marketing and operating airlines differ,
  or an airline you can't identify with certainty), ask the user before writing it.
- `number`: the ride's number as printed, without the carrier code (e.g., `0030` for JL0030).
  Omit it if there is none.
- `bookingInfo`: only these keys, each a string, and only when the ticket has them:
  - `number`: the booking number (PNR / confirmation number).
  - `price`: the price with its currency, as on the ticket (e.g., `$50`, `₹180,000`).
  - `type`: the fare class (e.g., `Economy Flex`).

  Don't include anything else (no names, ticket numbers, seats, passport, or loyalty numbers).
- Don't add other keys (e.g., `trackUrl`, `duration`); the app infers what it needs.

## 4. Fill each `from` and `to`

- `when`: local time at that place, formatted exactly as `YYYY-MM-DD HH:MM`.
  - For `from`, use the departure time, not the boarding or gate-closing time.
  - For `to`, use the arrival time. Handle next-day arrivals (e.g., `+1`) by using the correct date.
  - If the ticket shows times in a timezone other than the place's local time, convert them.
  - If the ticket has no arrival time, ask the user.
- `where`: name of the place. Omit if nothing more specific than an airport or city is known.
  E.g., for Chicago Union Station: `city: "Chicago"`, `point: "Union Station"`, and no `where`.
  Use `where` for a named place that isn't a city, like `Temple` in example 3.
- `airport`: if the place is an airport, its 3-letter IATA code (e.g., `ORD`), even if the ride isn't a flight.
- `city`, `state`, `country`: fill only if `airport` isn't set. `state` only where applicable (e.g., USA, Canada, India).
- `point`: the terminal, gate area, platform, or stop within the place, if the ticket says.
  If the ticket doesn't mention the terminal, look it up (e.g., on the airline's or airport's website),
  fill it in, and cite the source in your chat report (see step 6). Don't put the source in the JSON.
- `timezone`: add it (an IANA timezone, e.g., `America/Chicago`) only if the app can't infer it.
  The app can infer the timezone if `where` or `airport` is an airport's IATA code,
  or if the city, state, or country can be found in the app's database.
  If validation reports that it can't determine the timezone for a place, add it there.
  If you can't validate, add `timezone` to every place that has no `airport`.

## 5. Validate (if possible)

If you can run Node.js and have a built copy of the repo
(`git clone`, then `npm install`, then `npm run build`; see readme.md),
run `node code/cli.js PATH/TO/trip.json OUTPUT.html` with `OUTPUT.html` outside the user's folder.
If it reports an error, fix `trip.json` and run it again.
If you can't validate, say so in the report.

## 6. Write the file and report

Write `trip.json` (indented with 4 spaces) in the tickets folder.
If a `trip.json` already exists there, ask before overwriting it.

Then report in the chat:

- the rides you added, one line each;
- terminals you looked up, each with the source (a link) so the user can check it;
- files you skipped and why (cancelled, duplicate, unreadable);
- any assumptions, and whether validation passed or was not possible.
