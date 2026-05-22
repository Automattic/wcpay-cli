import { mkdir, readFile, writeFile, rm, chmod } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function ensureParentDir( path: string ): Promise<void> {
	await mkdir( dirname( path ), { recursive: true, mode: 0o700 } );
}

export async function readJsonFile<T>( path: string, fallback: T ): Promise<T> {
	try {
		const contents = await readFile( path, 'utf8' );
		return JSON.parse( contents ) as T;
	} catch ( error ) {
		if ( error instanceof Error && 'code' in error && error.code === 'ENOENT' ) {
			return cloneJsonValue( fallback );
		}
		throw error;
	}
}

export async function writeJsonFile( path: string, value: unknown, mode = 0o600 ): Promise<void> {
	await ensureParentDir( path );
	await writeFile( path, `${ JSON.stringify( value, null, 2 ) }\n`, { mode } );
	await chmod( path, mode );
}

function cloneJsonValue<T>( value: T ): T {
	return JSON.parse( JSON.stringify( value ) ) as T;
}

export async function removeFileIfExists( path: string ): Promise<void> {
	try {
		await rm( path );
	} catch ( error ) {
		if ( error instanceof Error && 'code' in error && error.code === 'ENOENT' ) {
			return;
		}
		throw error;
	}
}
