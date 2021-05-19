"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EYEBALL_FILE = exports.SCANS_DIR = exports.SETTINGS_PATH = exports.APP_DIR = void 0;
const path = require("path");
const os_1 = require("os");
exports.APP_DIR = path.join(os_1.homedir(), '.electric');
exports.SETTINGS_PATH = path.join(exports.APP_DIR, 'settings.json');
exports.SCANS_DIR = path.join(exports.APP_DIR, 'scans');
exports.EYEBALL_FILE = 'eyeball.json';
//# sourceMappingURL=constants.js.map