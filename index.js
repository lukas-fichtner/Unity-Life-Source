/*
 * Unity-Life Launcher by Coffee-Apps
 *
 * Email: xedon@arctic-network.com
 * Web: coffee-apps.com
 */

const {ipcRenderer} = require('electron')
const {shell} = require('electron') // eslint-disable-line
const humanizeDuration = require('humanize-duration')
const fs = require('fs')
const {dialog} = require('electron').remote
const {app} = require('electron').remote
const storage = require('electron-json-storage')
const Winreg = require('winreg')
const $ = window.jQuery = require('./resources/jquery/jquery-1.12.3.min.js')
const path = require('path')
const child = require('child_process')
const twitchapi = require('twitch-api-v5');
var Chart = require('chart.js');

/* global APIBaseURL APIModsURL alertify angular */

var App = angular.module('App', ['720kb.tooltips']).run(function ($rootScope) {
  $rootScope.downloading = false
  $rootScope.ArmaPath = ''
  $rootScope.slide = 0
  $rootScope.updating = false
  $rootScope.totalProgress = 0
  $rootScope.fileName = ''
  $rootScope.fileProgress = 0
  $rootScope.speed = 0

  $rootScope.closeApp = function () {
    ipcRenderer.send('close-app')
  }

  $rootScope.minimizeApp = function () {
    ipcRenderer.send('minimize-app')
  }

  $rootScope.refresh = function () {
    getMods()
  }

  ipcRenderer.on('checking-for-update', function (event) {
    $rootScope.updating = true
  })

  ipcRenderer.on('update-not-available', function (event) {
    $rootScope.updating = false
  })

  ipcRenderer.on('update-available', function (event) {
    spawnNotification('Update verfügbar, wird geladen...')
    $rootScope.updating = false
  })
})

 //setze App Controller für den A3 Server
 App.controller('tsController', function ($scope, $http, $timeout) {
  //importiere die json von der API
   $scope.reload = function () {

    $http.get('https://api.coffee-apps.com/unitylife/ts3server/').then(function(list) {
      //gehe zu ganze liste --> data --> data --> players
      //console.log('ts3server query' + list.data)
      $scope.tshtml = list.data.data;
      $scope.tsserver = list.data.data.players;
      //erstelle neues Array für die Spieler Namen
      let allplayers = [];
      //ziehe mir die Daten aus der Liste von der API
      for (var i = 0; i < $scope.tsserver.length; i++){
          //speichere die neuen Daten in das zuvor erstelle Array
          allplayers.push($scope.tsserver[i].name);                    
      }
      //speichere die fertige Liste unter $scope.players die in der html dann aufgerufen wird
      $scope.players = allplayers;
      var d = new Date();
      $scope.unixtimestamp = d.getHours() + ':' + d.getMinutes(); 
  });
    $timeout(function(){
    $scope.reload();
    //reload every 5min
  },300000)
  };
  $scope.reload();
  $scope.refreshtime
})
      
//setze App Controller für den A3 Server
App.controller('a3Controller', function ($scope, $http, $timeout) {
  //importiere die json von der API
  $scope.reload = function () {

    $http.get('https://api.coffee-apps.com/unitylife/a3server/').then(function(list) {
      //gehe zu ganze liste --> data --> data --> players
      //console.log('a3server query' + list.data)
      $scope.armahtml = list.data.data
      $scope.a3server = list.data.data.players;
      //erstelle neues Array für die Spieler Namen
      let allplayers = [];
      //ziehe mir die Daten aus der Liste von der API
      for (var i = 0; i < $scope.a3server.length; i++){
          //speichere die neuen Daten in das zuvor erstelle Array
          allplayers.push($scope.a3server[i].name);                    
      }
      //speichere die fertige Liste unter $scope.players die in der html dann aufgerufen wird
      $scope.players = allplayers;
      var d = new Date();
      $scope.unixtimestamp = d.getHours() + ':' + d.getMinutes(); 
      
  });
    $http.get('https://unity-life.de/redirect/anzeige2.php').then(function(list) {
      //gehe zu ganze liste --> data --> data --> players
      //console.log(list.data)
      $scope.all = list.data.Gesamt
      $scope.civilians = list.data.Civilians;
      //console.log($scope.civilians )
      $scope.firedepartment = list.data.FireDepartment;
      $scope.policedepartment = list.data.PoliceDepartment;
      $scope.departmentofjustice = list.data.DepartmentofJustice;
    playersChart = new Chart($('#playersChart'), {
    type: 'doughnut',
    data: {
      labels: ['Civilians', 'FireDepartment', 'PoliceDepartment', 'DepartmentofJustice'],
      datasets: [
        {
          data:[$scope.civilians, $scope.firedepartment, $scope.policedepartment, $scope.departmentofjustice],
          backgroundColor: [
            '#7D31B2',
            '#740505',
            '#0099CC',
            '#310C0C'
          ]
        }
      ]
    },
    options: {
      responsive: false,
      legend: {
        position: 'buttom'
      },
      animation: {
        animateScale: true
      },
      tooltips: {
        displayColors: false
      }
    }
  });
  });
    $timeout(function(){
    $scope.reload()
    //reload every 5min
  },300000)
  };
  $scope.reload();
})

//sete App Controller für Twitch
App.controller('twitchController', function($scope, $timeout){
  //auto reload
  $scope.reload = function () {
      //wird benötigt ansonsten können keine Daten abgerufen werden
  twitchapi.clientID = 'uf6fu3f6lry57wa0xuthtwyc4i1i8t';
  //suche nach "unity-life.de" im Titel von allen Twitch Livestreams
  //suche alle Twitch Partner ID's raus
  twitchapi.teams.getTeam({team: 'unitylifede'}, (err, res) => {
    if (err) {
      console.log(err);
    } else {
      //console.log(res);
      $scope.data = res;
      $scope.teamusers = $scope.data.users;
    }
  })
  twitchapi.search.streams({query: 'unity-life.de'}, (err, res) => {
    if (err) {
      console.log(err);
    } else {
      //console.log(res);
      $scope.data = res;
      $scope.twtqs = $scope.data.streams;
      console.log($scope.twtqs)
    }
  })
  var d = new Date();
  $scope.unixtimestamp = d.getHours() + ':' + d.getMinutes(); 
  }; 
    $timeout(function(){
    $scope.reload()
    //reload every 5min
  },300000)
  $scope.reload();
});

//map Controller
App.controller('mapController', function($scope, $timeout){
  $scope.init = () => {
    mapLink = '<a href="https://unity-life.de">Unity-Life.de</a>';
    var nongridmap = L.tileLayer('https://webstorage1.gaming-provider.com/Projekte/Unity-Life/static/leaflet/nongridsat/{z}/{x}/{y}.png', {  
    minZoom: 2, 
    maxZoom: 6, 
    attribution: '&copy; ' + mapLink, 
    tms: true 
    });
    var gridmap = L.tileLayer('https://webstorage1.gaming-provider.com/Projekte/Unity-Life/static/leaflet/sat/{z}/{x}/{y}.png', {  
    minZoom: 2, 
    maxZoom: 6, 
    attribution: '&copy; ' + mapLink, 
    tms: true
    });
    var map = L.map('leaflet', { 
    zoomAnimation: true,
    layers: [nongridmap, gridmap] 
    }).setView([0, 0], 4);
    var baseLayers = { 
    "Karte (mit raster)": gridmap,
    "Karte (ohne raster": nongridmap
    };
    L.control.layers(baseLayers).addTo(map);
    var southWest = map.unproject([0, 16384], map.getMaxZoom());  
    var northEast = map.unproject([16384, 0], map.getMaxZoom());  
    map.setMaxBounds(new L.LatLngBounds(southWest, northEast));
  }
})

App.controller('modController', ['$scope', '$rootScope', function ($scope, $rootScope) {
  $scope.state = 'Gestoppt'
  $scope.hint = 'Inaktiv'
  $rootScope.downloading = false
  $scope.totalSize = 0
  $scope.totalDownloaded = 0
  $scope.totalETA = ''
  $scope.fileProgress = ''

  $('#modScroll').perfectScrollbar({wheelSpeed: 0.5})
  $('#playerScroll').perfectScrollbar({wheelSpeed: 0.5, suppressScrollX: true})
  $('#playerScrollb').perfectScrollbar({wheelSpeed: 0.5, suppressScrollX: true})


  ipcRenderer.on('to-app', function (event, args) {
    switch (args.type) {
      case 'mod-callback':
        $scope.mods = args.data.data
        $scope.loading = false
        $scope.checkUpdates()
        $scope.$apply()
        break
      case 'update-dl-progress-server':
        $scope.update({
          state: 'Download läuft',
          hint: '',
          downloading: true,
          downSpeed: toMB(args.state.speed),
          totalProgress: toFileProgress(args.state.totalSize, args.state.totalDownloaded + args.state.size.transferred),
          totalSize: toGB(args.state.totalSize),
          totalDownloaded: toGB(args.state.totalDownloaded + args.state.size.transferred),
          totalETA: humanizeDuration(Math.round(((args.state.totalSize - (args.state.totalDownloaded + args.state.size.transferred)) / args.state.speed) * 1000), {
            language: 'de',
            round: true
          }),
          fileName: args.state.fileName,
          fileProgress: toProgress(args.state.percent)
        })
        $scope.$apply()
        break
      case 'status-change':
        $scope.update({
          state: args.status,
          hint: args.hint,
          downloading: args.downloading,
          downSpeed: 0,
          totalProgress: '',
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          fileName: '',
          fileProgress: ''
        })
        break
      case 'update-hash-progress':
        $scope.update({
          state: 'Dateien werden geprüft',
          hint: '5 - 10 Minuten',
          downloading: true,
          downSpeed: 0,
          totalProgress: toProgress(args.state.index / args.state.size),
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          fileName: args.fileName,
          fileProgress: 1,
          pgbar: 1
        })
        break
      case 'update-hash-progress-done':
        $scope.update({
          state: 'Abgeschlossen',
          hint: '',
          downloading: false,
          downSpeed: 0,
          totalProgress: 100,
          totalSize: 0,
          totalDownloaded: 0,
          totalETA: '',
          fileName: '',
          fileProgress: ''
        })
        var size = 0
        for (var i = 0; i < args.list.length; i++) {
          size += args.list[i].Size
        }
        if (size !== 0) {
          $scope.initListDownload(args.list, args.mod)
          spawnNotification('Aktualisiere ' + args.list.length + ' Dateien (' + toGB(size) + ' GB)')
          $scope.$apply()
        } else {
          spawnNotification('Mod ist Aktuell.')
          $scope.reset()
        }
        break
      case 'update-dl-progress-done':
        $scope.state = 'Abgeschlossen'
        $scope.progress = 100
        spawnNotification('Download abgeschlossen.')
        $scope.reset()
        $scope.checkUpdates()
        break
      case 'cancelled':
        $scope.reset()
        break
      case 'update-quickcheck':
        for (var j = 0; j < $scope.mods.length; j++) {
          if ($scope.mods[j].Id === args.mod.Id) {
            if (args.update === 0) {
              $scope.mods[j].state = [1, 'Download']
            } else if (args.update === 1) {
              $scope.mods[j].state = [2, 'Update']
            } else {
              $scope.mods[j].state = [3, 'Spielen']
            }
          }
        }
        $scope.$apply()
        break
    }
  })

  $scope.reset = function () {
    $scope.update({
      state: 'Gestoppt',
      hint: '',
      downloading: false,
      downSpeed: 0,
      totalProgress: '',
      totalSize: 0,
      totalDownloaded: 0,
      totalETA: '',
      fileName: '',
      fileProgress: ''
    })
  }

  $scope.refresh = function () {
    getMods()
  }

  $scope.init = function () {
    $scope.loading = true
    try {
      fs.lstatSync(app.getPath('userData') + '\\settings.json')
      storage.get('settings', function (error, data) {
        if (error) throw error
        $rootScope.ArmaPath = data.armapath
        getMods()
      })
    } catch (e) {
      $scope.checkregkey1()
    }
  }

  $scope.initDownload = function (mod) {
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-dwn',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initHash = function (mod) {
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-hash',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initUpdate = function (mod) {
    ipcRenderer.send('to-dwn', {
      type: 'start-mod-update',
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.initListDownload = function (list, mod) {
    $scope.update({
      state: 'Download startet',
      hint: '',
      downloading: true,
      downSpeed: 0,
      totalProgress: 0,
      totalSize: 0,
      totalDownloaded: 0,
      totalETA: '',
      fileName: '',
      fileProgress: ''
    })
    ipcRenderer.send('to-dwn', {
      type: 'start-list-dwn',
      list: list,
      mod: mod,
      path: $rootScope.ArmaPath
    })
  }

  $scope.cancel = function () {
    ipcRenderer.send('to-dwn', {
      type: 'cancel'
    })
  }

  $scope.update = function (update) {
    $scope.state = update.state
    $scope.hint = update.hint
    $rootScope.downloading = update.downloading
    $rootScope.speed = update.downSpeed
    $rootScope.totalProgress = update.totalProgress
    $scope.totalSize = update.totalSize
    $scope.totalDownloaded = update.totalDownloaded
    $scope.totalETA = update.totalETA
    $rootScope.fileName = update.fileName
    $rootScope.fileProgress = update.fileProgress
    $scope.$apply()
  }

  $scope.$watch(
    'totalProgress', function () {
      ipcRenderer.send('winprogress-change', {
        progress: $scope.totalProgress / 100
      })
    }, true)

  $rootScope.$watch(
    'ArmaPath', function () {
      if ($scope.mods !== undefined) {
        $scope.checkUpdates()
      }
    }, true)

    $scope.action = function (mod) {
      switch (mod.state[0]) {
          case 1:
              $scope.initDownload(mod)
              break
          case 2:
              $scope.initUpdate(mod)
              break
          case 3:
              storage.get('settings', function (err, data) {
                  if (err) throw err

                  var ip = '79.133.48.120';
                  var port = '2302';
                  var params = []

                  params.push('-noLauncher')
                  params.push('-useBE')
                  params.push('-connect=' + ip)
                  params.push('-port=' + port)
                  params.push('-password=' + 2018)
                  params.push('-mod=' + mod.Directories)

                  
                  if (data.splash) {
                      params.push('-nosplash')
                  }
                  if (data.intro) {
                      params.push('-skipIntro')
                  }
                  if (data.ht) {
                      params.push('-enableHT')
                  }
                  if (data.windowed) {
                      params.push('-window')
                  }

                  if (data.mem !== null && data.mem !== '' && typeof data.mem !== 'undefined') {
                      params.push('-maxMem=' + data.mem)
                  }
                  if (data.vram !== null && data.vram !== '' && typeof data.vram !== 'undefined') {
                      params.push('-maxVRAM=' + data.vram)
                  }
                  if (data.cpu !== null && data.cpu !== '' && typeof data.cpu !== 'undefined') {
                      params.push('-cpuCount=' + data.cpu)
                  }
                  if (data.thread !== null && data.thread !== '' && typeof data.thread !== 'undefined') {
                      params.push('-exThreads=' + data.thread)
                  }
                  if (data.add_params !== null && data.add_params !== '' && typeof data.add_params !== 'undefined') {
                      params.push(data.add_params)
                  }

                  spawnNotification('Arma wird gestartet...')
                  child.spawn((data.armapath + '\\arma3launcher.exe'), params, [])
              })
              break
          default:
              break
      }
  }

  $scope.openModDir = function (mod) {
      shell.showItemInFolder($rootScope.ArmaPath + '\\' + mod.Directories + '\\addons')
}
  
  $scope.checkUpdates = function () {
    for (var i = 0; i < $scope.mods.length; i++) {
      if ($scope.mods[i].HasGameFiles) {
        if ($rootScope.ArmaPath !== '') {
          $scope.mods[i].state = [0, 'Wird überprüft']
          ipcRenderer.send('to-dwn', {
            type: 'start-mod-quickcheck',
            mod: $scope.mods[i],
            path: $rootScope.ArmaPath
          })
        } else {
          $scope.mods[i].state = [0, 'Arma 3 Pfad nicht gesetzt']
        }
      } else {
        $scope.mods[i].state = [3, 'Spielen']
      }
    }
  }

  $scope.savePath = function (path) {
    if (path !== false) {
      alertify.set({labels: {ok: 'Richtig', cancel: 'Falsch'}})
      alertify.confirm('Arma Pfad gefunden: ' + path, function (e) {
        if (e) {
          $rootScope.ArmaPath = path + '\\'
          storage.set('settings', {armapath: $rootScope.ArmaPath}, function (error) {
            if (error) throw error
          })
          getMods()
        } else {
          $('#settingsTab').tab('show')
        }
      })
    } else {
      $('#settingsTab').tab('show')
    }
  }

  $scope.checkregkey1 = function () {
    var regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410'
    })

    regKey.keyExists(function (err, exists) {
      if (err) throw err
      if (exists) {
        regKey.values(function (err, items) {
          if (err) throw err
          if (fs.existsSync(items[3].value + '\\arma3.exe')) {
            $scope.savePath(items[3].value)
          } else {
            $scope.checkregkey2()
          }
        })
      } else {
        $scope.checkregkey2()
      }
    })
  }

  $scope.checkregkey2 = function () {
    var regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 107410'
    })

    regKey.keyExists(function (err, exists) {
      if (err) throw err
      if (exists) {
        regKey.values(function (err, items) {
          if (err) throw err
          if (fs.existsSync(items[3].value + '\\arma3.exe')) {
            $scope.savePath(items[3].value)
          } else {
            $scope.checkregkey3()
          }
        })
      } else {
        $scope.checkregkey3()
      }
    })
  }

  $scope.checkregkey3 = function () {
    var regKey = new Winreg({
      hive: Winreg.HKLM,
      key: '\\SOFTWARE\\WOW6432Node\\bohemia interactive studio\\ArmA 3'
    })

    regKey.keyExists(function (err, exists) {
      if (err) throw err
      if (exists) {
        regKey.values(function (err, items) {
          if (err) throw err
          if (fs.existsSync(items[0].value + '\\arma3.exe')) {
            $scope.savePath(items[0].value)
          } else {
            $scope.savePath(false)
          }
        })
      } else {
        $scope.savePath(false)
      }
    })
  }
}
])

App.controller('settingsController', ['$scope', '$rootScope', function ($scope, $rootScope,$timeout) {
  $scope.init = function () {
    storage.get('settings', function (error, data) {
      if (error) throw error

      $rootScope.ArmaPath = data.armapath
      $scope.splash = data.splash
      if ($scope.splash) {
        $('#splashCheck').iCheck('check')
      }
      $scope.intro = data.intro
      if ($scope.intro) {
        $('#introCheck').iCheck('check')
      }
      $scope.ht = data.ht
      if ($scope.ht) {
        $('#htCheck').iCheck('check')
      }
      $scope.windowed = data.windowed
      if ($scope.windowed) {
        $('#windowedCheck').iCheck('check')
      }
      $scope.mem = parseInt(data.mem)
      $scope.cpu = parseInt(data.cpu)
      $scope.vram = parseInt(data.vram)
      $scope.thread = parseInt(data.thread)
      $scope.add_params = data.add_params
      $scope.loaded = true
    })
  }

  $('#splashCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.splash = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.splash = false
      $scope.saveSettings()
    }
  })

  $('#introCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.intro = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.intro = false
      $scope.saveSettings()
    }
  })

  $('#htCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.ht = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.ht = false
      $scope.saveSettings()
    }
  })

  $('#windowedCheck').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $scope.windowed = true
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $scope.windowed = false
      $scope.saveSettings()
    }
  })

  $('#lightSwitch').on('ifChecked', function (event) {
    if ($scope.loaded) {
      $rootScope.theme = 'light'
      $rootScope.$apply()
      $scope.saveSettings()
    }
  }).on('ifUnchecked', function (event) {
    if ($scope.loaded) {
      $rootScope.theme = 'dark'
      $rootScope.$apply()
      $scope.saveSettings()
    }
  })

  $scope.saveSettings = function () {
    storage.set('settings', {
      armapath: $rootScope.ArmaPath,
      splash: $scope.splash,
      intro: $scope.intro,
      ht: $scope.ht,
      windowed: $scope.windowed,
      mem: $scope.mem,
      cpu: $scope.cpu,
      vram: $scope.vram,
      thread: $scope.thread,
      add_params: $scope.add_params,
      theme: $rootScope.theme
    }, function (error) {
      if (error) throw error
    })
  }

  $scope.chooseArmaPath = function () {
    var options = {
      filters: [{
        name: 'arma3_x64',
        extensions: ['exe']
      }],
      title: 'Bitte wähle deine arma3_x64.exe aus',
      properties: ['openFile']
    }
    var path = String(dialog.showOpenDialog(options))
    if (path !== 'undefined' && path.indexOf('\\arma3_x64.exe') > -1) {
      $rootScope.ArmaPath = path.replace('arma3_x64.exe', '')
      $scope.saveSettings()
      $rootScope.refresh()
    } else {
      $rootScope.ArmaPath = ''
      $scope.saveSettings()
    }
  }
}])

App.controller('aboutController', ['$scope', function ($scope) {
  $scope.version = app.getVersion()
}])

function getMods () {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: 'mod-callback',
    url: APIBaseURL + APIModsURL,
    callBackTarget: 'to-app'
  })
}

function toGB (val) {
  return (val / 1000000000).toFixed(3)
}

function toMB (val) {
  return (val / 1000000).toFixed(3)
}

function toProgress (val) {
  return (val * 100).toFixed(3)
}

function toFileProgress (filesize, downloaded) {
  return (100 / filesize * downloaded).toFixed(2)
}

function spawnNotification (message) {
  new Notification('Unity-Life', { // eslint-disable-line
    body: message
  })
}

function appLoaded () { // eslint-disable-line
  ipcRenderer.send('app-loaded')
}

ipcRenderer.on('update-downloaded', function (event, meta) {
  spawnNotification('Update ' + meta.version + ' bereit.')
  alertify.set({labels: {ok: 'Update', cancel: 'Abbrechen'}})
  alertify.confirm('Update zur Version ' + meta.version + ' bereit.', function (e) {
    if (e) {
      ipcRenderer.send('restart-update')
    }
  })
})
