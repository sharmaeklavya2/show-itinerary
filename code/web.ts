import type {Trip} from "./types";
import processTrip from "./process.js";

//=[ Interfaces and global variables ]==========================================

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

function toggleVisibility(): void {
    const mainElem = document.getElementById('main')!;
    const dropTargetElem = document.getElementById('drop-target')!;
    const ppJsonElem = document.getElementById('pp-json')!;
    mainElem.classList.remove('hidden');
    dropTargetElem.classList.add('hidden');
    ppJsonElem.classList.remove('hidden');
}

function displayTrip(trip: Trip): void {
    toggleVisibility();
    processTrip(trip);
    const ppJsonElem = document.getElementById('pp-json')!;
    ppJsonElem.textContent = JSON.stringify(trip, undefined, 2);
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
        try {
            const files = (ev.currentTarget! as HTMLInputElement).files;
            const file = getFileFromList(files);
            getTripFromFile(file).then(displayTrip).catch(logError);
        }
        catch(e) {
            logError(e);
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
    setupFileLoaders();
}

if(document.readyState === 'interactive') {
    main();
}
else {
    document.addEventListener('DOMContentLoaded', main);
}
