#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import processTrip from "./process.js";
import renderTrip, { type ElemNode } from "./render.js";

const USAGE = `Usage: show-itinerary INPUT OUTPUT

Read a trip from the JSON file INPUT, process it, and write it to OUTPUT.
If OUTPUT ends with .json, write the processed trip as JSON.
If OUTPUT ends with .html, write the trip as a standalone HTML page.`;

// Exit codes
const EXIT_OK = 0;
const EXIT_ERROR = 1;
const EXIT_USAGE = 2;

//=[ HTML output ]==============================================================

function escapeText(s: string): string {
    return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttr(s: string): string {
    return escapeText(s).replaceAll('"', '&quot;');
}

function toHtml(node: ElemNode): string {
    const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${escapeAttr(v)}"`);
    if(node.classes.length > 0) {
        attrs.push(` class="${escapeAttr(node.classes.join(' '))}"`);
    }
    const text = (node.text !== undefined) ? escapeText(node.text) : '';
    const children = node.children.map(toHtml).join('');
    return `<${node.tag}${attrs.join('')}>${text}${children}</${node.tag}>`;
}

function renderPage(trip: Trip): string {
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<title>Itinerary</title>
<style>
${css}
</style>
</head>
<body>
<main id="main">${toHtml(renderTrip(trip))}</main>
<div id="gas" class="prominent"></div>
<footer>Created using
    <a href="https://github.com/sharmaeklavya2/show-itinerary/">github:sharmaeklavya2/show-itinerary</a>.</footer>
</body>
</html>
`;
}

//=[ main ]=====================================================================

function errorMessage(e: unknown): string {
    return (e instanceof Error) ? e.message : String(e);
}

function main(args: string[]): number {
    let parsed;
    try {
        parsed = parseArgs({args, options: {help: {type: 'boolean', short: 'h'}}, allowPositionals: true, strict: true});
    }
    catch(e) {
        console.error(`${errorMessage(e)}\n\n${USAGE}`);
        return EXIT_USAGE;
    }
    if(parsed.values['help']) {
        console.log(USAGE);
        return EXIT_OK;
    }
    if(parsed.positionals.length !== 2) {
        console.error(`Expected 2 arguments, but got ${parsed.positionals.length}.\n\n${USAGE}`);
        return EXIT_USAGE;
    }
    const [inPath, outPath] = parsed.positionals;
    const format = /\.(json|html)$/i.exec(outPath)?.[1].toLowerCase();
    if(format === undefined) {
        console.error(`OUTPUT must end with .json or .html, but it is ${outPath}.`);
        return EXIT_USAGE;
    }

    let output: string;
    try {
        const trip: Trip = JSON.parse(readFileSync(inPath, 'utf8'));
        processTrip(trip);
        output = (format === 'json') ? JSON.stringify(trip, undefined, 2) + '\n' : renderPage(trip);
    }
    catch(e) {
        console.error(`${inPath}: ${errorMessage(e)}`);
        return EXIT_ERROR;
    }
    try {
        writeFileSync(outPath, output);
    }
    catch(e) {
        console.error(`${outPath}: ${errorMessage(e)}`);
        return EXIT_ERROR;
    }
    return EXIT_OK;
}

process.exitCode = main(process.argv.slice(2));
