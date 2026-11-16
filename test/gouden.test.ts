/**
 * Gouden tests: bewaken de symbolen en het EDS-formaat.
 * Faalt er een na een wijziging, dan is de wijziging fout, niet de test.
 * Bevroren kopieën opnieuw maken (alleen na een bewuste update van de bron): npx vitest run -u
 */
import { describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { EDStoStructure } from "../src/importExport/importExport";
import { Hierarchical_List } from "../src/Hierarchical_List";

const g = globalThis as any;

/** Leest een EDS-tekst in en geeft het model terug. */
function leesIn(eds: string): Hierarchical_List {
    EDStoStructure(eds, false);
    return g.structure;
}

/** Bewaart zoals de knop "Opslaan": geeft de EDS-tekst die in het bestand zou komen. */
function bewaar(): string {
    let uit = "";
    g.propUpload = (tekst: string) => { uit = tekst; };
    g.exportjson();
    return uit;
}

const svg = (s: Hierarchical_List) => s.toSVG(0, "horizontal").data;

// --- Schema's: de voorbeelden van de bron, plus eigen bestanden die niet in git horen ---

const schemas: { naam: string; pad: string; gouden: string }[] = readdirSync("examples")
    .filter((f) => f.endsWith(".eds"))
    .map((f) => ({ naam: f, pad: `examples/${f}`, gouden: `gouden/${f}.svg` }));

// Klantbestanden: alleen lezen. Hun paden staan in test/lokaal/bestanden.txt (één per regel) en hun
// bevroren kopie komt in test/lokaal/; die map staat in .gitignore, want de fork is publiek.
const lijst = "test/lokaal/bestanden.txt";
const lokaal = (existsSync(lijst) ? readFileSync(lijst, "utf8").split("\n") : [])
    .map((r) => r.trim())
    .filter((r) => r && existsSync(r));
for (const pad of lokaal) schemas.push({ naam: "lokaal " + (schemas.length + 1), pad, gouden: `lokaal/${pad.split("/").pop()}.svg` });

describe.each(schemas)("$naam", ({ pad, gouden }) => {
    const eds = readFileSync(pad, "utf8");

    test("eendraadschema-SVG is ongewijzigd", async () => {
        await expect(svg(leesIn(eds))).toMatchFileSnapshot(gouden);
    });

    test("inlezen -> bewaren -> inlezen geeft dezelfde JSON", () => {
        const json1 = leesIn(eds).toJsonObject(true);
        const bewaard = bewaar();
        expect(bewaard.slice(0, 10)).toBe("EDS0040000");
        const json2 = leesIn(bewaard).toJsonObject(true);
        expect(json2).toBe(json1);
        expect(bewaar()).toBe(bewaard); // en het bestand zelf is stabiel
    });

    test("situatieschema overleeft de roundtrip", () => {
        const voor = JSON.stringify(leesIn(eds).sitplan?.toJsonObject() ?? null);
        const na = JSON.stringify(leesIn(bewaar()).sitplan?.toJsonObject() ?? null);
        expect(na).toBe(voor);
    });
});

// --- Elk symbool afzonderlijk, met zijn standaardwaarden ---

// De lijst komt uit createItem() zelf, zodat een nieuw symbool van de bron vanzelf meedoet.
const bron = readFileSync("src/Hierarchical_List.ts", "utf8");
const createItem = bron.slice(bron.indexOf("createItem(electroType"), bron.indexOf("addItem(electroType"));
const types = [...createItem.matchAll(/case '([^']+)'/g)].map((m) => m[1]);

test("createItem kent de verwachte symbolen", () => {
    expect(types.length).toBeGreaterThanOrEqual(50);
});

describe("symbolen met standaardwaarden", () => {
    test.each(types)("%s", async (type) => {
        const s = new Hierarchical_List();
        g.structure = s;
        // Onder een kring, zoals in een echt schema: sommige symbolen tekenen zich naargelang hun ouder.
        s.addItem("Kring");
        s.insertChildAfterId(s.createItem(type), s.id[0]);
        const bestand = type.replace(/[^A-Za-z0-9]+/g, "_");
        await expect(svg(s)).toMatchFileSnapshot(`gouden/symbolen/${bestand}.svg`);
    });
});
