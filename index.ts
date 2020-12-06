import { promises } from "fs";
import { dirname, join } from "path";
import { options } from "yargs";

import { scrapeFiles as scrapeDrive } from "./drive";
import { scrapeFiles as scrapeDropbox } from "./dropbox";
import { download, getIdPath, File } from "./file";
import { scrapeFiles as scrapeImgur } from "./imgur";
import { exists } from "./util";

const { writeFile } = promises;

const { destination, dry, url } = options({
    destination: {
        default: join(__dirname, "downloads"),
        describe: "directory to save to",
        type: "string",
    },
    dry: {
        default: false,
        describe: "prevent creating files and directories",
        type: "boolean",
    },
    url: {
        required: true,
        describe: "url to scrape from",
        type: "string",
    },
})
    .strict()
    .parse();

(async () => {
    const scrapers = [scrapeDrive, scrapeDropbox, scrapeImgur];
    let files = [] as File[];
    let invalid = true;
    for (const scraper of scrapers) {
        try {
            files = await scraper(url);
            invalid = false;
            break;
        } catch (error) {}
    }

    if (invalid) {
        throw new Error(`Invalid url: ${url}.`);
    }

    for (const file of files) {
        const { id, source } = file;
        const fileDestination = getIdPath(file, destination);

        if (await exists(fileDestination)) {
            console.warn("Skipping", fileDestination);
            continue;
        }

        console.log("Downloading", fileDestination);
        if (dry) {
            continue;
        }
        await download(source, fileDestination);
        await writeFile(
            join(dirname(fileDestination), `${id}.json`),
            JSON.stringify(file, null, 4)
        );
    }
})();
