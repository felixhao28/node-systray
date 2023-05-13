"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable: no-floating-promises
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const assert = __importStar(require("assert"));
const index_1 = __importDefault(require("./index"));
const menu = require('./menu.js');
const pkg = require('./package.json');
menu.icon = os.platform() === 'win32' ? './logo_s.ico' : './logo_s.png';
describe('test', function () {
    this.timeout(1000 * 24 * 3600);
    it('systray release is ok', () => __awaiter(this, void 0, void 0, function* () {
        var _a;
        const systray = new index_1.default({ menu, debug: false });
        yield systray.onClick((action) => __awaiter(this, void 0, void 0, function* () {
            if (action.seq_id === 0) {
                yield systray.sendAction({
                    type: 'update-item',
                    item: Object.assign(Object.assign({}, (action.item)), { checked: !action.item.checked })
                });
            }
            else if (action.seq_id === 2) {
                yield systray.kill();
            }
            console.log('action', action);
        }));
        yield systray.ready();
        (_a = systray.process.stderr) === null || _a === void 0 ? void 0 : _a.on('data', (chunk) => {
            console.log(chunk.toString());
        });
        console.log('Exit the tray in 1000ms...');
        const exitInfo = new Promise(resolve => systray.onExit((code, signal) => resolve({ code, signal })));
        yield new Promise((resolve, reject) => {
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                yield systray.kill(false);
                resolve();
            }), 1000);
        });
        const { code, signal } = yield exitInfo;
        console.log('code', code, 'signal', signal);
        assert.strictEqual(code, 0);
        assert.strictEqual(signal, null);
    }));
    it('systray copyDir is ok', () => __awaiter(this, void 0, void 0, function* () {
        const debug = false;
        const systray = new index_1.default({ menu, debug, copyDir: true });
        const binName = ({
            win32: `tray_windows${debug ? '' : '_release'}.exe`,
            darwin: `tray_darwin${debug ? '' : '_release'}`,
            linux: `tray_linux${debug ? '' : '_release'}`
        })[process.platform];
        yield systray.ready();
        assert.strictEqual(systray.binPath, path.resolve(`${os.homedir()}/.cache/node-systray/`, pkg.version, binName));
        yield systray.onClick((action) => __awaiter(this, void 0, void 0, function* () {
            if (action.seq_id === 0) {
                yield systray.sendAction({
                    type: 'update-item',
                    item: Object.assign(Object.assign({}, (action.item)), { checked: !action.item.checked })
                });
            }
            else if (action.seq_id === 2) {
                yield systray.kill();
            }
            console.log('action', action);
        }));
        console.log('Exit the tray in 1000ms...');
        const exitInfo = new Promise(resolve => systray.onExit((code, signal) => resolve({ code, signal })));
        yield new Promise((resolve, reject) => {
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                yield systray.kill(false);
                resolve();
            }), 1000);
        });
        const { code, signal } = yield exitInfo;
        console.log('code', code, 'signal', signal);
        assert.strictEqual(code, 0);
    }));
});
