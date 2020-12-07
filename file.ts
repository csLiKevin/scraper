import { createWriteStream, promises as fsPromises } from "fs";
import fetch from "node-fetch";
import { dirname, extname, join } from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { UrlResolutionError } from "./util";

const { mkdir } = fsPromises;
const pipelinePromise = promisify(pipeline);

export interface File {
    filename: string;
    id: number | string;
    idPathPairs: IdPathPair[];
    source: FileSource;
}

export interface FileSource {
    headers?: { [key: string]: string };
    method: "GET" | "POST";
    url: string;
}

export type IdPathPair = [id: number | string, path: string];

export async function download(source: FileSource, destination: string) {
    const { headers, method, url } = source;
    const response = await fetch(url, {
        headers: headers,
        method: method,
    });
    if (!response.ok) {
        throw UrlResolutionError(url);
    }

    const parentFolder = dirname(destination);
    await mkdir(parentFolder, { recursive: true });
    const writeStream = createWriteStream(destination, {
        flags: "wx",
    });
    await pipelinePromise(response.body, writeStream);
}

export function getIdPath(file: File, basePath: string = "") {
    const { id, filename, idPathPairs } = file;
    const ids = idPathPairs.map(([id]) => id);
    const ext = extname(filename);

    return join(basePath, ...ids.map((id) => id.toString()), `${id}${ext}`);
}

export function getPath(file: File, basePath: string = "") {
    const { filename, idPathPairs } = file;
    const paths = idPathPairs.map(([, path]) => path);

    return join(basePath, ...paths, filename);
}
