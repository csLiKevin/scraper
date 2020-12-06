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
