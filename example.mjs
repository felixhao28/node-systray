/* eslint-disable @typescript-eslint/naming-convention */
import os from 'os'
import SysTray from './index.js'

const item1 = {
  title: 'aa',
  tooltip: 'bb',
  // checked is implemented by plain text in linux
  checked: false,
  enabled: true,
  // click is not a standard property but a custom value
  click: () => {
    item1.checked = !item1.checked
    systray.sendAction({
      type: 'update-item',
      item: item1,
    })
    // toggle item 2
    itemExit.hidden = !itemExit.hidden
    systray.sendAction({
      type: 'update-item',
      item: itemExit,
    })
  }
}
const item2 = {
  title: 'aa2',
  tooltip: 'bb',
  checked: false,
  enabled: true,
  icon: os.platform() === 'win32' ? './logo_s.ico' : './logo_s.png',
  // hidden
  hidden: false,
  // add a submenu item
  items: [{
    title: 'Submenu',
    tooltip: 'this is a submenu item',
    checked: false,
    enabled: true,
    icon: os.platform() === 'win32' ? './logo_s.ico' : './logo_s.png',
    click: () => {
      // open the url
      console.log('open the url')
    }
  }]
}
const itemExit = {
  title: 'Exit',
  tooltip: 'bb',
  checked: false,
  enabled: true,
  click: () => {
    systray.kill(false)
  }
}
const systray = new SysTray.default({
  menu: {
    // you should use .png icon on macOS/Linux, and .ico format on Windows
    icon: os.platform() === 'win32' ? './logo_s.ico' : './logo_s.png',
    isTemplateIcon: os.platform() === 'darwin',
    title: '标题',
    tooltip: 'Tips',
    items: [
      item1,
      SysTray.default.separator, // SysTray.separator is equivalent to a MenuItem with "title" equals "<SEPARATOR>"
      item2,
      itemExit
    ]
  },
  debug: false,
  copyDir: false // copy go tray binary to outside directory, useful for packing tool like pkg.
})

systray.onClick(action => {
  if (action.item.click != null) {
    action.item.click()
  }
})

// Systray.ready is a promise which resolves when the tray is ready.
systray.ready().then(() => {
  systray.process.stderr?.on('data', (chunk) => {
    console.log(chunk.toString())
  })
  console.log('systray started!')
})
