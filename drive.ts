import fetch from "node-fetch";
import { File, IdPathPair } from "./file";
import { escapeRegExp } from "./util";

export const GOOGLE_APIS = "www.googleapis.com";
export const GOOGLE_DRIVE = "drive.google.com";

const regex = new RegExp(
    `^https?://${escapeRegExp(
        GOOGLE_DRIVE
    )}\/(open\\?id=|drive\/(mobile\/)?folders\/|file\/d\/)(?<id>[0-9a-zA-Z_-]+)`
);
const { GOOGLE_API_KEY } = process.env;
const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder" as string;

interface FileMetadata {
    readonly id: string;
    readonly kind: "drive#file";
    readonly mimeType: "string";
    readonly name: string;
}

interface FileMetadataList {
    readonly files: FileMetadata[];
    readonly incompleteSearch?: boolean;
    readonly kind: "drive#fileList";
    readonly nextPageToken: string;
}

function DriveFile(
    id: string,
    filename: string,
    idPathPairs: IdPathPair[] = []
): File {
    return {
        filename: filename,
        id: id,
        idPathPairs: idPathPairs,
        source: {
            method: "GET",
            url: `https://${GOOGLE_APIS}/drive/v3/files/${id}?alt=media&key=${GOOGLE_API_KEY}`,
        },
    };
}

async function _scrapeFolderFiles(
    id: string,
    name: string,
    baseIdPathPairs: IdPathPair[] = []
): Promise<File[]> {
    const files = [] as FileMetadata[];
    let nextPageToken = "dummy";
    do {
        const url = `https://${GOOGLE_APIS}/drive/v3/files?key=${GOOGLE_API_KEY}&nextPageToken=${nextPageToken}&pageSize=1000&q="${id}" in parents`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Could not resolve ${url}.`);
        }

        const json = (await response.json()) as FileMetadataList;
        files.push(...json.files);
        nextPageToken = json.nextPageToken;
    } while (nextPageToken);

    const results = [] as File[];
    const idPathPairs = [...baseIdPathPairs, [id, name]] as IdPathPair[];

    for (const file of files) {
        const { id, mimeType, name } = file;
        if (mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
            results.push(DriveFile(id, name, idPathPairs));
            continue;
        }

        results.push(...(await _scrapeFolderFiles(id, name, idPathPairs)));
    }

    return results;
}

export async function scrapeFiles(url: string): Promise<File[]> {
    const match = url.match(regex);
    if (!match) {
        throw new Error(`Invalid Google Drive url: ${url}.`);
    }

    const { id } = match.groups!;

    const fileMetadataUrl = `https://${GOOGLE_APIS}/drive/v3/files/${id}?key=${GOOGLE_API_KEY}`;
    const response = await fetch(fileMetadataUrl);
    if (response.status === 404) {
        console.warn(`Page not found: ${url}.`);
        return [];
    }
    if (!response.ok) {
        throw new Error(`Could not resolve ${url}.`);
    }

    const { mimeType, name } = (await response.json()) as FileMetadata;

    if (mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
        return _scrapeFolderFiles(id, name);
    }

    return [DriveFile(id, name)];
}
