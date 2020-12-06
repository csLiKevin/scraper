import fetch from "node-fetch";
import { basename, extname } from "path";
import { File, IdPathPair } from "./file";
import { escapeRegExp } from "./util";

export const IMGUR = "imgur.com";
export const IMGUR_DATA = "i.imgur.com";

const regex = new RegExp(
    `https?://${escapeRegExp(IMGUR)}\/(a|gallery)\/(?<id>[0-9a-zA-Z]+)`
);
const { IMGUR_CLIENT_ID } = process.env;

interface Album {
    readonly id: string;
    readonly images: Image[];
    readonly title: string;
}

interface AlbumInfo {
    readonly data: Album;
}

interface Image {
    readonly id: string;
    readonly link: string;
}

function _scrapeFile(url: string, idpPathPairs: IdPathPair[] = []): File {
    const ext = extname(url);
    const filename = basename(url);
    const id = basename(filename, ext);

    return {
        filename: filename,
        id: id,
        idPathPairs: idpPathPairs,
        source: {
            method: "GET",
            url: url,
        },
    };
}

export async function scrapeFiles(url: string): Promise<File[]> {
    const { hostname } = new URL(url);

    if (hostname === IMGUR_DATA) {
        return [await _scrapeFile(url)];
    }

    const match = url.match(regex);
    if (!match) {
        throw new Error(`Invalid Imgur url: ${url}.`);
    }

    const { id } = match.groups!;

    const response = await fetch(`https://api.imgur.com/3/album/${id}`, {
        headers: {
            Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Could not resolve ${url}.`);
    }

    const {
        data: { images, title },
    } = (await response.json()) as AlbumInfo;
    const idPathPairs = [[id, title] as IdPathPair];

    return images.map(({ link }) => _scrapeFile(link, idPathPairs));
}
