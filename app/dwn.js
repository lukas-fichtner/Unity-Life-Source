var fs = require('fs')
var request = require('request')
var progress = require('request-progress')
var mkpath = require('mkpath')
var hasha = require('hasha')
const {ipcRenderer} = require('electron')

var cancel = false
var downloaded = 0

var path = ''

/* global APIBaseURL APIModHashlistURL */

ipcRenderer.on('to-dwn', function (event, args) {
  switch (args.type) {
    case 'start-mod-dwn':
      cancel = false
      path = args.path
      getHashlist(args.mod, 'hashlist-callback-dwn')
      break
    case 'start-mod-hash':
      cancel = false
      path = args.path
      getHashlist(args.mod, 'hashlist-callback-hash')
      break
    case 'start-mod-quickcheck':
      cancel = false
      path = args.path
      getHashlist(args.mod, 'hashlist-callback-quickcheck')
      break
    case 'start-mod-update':
      cancel = false
      path = args.path
      getHashlist(args.mod, 'hashlist-callback-hash')
      /* Diese ist nur zum test ausgeklammert um das file delete Problem zu lösen
      getHashlist(args.mod, 'hashlist-callback-update') 
      */
      break
    case 'hashlist-callback-dwn':
      cancel = false
      dwnMod(args)
      break
    case 'hashlist-callback-hash':
      cancel = false
      hashMod(args)
      break
    case 'hashlist-callback-update':
      cancel = false
      updateMod(args)
      break
    case 'start-list-dwn':
      cancel = false
      path = args.path
      dwnlist(args)
      break
    case 'hashlist-callback-quickcheck':
      cancel = false
      quickchecklist(args)
      break
    case 'cancel':
      cancel = true
      break
  }
})

function dwnMod (args) {
  downloaded = 0
  downloadFileRecursive(args.data.data, 0, path, args.args.mod.DownloadUrl)
}

function dwnlist (args) {
  downloaded = 0
  downloadFileRecursive(args.list, 0, path, args.mod.DownloadUrl)
}

const updateMod = (args) => {
  var dllist = []
  quickCheckRecursiveList(args.data.data, 0, path, dllist, args.args.mod)
}

function quickchecklist (args) {
  try {
    fs.lstatSync(path + args.args.mod.Directories)
    quickCheckRecursive(args.data.data, 0, path, args.args.mod)
  } catch (e) {
    console.log(e)
    ipcRenderer.send('to-app', {
      type: 'update-quickcheck',
      update: 0,
      mod: args.args.mod
    })
  }
}

function hashMod (args) {
  var dllist = []
  cleanFileRecursive(listDiff(args.data.data, path, args.args.mod), 0, path, hashFileRecursive, args.data.data, 0, path, dllist, args.args.mod)
}

function getHashlist (mod, callback) {
  ipcRenderer.send('to-web', {
    type: 'get-url',
    callback: callback,
    url: APIBaseURL + APIModHashlistURL + mod.Id,
    callBackTarget: 'to-dwn',
    mod: mod
  })
}

function findFileInList (list, path, basepath) {
  var found = false
  list.forEach(function (listvalue) {
    if (basepath.replace(/\\/g, '/') + listvalue.RelativPath.replace(/\\/g, '/') === path.replace(/\\/g, '/')) {
      found = true
    }
  })
  return [found, path]
}

function listDiff (list, basepath, mod) {
  var files = walkFolder(basepath + mod.Directories)
  var toDelete = []
  files.forEach(function (filesvalue) {
    var search = findFileInList(list, filesvalue, basepath)
    if (!search[0]) {
      toDelete.push(search[1])
    }
  })
  return toDelete
}

function cleanFileRecursive (list, index, basepath, callback, hashlist, hashIndex, path, dllist, mod) {
  var dest = list[index]

  try {
    fs.unlink(dest)
    if (list.length > index + 1) {
      cleanFileRecursive(list, index + 1, basepath, callback, hashlist, hashIndex, dllist, mod)
    } else {
      callback(hashlist, hashIndex, path, dllist, mod)
    }
  } catch (e) {
    if (list.length > index + 1) {
      cleanFileRecursive(list, index + 1, basepath, callback, hashlist, hashIndex, dllist, mod)
    } else {
      callback(hashlist, hashIndex, path, dllist, mod)
    }
  }
}

function downloadFileRecursive (list, index, basepath, dlserver) {
  var dest = basepath + list[index].RelativPath
  var folder = dest.replace(list[index].FileName, '')
  var stats

  try {
    stats = fs.lstatSync(folder)
    stats.isDirectory()
    dlFileCallback(list, index, dest, basepath, dlserver)
  } catch (e) {
    mkpath(folder, function () {
      dlFileCallback(list, index, dest, basepath, dlserver)
    })
  }
}

function dlFileCallback (list, index, dest, basepath, dlserver) {
  //changeStatus(true, 'Server - Verbunden', '')
  var size = 0
  for (var i = 0; i < list.length; i++) {
    size += list[i].Size
  }
  var requestobj = null
  progress(requestobj = request(dlserver + list[index].RelativPath), {}).on('progress', function (state) {
    if (cancel) {
      requestobj.abort()
    }
    state.totalSize = size
    state.totalDownloaded = downloaded
    state.fileName = list[index].FileName
    state.fileSize = list[index].Size
    if (state.speed) {
      updateProgressServer(state)
    }
    
  }).on('error', function (err) {
    console.log(err)
  }).on('end', function () {
    downloaded += list[index].Size
    if (cancel) {
      cancel = false
      cancelled()
    } else {
      if (list.length > index + 1) {
        downloadFileRecursive(list, index + 1, basepath, dlserver)
      } else {
        downloadFinished()
      }
    }
  }).pipe(fs.createWriteStream(dest))
}

function hashFileRecursive (list, index, basepath, dllist, mod) {
  var dest = basepath + list[index].RelativPath
  var folder = dest.replace(list[index].FileName, '')

  if (cancel) {
    cancel = false
    cancelled()
  } else {
    updateProgressHash({
      index: index,
      size: list.length
    }, list[index].FileName, mod)

    try {
      fs.lstatSync(folder)
      fs.lstatSync(dest)
      hasha.fromFile(dest, {algorithm: 'md5'}).then(function (hash) {
        if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
          dllist.push(list[index])
        }
        if (list.length > index + 1) {
          hashFileRecursive(list, index + 1, basepath, dllist, mod)
        } else {
          finishProgressHash(dllist, mod)
        }
      })
    } catch (e) {
      dllist.push(list[index])
      if (list.length > index + 1) {
        hashFileRecursive(list, index + 1, basepath, dllist, mod)
      } else {
        finishProgressHash(dllist, mod)
      }
    }
  }
}

function downloadFinished (args) {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-done'
  })
}

function updateProgressServer (state) {
  ipcRenderer.send('to-app', {
    type: 'update-dl-progress-server',
    state: state
  })
}

function changeStatus (downloading, status, hint) {
  ipcRenderer.send('to-app', {
    type: 'status-change',
    status: status,
    downloading: downloading,
    hint: hint
  })
}

function cancelled () {
  ipcRenderer.send('to-app', {
    type: 'cancelled'
  })
}

function updateProgressHash (state, filename, mod) {
  ipcRenderer.send('to-app', {
    type: 'update-hash-progress',
    state: state,
    fileName: filename,
    mod: mod
  })
}

function finishProgressHash (list, mod) {
  console.log(list, mod)
  ipcRenderer.send('to-app', {
    type: 'update-hash-progress-done',
    list: list,
    mod: mod
  })
}

function quickCheckRecursive (list, index, basepath, mod) {
  try {
    var dest = basepath + list[index].RelativPath
    var stats
    stats = fs.lstatSync(dest)
    if (dest.includes('.bisign')) {
      hasha.fromFile(dest, {algorithm: 'md5'}).then(function (hash) {
        if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
          ipcRenderer.send('to-app', {
            type: 'update-quickcheck',
            update: 1,
            mod: mod
          })
        } else {
          if (list.length > index + 1) {
            quickCheckRecursive(list, index + 1, basepath, mod)
          } else {
            ipcRenderer.send('to-app', {
              type: 'update-quickcheck',
              update: 2,
              mod: mod
            })
          }
        }
      })
    } else if (list[index].Size !== stats.size) {
      ipcRenderer.send('to-app', {
        type: 'update-quickcheck',
        update: 1,
        mod: mod
      })
    } else {
      if (list.length > index + 1) {
        quickCheckRecursive(list, index + 1, basepath, mod)
      } else {
        ipcRenderer.send('to-app', {
          type: 'update-quickcheck',
          update: 2,
          mod: mod
        })
      }
    }
  } catch (e) {
    ipcRenderer.send('to-app', {
      type: 'update-quickcheck',
      update: 1,
      mod: mod
    })
  }
}

function quickCheckRecursiveList (list, index, basepath, dllist, mod) {
  console.log(index)
  console.log(list.length)
  try {
    var dest = basepath + list[index].RelativPath
    var stats
    stats = fs.lstatSync(dest)
    if (dest.includes('.bisign')) {
      hasha.fromFile(dest, {algorithm: 'md5'}).then(function (hash) {
        if (list[index].Hash.toUpperCase() !== hash.toUpperCase()) {
          dllist.push(list[index])
          if (list.length > index + 1) {
            quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
          } else {
            finishProgressHash(dllist, mod)
          }
        } else {
          if (list.length > index + 1) {
            quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
          } else {
            finishProgressHash(dllist, mod)
          }
        }
      })
    } else if (list[index].Size !== stats.size) {
      dllist.push(list[index])
      if (list.length > index + 1) {
        quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
      } else {
        finishProgressHash(dllist, mod)
      }
    } else {
      if (list.length > index + 1) {
        quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
      } else {
        finishProgressHash(dllist, mod)
      }
    }
  } catch (e) {
    dllist.push(list[index])
    if (list.length > index + 1) {
      quickCheckRecursiveList(list, index + 1, basepath, dllist, mod)
    } else {
      finishProgressHash(dllist, mod)
    }
  }
}

function walkFolder (dir) {
  var results = []
  var list = fs.readdirSync(dir)
  list.forEach(function (file) {
    file = dir + '/' + file
    var stat = fs.statSync(file)
    if (stat && stat.isDirectory()) results = results.concat(walkFolder(file))
    else results.push(file)
  })
  return results
}
