import { join } from "path";
import { options } from "yargs";

const { destination, dry, url } = options({
    destination: {
        default: join(__dirname, "downloads"),
        describe: "directory to save in",
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
