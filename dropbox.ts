import fetch from "node-fetch";
import { File, IdPathPair } from "./file";
import { escapeRegExp } from "./util";

export const DROPBOX = "dropbox.com";
export const DROPBOX_CONTENT_API = "content.dropboxapi.com";
export const DROPBOX_WWW = "www.dropbox.com";

const regex = new RegExp(
    `https?://(www\\.)?${escapeRegExp(DROPBOX)}\/sh?\/[0-9a-zA-Z]{15}\/.+`
);
const { DROPBOX_ACCESS_TOKEN } = process.env;

interface ListFolderResult {
    cursor: string;
    entries: {
        ".tag": "file" | "folder";
        id: string;
        name: string;
    }[];
    has_more: boolean;
}

interface SharedLinkMetadata {
    ".tag": "file" | "folder";
    id: string;
    name: string;
    url: string;
}

function formatId(id: string) {
    return id.replace("id:", "").trim();
}

function DropboxFile(
    id: string,
    filename: string,
    url: string,
    idPathPairs: IdPathPair[] = [],
    path?: string
): File {
    return {
        filename: filename,
        id: id,
        idPathPairs: idPathPairs,
        source: {
            method: "POST",
            headers: {
                Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                "Dropbox-API-Arg": JSON.stringify({
                    path: path,
                    url: url,
                }),
            },
            url: `https://${DROPBOX_CONTENT_API}/2/sharing/get_shared_link_file`,
        },
    };
}

async function _scrapeFolderFiles(
    url: string,
    baseIdPathPairs: IdPathPair[]
): Promise<File[]> {
    let path = baseIdPathPairs
        .slice(1)
        .map(([, path]) => path)
        .join("/");
    path = path ? `/${path}` : "";
    const response = await fetch(
        "https://api.dropboxapi.com/2/files/list_folder",
        {
            body: JSON.stringify({
                path: path,
                shared_link: {
                    url: url,
                },
            }),
            headers: {
                Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        }
    );

    let {
        cursor,
        entries,
        has_more,
    } = (await response.json()) as ListFolderResult;
    const allEntries = entries;
    while (has_more) {
        const response = await fetch(
            "https://api.dropboxapi.com/2/files/list_folder/continue",
            {
                body: JSON.stringify({
                    cursor: cursor,
                }),
                headers: {
                    Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
            }
        );

        ({ cursor, entries, has_more } = await response.json());
        allEntries.push(...entries);
    }

    const files = [] as File[];

    for (const { ".tag": tag, id, name } of allEntries) {
        const formattedId = formatId(id);

        if (tag === "file") {
            files.push(
                DropboxFile(
                    formattedId,
                    name,
                    url,
                    baseIdPathPairs,
                    `${path}/${name}`
                )
            );
            continue;
        }

        files.push(
            ...(await _scrapeFolderFiles(url, [
                ...baseIdPathPairs,
                [formattedId, name],
            ]))
        );
    }

    return files;
}

export async function scrapeFiles(url: string): Promise<File[]> {
    if (!regex.test(url)) {
        throw new Error(`Invalid Dropbox url: ${url}.`);
    }

    const response = await fetch(
        `https://api.dropboxapi.com/2/sharing/get_shared_link_metadata`,
        {
            body: JSON.stringify({
                url: url,
            }),
            headers: {
                Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        }
    );
    if (response.status === 409) {
        console.warn(`Page not found: ${url}.`);
        return [];
    }
    if (!response.ok) {
        throw new Error(`Could not resolve ${url}.`);
    }
    const {
        ".tag": tag,
        id,
        name,
    } = (await response.json()) as SharedLinkMetadata;
    const formattedId = formatId(id);

    if (tag === "file") {
        return [DropboxFile(formattedId, name, url)];
    }

    return await _scrapeFolderFiles(url, [[formattedId, name]]);
}
