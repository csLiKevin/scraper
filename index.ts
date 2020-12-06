import { dirname, join } from "path";
import { promises } from "fs";
import { options } from "yargs";

import { scrapeFiles } from "./drive";
import { download, getIdPath } from "./file";
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
    const files = await scrapeFiles(url);

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
