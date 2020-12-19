var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;
var Menu = require('electron').Menu;
var mainWindow = null;
var path = require('path');

var template = [
    {
        label: 'Electron',
        submenu: [
            {
                label: 'Quit',
                accelerator: 'Command+Q',
                click: function () {
                    app.quit();
                }
            },
        ]
    },
    {
        label: 'Edit',
        submenu: [
            {label: 'Undo', accelerator: 'Command+Z', selector: 'undo:'},
            {label: 'Redo', accelerator: 'Command+Shift+Z', selector: 'redo:'},
            {type: 'separator'},
            {label: 'Cut', accelerator: 'Command+X', selector: 'cut:'},
            {label: 'Copy', accelerator: 'Command+C', selector: 'copy:'},
            {label: 'Paste', accelerator: 'Command+V', selector: 'paste:'},
            {label: 'Select All', accelerator: 'Command+A', selector: 'selectAll:'}
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'Command+R',
                click: function () {
                    BrowserWindow.getFocusedWindow().reloadIgnoringCache();
                }
            },
            {
                label: 'Toggle DevTools',
                accelerator: 'Alt+Command+I',
                click: function () {
                    BrowserWindow.getFocusedWindow().toggleDevTools();
                }
            }
        ]
    }
];

app.on('window-all-closed', function () {
    if (process.platform != 'darwin')
        app.quit();
});


app.on('ready', function () {
    //set the context menu
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));

    mainWindow = new BrowserWindow({width: 1280, height: 720, resizable: true, title: 'Checkerboard Programming Challenge', webPreferences: {nodeIntegration: true}});
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
});
