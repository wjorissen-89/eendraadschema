/**
 * Opzet voor de gouden tests. De bron leunt op globals en op de DOM; jsdom levert de DOM,
 * dit bestand levert de paar globals die index.html en main.ts normaal klaarzetten.
 */
import { readFileSync } from "node:fs";

const g = globalThis as any;

// pako komt in de app via een <script>-tag; hier laden we hetzelfde bestand.
(0, eval)(readFileSync("resources/pako/pako.min.js", "utf8"));
if (!g.pako) throw new Error("pako niet geladen");

// Wat EDStoStructure en exportjson buiten het model aanraken.
g.undostruct = { clear() {}, store() {}, undoStackSize: () => 0, redoStackSize: () => 0 };
g.autoSaver = { reset() {}, saveManually() {}, hasChangesSinceLastManualSave: () => false, forceHasChangesSinceLastManualSave() {} };
g.fileAPIobj = { filename: null };
URL.createObjectURL = () => "blob:test";
HTMLAnchorElement.prototype.click = () => {};

// ponytail: jsdom kent geen lay-out, dus geen getBBox. Tekstbreedte is hier lengte x lettergrootte x 0,6.
// De gouden SVG's bewaken dus vorm en opbouw van de symbolen, niet de pixelbreedte van automatisch
// geschaalde tekst. Wie dat wil ijken heeft een echte browser nodig (Playwright).
(g.SVGElement.prototype as any).getBBox = function () {
    const grootte = parseFloat(this.getAttribute("font-size") ?? "10");
    return { x: 0, y: 0, width: (this.textContent ?? "").length * grootte * 0.6, height: grootte };
};
