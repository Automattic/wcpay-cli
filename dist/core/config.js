import { join } from 'node:path';
import { homedir } from 'node:os';
export const ENV_HOME = 'WCPAY_HOME';
export const ENV_PROFILE = 'WCPAY_PROFILE';
export const ENV_CONSUMER_KEY = 'WCPAY_CONSUMER_KEY';
export const ENV_CONSUMER_SECRET = 'WCPAY_CONSUMER_SECRET';
export const ENV_KEYRING = 'WCPAY_KEYRING';
export function getConfigDir(env = process.env) {
    if (env[ENV_HOME]) {
        return env[ENV_HOME];
    }
    if (env.XDG_CONFIG_HOME) {
        return join(env.XDG_CONFIG_HOME, 'wcpay');
    }
    return join(homedir(), '.config', 'wcpay');
}
export function getProfilesPath(env = process.env) {
    return join(getConfigDir(env), 'profiles.json');
}
export function getConfigPath(env = process.env) {
    return join(getConfigDir(env), 'config.json');
}
//# sourceMappingURL=config.js.map