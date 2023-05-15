# node-systray

> SysTray2 library for nodejs using [systray-portable](https://github.com/felixhao28/systray-portable) (a portable version of [the go systray library](https://github.com/getlantern/systray)).


## Install
```sh
npm i systray3
# or
yarn add systray3
```

## Usage

### Simple Example

This example shows how to display a menu with two menu items, and how to handle mouse click events and exit the tray process.

```ts
import SysTray from 'systray3';
import os from 'os'

const item = {
  title: 'Show Exit Button',
  tooltip: 'This menu item will toggle the display of the exit button.',
  // The "checked" property will create a check mark on the side of this menu item.
  // To dynamically update the display of the check mark, use the "sendAction" method, as shown below.
  // Note that "checked" is implemented by plain text in linux
  checked: false,
  enabled: true,
}

const itemExit = {
  title: 'Exit',
  tooltip: 'bb',
  checked: false,
  enabled: true,
}

// Simple menu example
const systray = new SysTray({
  menu: {
    // you should use .png icon on macOS/Linux, and .ico format on Windows
    icon: os.platform() === 'win32' ? './logo_s.ico' : './logo_s.png',
    // a template icon is a transparency mask that will appear to be dark in light mode and light in dark mode
    isTemplateIcon: os.platform() === 'darwin',
    title: '标题',
    tooltip: 'Tips',
    items: [
      item,
      itemExit
    ]
  },
  debug: false,
  copyDir: false // copy go tray binary to an outside directory, useful for packing tool like pkg.
})

// The actual handling of the click events.
// This is obviously important if you want your MenuItems to react to mouse clicks.
systray.onClick(action => {
  if (action.item.title === "Exit") {
    systray.kill(false)
  } else {
    console.log("menu item clicked!")
  }
})

// Systray.ready is a promise which resolves when the tray is ready.
systray.ready().then(() => {
  console.log('systray started!')
}).catch(err => {
  console.log('systray failed to start: ' + err.message)
})
```

### Reactive Menu Example

This example shows how to use checkbox-style menu items and menus with sub menu items.

```ts
import SysTray from 'systray2';
import os from 'os'

/**
 * Represents a user-defined clickable MenuItem.
 * `click` here is a custom property. You can name it whatever you want, but it should
 * be in consistent with the name used in the systray.onClick callback.
 *
 * You do not necessarily need this type. But in most cases, you will need some ways to
 * react to the mouse clicks.
 *
 * The actual code for handling click events can be found at the end of the code sample.
 * ```
 * systray.onClick(action => {
 *   if (action.item.click != null) {
 *     action.item.click()
 *   }
 * })
 * ```
 */
interface MenuItemClickable extends MenuItem {
  click?: () => void;
  items?: MenuItemClickable[];
}

const item1: MenuItemClickable = {
  title: 'Show Exit Button',
  tooltip: 'This menu item will toggle the display of the exit button.',
  // The "checked" property will create a check mark on the side of this menu item.
  // To dynamically update the display of the check mark, use the "sendAction" method, as shown below.
  // Note that "checked" is implemented by plain text in linux
  checked: false,
  enabled: true,
  // click is not a standard property but a custom value
  click: () => {
    // change the state
    item1.checked = !item1.checked
    // and then send it to the background tray service.
    systray.sendAction({
      type: 'update-item',
      item: item1,
    })
    // toggle Exit
    itemExit.hidden = !itemExit.hidden
    systray.sendAction({
      type: 'update-item',
      item: itemExit,
    })
  }
}
const item2: MenuItemClickable = {
  title: 'Submenu Parent',
  tooltip: 'this is the parent menu',
  checked: false,
  enabled: true,
  hidden: false,
  // add a submenu item
  items: [{
    title: 'Submenu',
    tooltip: 'this is a submenu item',
    checked: false,
    enabled: true,
    click: () => {
      // open the url
      console.log('open the url')
    }
  }]
}
const itemExit: MenuItemClickable = {
  title: 'Exit',
  tooltip: 'bb',
  checked: false,
  enabled: true,
  click: () => {
    systray.kill(false)
  }
}
const systray = new SysTray({
  menu: {
    // you should use .png icon on macOS/Linux, and .ico format on Windows
    icon: os.platform() === 'win32' ? './logo_s.ico' : './logo_s.png',
    // a template icon is a transparency mask that will appear to be dark in light mode and light in dark mode
    isTemplateIcon: os.platform() === 'darwin',
    title: '标题',
    tooltip: 'Tips',
    items: [
      item1,
      SysTray.separator, // SysTray.separator is equivalent to a MenuItem with "title" equals "<SEPARATOR>"
      item2,
      itemExit
    ]
  },
  debug: false,
  copyDir: false // copy go tray binary to an outside directory, useful for packing tool like pkg.
})

// The actual handling of the click events.
// This is obviously important if you want your MenuItems to react to mouse clicks.
systray.onClick(action => {
  if (action.item.click != null) {
    action.item.click()
  }
})

// Systray.ready is a promise which resolves when the tray is ready.
systray.ready().then(() => {
  console.log('systray started!')
}).catch(err => {
  console.log('systray failed to start: ' + err.message)
})

```

To integrate with packing tools like `webpack`, use something like `copy-webpack-plugin` to copy the desired `tray_*_release[.exe]` to the `traybin/` folder of the working directory.

## Known Issues

Toggling `hiding` on a menu item with a sub-menu causes the sub-menu to disappear.

## License
MIT
