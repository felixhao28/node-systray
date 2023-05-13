/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/tslint/config */
import * as child from 'child_process'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs-extra'
import * as readline from 'readline'
const pkg = require('./package.json')

function _debug(msgType: string, ...msg: any[]) {
  console.log(msgType + ':' + msg.map(m => {
    let t = typeof (m) === 'string' ? m : JSON.stringify(m)
    const p = t.indexOf('"icon":')
    if (p >= 0) {
      const e = t.indexOf('"', p + 8)
      t = t.substring(0, p + 8) + '<ICON>' + t.substring(e)
    }
    const limit = 500
    if (t.length > limit) {
      t = t.substring(0, limit / 2) + '...' + t.substring(t.length - limit / 2)
    }
    return t
  }).join(' '))
  return
}


export interface MenuItem {
  title: string
  tooltip: string
  checked?: boolean
  enabled?: boolean
  hidden?: boolean
  items?: MenuItem[]
  icon?: string
  isTemplateIcon?: boolean
  callback?: {
    click?: () => void
  };
}

interface MenuItemEx extends MenuItem {
  __id: number
  items?: MenuItemEx[]
}

export interface Menu {
  icon: string
  title: string
  tooltip: string
  items: MenuItem[]
  isTemplateIcon?: boolean
}

export interface ClickEvent {
  type: 'clicked'
  item: MenuItem
  seq_id: number
  __id: number
}

export interface ReadyEvent {
  type: 'ready'
}

export type Event = ClickEvent | ReadyEvent

export interface UpdateItemAction {
  type: 'update-item'
  item: MenuItem
  seq_id?: number
}

export interface UpdateMenuAction {
  type: 'update-menu'
  menu: Menu
}

export interface UpdateMenuAndItemAction {
  type: 'update-menu-and-item'
  menu: Menu
  item: MenuItem
  seq_id?: number
}

export interface ExitAction {
  type: 'exit'
}

export type Action = UpdateItemAction | UpdateMenuAction | UpdateMenuAndItemAction | ExitAction

export interface Conf {
  menu: Menu
  debug?: boolean
  copyDir?: boolean | string
}

const getTrayBinPath = async (debug: boolean = false, copyDir: boolean | string = false) => {
  const binName = ({
    win32: `tray_windows${debug ? '' : '_release'}.exe`,
    darwin: `tray_darwin${debug ? '' : '_release'}`,
    linux: `tray_linux${debug ? '' : '_release'}`
  })[process.platform]
  let binPath = path.join('.', 'traybin', binName)
  if (!await fs.pathExists(binPath)) {
    binPath = path.join(__dirname, 'traybin', binName)
  }
  if (copyDir) {
    copyDir = path.join((
      typeof copyDir === 'string'
        ? copyDir
        : `${os.homedir()}/.cache/node-systray/`), pkg.version)

    const copyDistPath = path.join(copyDir, binName)
    try {
      await fs.stat(copyDistPath)
    } catch (error) {
      await fs.ensureDir(copyDir)
      await fs.copy(binPath, copyDistPath)
    }

    return copyDistPath
  }
  return binPath
}
const CHECK_STR = ' (√)'
function updateCheckedInLinux(item: MenuItem) {
  if (process.platform !== 'linux') {
    return
  }
  if (item.checked) {
    item.title += CHECK_STR
  } else {
    item.title = (item.title || '').replace(RegExp(CHECK_STR + '$'), '')
  }
  if (item.items != null) {
    item.items.forEach(updateCheckedInLinux)
  }
}

async function resolveIcon(item: MenuItem | Menu) {
  let icon = item.icon
  if (icon != null) {
    if (await fs.pathExists(icon)) {
      item.icon = await loadIcon(icon)
    }
  }
  if (item.items != null) {
    await Promise.all(item.items.map(_ => resolveIcon(_)))
  }
  return item
}

function addInternalId(internalIdMap: Map<number, MenuItem>, item: MenuItemEx, counter = {id: 1}) {
  const id = counter.id++
  internalIdMap.set(id, item)
  if (item.items != null) {
    item.items.forEach(_ => addInternalId(internalIdMap, _, counter))
  }
  item.__id = id
}

function itemTrimmer(item: MenuItem) {
  return {
    title: item.title,
    tooltip: item.tooltip,
    checked: item.checked,
    enabled: item.enabled === undefined ? true : item.enabled,
    hidden: item.hidden,
    items: item.items,
    icon: item.icon,
    isTemplateIcon: item.isTemplateIcon,
    __id: (item as MenuItemEx).__id
  }
}

function menuTrimmer(menu: Menu) {
  return {
    icon: menu.icon,
    title: menu.title,
    tooltip: menu.tooltip,
    items: menu.items.map(itemTrimmer),
    isTemplateIcon: menu.isTemplateIcon
  }
}

function actionTrimer(action: Action) {
  if (action.type === 'update-item') {
    return {
      type: action.type,
      item: itemTrimmer(action.item),
      seq_id: action.seq_id
    }
  } else if (action.type === 'update-menu') {
    return {
      type: action.type,
      menu: menuTrimmer(action.menu)
    }
  } else if (action.type === 'update-menu-and-item') {
    return {
      type: action.type,
      item: itemTrimmer(action.item),
      menu: menuTrimmer(action.menu),
      seq_id: action.seq_id
    }
  } else {
    return {
      type: action.type
    }
  }
}

async function loadIcon(fileName: string) {
  const buffer = await fs.readFile(fileName)
  return buffer.toString('base64')
}

export default class SysTray {
  static separator: MenuItem = {
    title: '<SEPARATOR>',
    tooltip: '',
    enabled: true
  }
  protected _conf: Conf
  private _process: child.ChildProcess
  public get process(): child.ChildProcess {
    return this._process
  }
  protected _rl: readline.ReadLine
  protected _binPath: string
  private _ready: Promise<void>
  private internalIdMap = new Map<number, MenuItem>()

  constructor(conf: Conf) {
    this._conf = conf
    this._process = null!
    this._rl = null!
    this._binPath = null!
    this._ready = this.init()
  }

  private async init() {
    const conf = this._conf
    this._binPath = await getTrayBinPath(conf.debug, conf.copyDir)
    try {
      await fs.chmod(this._binPath, '+x')
    } catch (error) {
      // ignore
    }
    return new Promise<void>(async (resolve, reject) => {
      try {
        this._process = child.spawn(this._binPath, [], {
          windowsHide: true
        })
        this._process.on('error', reject)
        this._rl = readline.createInterface({
          input: this._process.stdout!
        })
        conf.menu.items.forEach(updateCheckedInLinux)
        let counter = {id: 1}
        conf.menu.items.forEach(_ => addInternalId(this.internalIdMap, _ as MenuItemEx, counter))
        await resolveIcon(conf.menu)
        if (conf.debug) {
          this._rl.on('line', data => _debug('onLine', data))
        }
        this._rl.on('line', (line: string) => {
          const action: ClickEvent = JSON.parse(line)
          if (action.type === 'clicked') {
            const item = this.internalIdMap.get(action.__id)
            action.item = Object.assign(item, action.item)
            item?.callback?.click?()
          }
        })
        this.onReady(() => {
          this.writeLine(JSON.stringify(menuTrimmer(conf.menu)))
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  ready() {
    return this._ready
  }

  onReady(listener: () => void) {
    this._rl.on('line', (line: string) => {
      const action: Event = JSON.parse(line)
      if (action.type === 'ready') {
        listener()
        if (this._conf.debug) {
          _debug('onReady', action)
        }
      }
    })
    return this
  }

  async onClick(listener: (action: ClickEvent) => void) {
    await this.ready()
    this._rl.on('line', (line: string) => {
      const action: ClickEvent = JSON.parse(line)
      if (action.type === 'clicked') {
        const item = this.internalIdMap.get(action.__id)!
        action.item = Object.assign(item, action.item)
        if (this._conf.debug) {
          _debug('onClick', action)
        }
        listener(action)
      }
    })
    return this
  }

  private writeLine(line: string) {
    if (line) {
      if (this._conf.debug) {
        _debug('writeLine', line + '\n', '=====')
      }
      this._process.stdin!.write(line.trim() + '\n')
    }
    return this
  }

  async sendAction(action: Action) {
    switch (action.type) {
      case 'update-item':
        updateCheckedInLinux(action.item)
        if (action.seq_id == null) {
          action.seq_id = -1
        }
        break
      case 'update-menu':
        action.menu = await resolveIcon(action.menu) as Menu
        action.menu.items.forEach(updateCheckedInLinux)
        break
      case 'update-menu-and-item':
        action.menu = await resolveIcon(action.menu) as Menu
        action.menu.items.forEach(updateCheckedInLinux)
        updateCheckedInLinux(action.item)
        if (action.seq_id == null) {
          action.seq_id = -1
        }
        break
    }
    if (this._conf.debug) {
      _debug('sendAction', action)
    }
    this.writeLine(JSON.stringify(actionTrimer(action)))
    return this
  }
  /**
   * Kill the systray process
   *
   * @param exitNode Exit current node process after systray process is killed, default is true
   */
  async kill(exitNode = true) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.onExit(() => {
          resolve()
          if (exitNode) {
            process.exit(0)
          }
        })
        await this.sendAction({
          type: 'exit'
        })
        // this._rl.close();
        // this._process.kill();
      } catch (error) {
        reject(error)
      }
    })
  }

  onExit(listener: (code: number | null, signal: string | null) => void) {
    this._process.on('exit', listener)
  }

  onError(listener: (err: Error) => void) {
    this._process.on('error', err => {
      if (this._conf.debug) {
        _debug('onError', err, 'binPath', this.binPath)
      }
      listener(err)
    })
  }

  get killed() {
    return this._process.killed
  }

  get binPath() {
    return this._binPath
  }
}
