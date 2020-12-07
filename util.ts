import { promises as fsPromises } from "fs";

const { access } = fsPromises;

export function escapeRegExp(string: string) {
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
}

export async function exists(path: string) {
    try {
        await access(path);
        return true;
    } catch (error) {
        return false;
    }
}

export function PageNotFoundMessage(url: string) {
    return `Page not found: ${url}.`;
}

export function UrlResolutionError(url: string) {
    return new Error(`Could not resolve ${url}.`);
}

export function UrlInvalidError(url: string) {
    return new Error(`Invalid url: ${url}.`);
}
