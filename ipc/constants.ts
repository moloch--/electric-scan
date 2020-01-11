import * as path from 'path';
import { homedir } from 'os';

export const APP_DIR = path.join(homedir(), '.electric');
export const SETTINGS_PATH = path.join(APP_DIR, 'settings.json');
export const SCANS_DIR = path.join(APP_DIR, 'scans');
