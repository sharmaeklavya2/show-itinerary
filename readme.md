# `show-itinerary`

This takes a trip/journey in JSON and displays it as HTML.
It can be used as a web app or as a command-line tool.

## Setup

1.  Install dependencies: `npm install`.
    This also installs TypeScript, which is needed for building.
    If you have TypeScript 7 installed globally, you can skip it using `npm install --omit=dev`.
2.  Build: `npm run build`.
    This compiles the code in `code/` and generates airport data in `data/` (requires Python 3).

## Web app

1.  Serve this repository via a static HTTP server, e.g., `python3 -m http.server`.
2.  Open `index.html` in the web browser.
3.  Upload or drag-and-drop a JSON file.

## Command-line interface

```
node code/cli.js INPUT OUTPUT
```

This reads a trip from the JSON file `INPUT` and writes it to `OUTPUT`.
The format of `OUTPUT` depends on its extension (case-insensitive):

*   `.json`: the processed trip as JSON, i.e., the input with inferred fields filled in.
*   `.html`: a standalone HTML page with styles included and no JavaScript.

For example, `node code/cli.js examples/2.json trip.html`.
Run `node code/cli.js --help` for help.

If `OUTPUT` already exists, it is overwritten. If processing fails, `OUTPUT` is not written.
The exit status is 0 on success, 2 for invalid arguments, and 1 for other errors.

To run it as `show-itinerary INPUT OUTPUT` instead, run `npm link` in this repository.

The command-line interface works on older Node.js versions too (tested with Node.js 22):
`Map.prototype.getOrInsert` is polyfilled if missing.
If Node.js doesn't support Temporal (e.g., Homebrew's build of Node.js 26),
the [`temporal-polyfill`](https://github.com/fullcalendar/temporal-polyfill) package is used instead.

## JSON format

The JSON file must be of type `Trip`. `Trip`'s schema is documented in `code/decls.d.ts`.
The JSON is allowed to have keys in addition to those documented in `code/decls.d.ts`.
The `examples` directory has examples in JSON.
