import { mkdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import { dirname } from 'node:path';
export async function ensureParentDir(path) {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
}
export async function readJsonFile(path, fallback) {
    try {
        const contents = await readFile(path, 'utf8');
        return JSON.parse(contents);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return cloneJsonValue(fallback);
        }
        throw error;
    }
}
export async function writeJsonFile(path, value, mode = 0o600) {
    await ensureParentDir(path);
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode });
    await chmod(path, mode);
}
function cloneJsonValue(value) {
    return JSON.parse(JSON.stringify(value));
}
export async function removeFileIfExists(path) {
    try {
        await rm(path);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return;
        }
        throw error;
    }
}
//# sourceMappingURL=fs.js.map