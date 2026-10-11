import processTrip from "./process.js";
import renderTrip, { type ElemNode } from "./render.js";

//=[ Error reporting ]==========================================================

type Status = 'danger' | 'warning' | 'success';

function msgCloseBtnClickHandler(ev: Event): void {
    let closeBtn = ev.currentTarget as HTMLElement;  // will always be a span.close-btn element
    let liElem = closeBtn.parentElement!;
    let olElem = liElem.parentElement!;
    olElem.removeChild(liElem);
}

function uiMessage(status: Status | undefined, text: string | string[]): void {
    let textArray;
    if(Array.isArray(text)) {
        textArray = text;
    }
    else {
        textArray = [text];
    }
    for(const text of textArray) {
        let liElem = document.createElement('li');
        if(status !== undefined) {
            liElem.classList.add(status);
        }
        let msgSpan = document.createElement('span');
        msgSpan.classList.add('msg-text');
        msgSpan.textContent = text;
        liElem.appendChild(msgSpan);
        let closeButton = document.createElement('span');
        closeButton.classList.add('close-btn');
        closeButton.addEventListener('click', msgCloseBtnClickHandler);
        liElem.appendChild(closeButton);
        let msgList = document.getElementById('msg-list')!;
        msgList.appendChild(liElem);
    }
}

function logError(e: unknown): void {
    if(e instanceof Error) {
        uiMessage('danger', e.message);
    }
    throw e;
}

//=[ Conversion to DOM ]========================================================

function toDom(node: ElemNode): HTMLElement {
    const elem = document.createElement(node.tag);
    if(node.text !== undefined) {
        elem.textContent = node.text;
    }
    for(const [k, v] of Object.entries(node.attrs)) {
        elem.setAttribute(k, v);
    }
    if(node.classes.length > 0) {  // classList.add() with no arguments would add an empty class attribute
        elem.classList.add(...node.classes);
    }
    for(const child of node.children) {
        elem.appendChild(toDom(child));
    }
    return elem;
}

function displayTrip(trip: Trip): void {
    const mainElem = document.getElementById('main')!;
    const dropTargetElem = document.getElementById('drop-target')!;
    const ppJsonWrapper = document.getElementById('pp-json-wrapper')!;
    const ppJsonElem = document.getElementById('pp-json')!;
    const gasElem = document.getElementById('gas')!;

    mainElem.classList.remove('hidden');
    dropTargetElem.classList.remove('prominent');
    ppJsonWrapper.classList.remove('hidden');
    gasElem.classList.add('prominent');

    processTrip(trip);
    ppJsonElem.textContent = JSON.stringify(trip, undefined, 2);
    mainElem.replaceChildren(toDom(renderTrip(trip)));
}

//=[ File IO ]==================================================================

async function getTripFromFile(file: File): Promise<Trip> {
    const text = await file.text();
    return JSON.parse(text);
}

function getFileFromList(files: FileList | null | undefined): File {
    if(files === null || files === undefined || files.length === 0) {
        throw new Error('Received empty file list.');
    }
    else if(files.length > 1) {
        throw new Error(`Received ${files.length} files.`);
    }
    const file = files.item(0);
    if(file === null) {
        throw new Error('Received a null file.');
    }
    return file;
}

function setupFileLoaders(): void {
    const uploaderElem = document.getElementById('uploader')!;
    uploaderElem.addEventListener('change', function(ev: Event) {
        const inputElem = ev.currentTarget! as HTMLInputElement;
        try {
            const file = getFileFromList(inputElem.files);
            getTripFromFile(file).then(displayTrip).catch(logError);
        }
        catch(e) {
            logError(e);
        }
        finally {
            // Clear the selection so that choosing the same file again fires 'change'.
            // The File object obtained above stays readable after this.
            inputElem.value = '';
        }
    });
    document.getElementById('drop-target')!.addEventListener('click', function() {
        uploaderElem.click();
    });

    document.body.addEventListener('dragover', function(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        if(ev.dataTransfer) {
            ev.dataTransfer.dropEffect = 'copy';
        }
    });
    document.body.addEventListener('dragstart', function(ev) {
        console.debug('dragstart', ev.target);
        ev.preventDefault();
        return false;
    });
    document.body.addEventListener('drop', function(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        if(ev.dataTransfer) {
            ev.dataTransfer.dropEffect = 'copy';
            try {
                const file = getFileFromList(ev.dataTransfer.files);
                getTripFromFile(file).then(displayTrip).catch(logError);
            }
            catch(e) {
                logError(e);
            }
        }
    });
}

//=[ main ]=====================================================================

function main(): void {
    const dropTargetElem = document.getElementById('drop-target')!;
    dropTargetElem.classList.remove('hidden');
    dropTargetElem.classList.add('prominent');
    setupFileLoaders();
}

// This module can run after DOMContentLoaded (e.g., when a dependency awaits loading a polyfill),
// so only wait for that event if the document is still loading.
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
}
else {
    main();
}
