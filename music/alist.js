window.AList = {
  getToken: () => getStorageExp('alist_token'),
  getApiToken: () => request.post(`/api/auth/login`, { username: alist[2], password: alist[3] }).then(({ data }) => data.token ).catch(() => null),
  getFileInfo: (path) => request.post(`/api/fs/get`, { path }),
  getRawFile: (path, params) => request.get(`/p${path}`, { params }),
  uploadRawFile: (data, path) => request.put(`/api/fs/form`, data, { headers: { 'File-Path': encodeURIComponent(path)} }), // 'Content-Type': 'multipart/form-data', 
  listAllSong: async (path, isForce) => {
    let result = []
    try {
      result = await AList.listSong(path, 1, [], isForce) // 从根目录开始
    } catch (e) { }
    return result
  },
  // 获取文件目录的递归函数
  listSong:  async (path = '', depth = 1, result = [], isForce) => {
    if (depth > 5) return result // 最大递归深度为 5
    try {
      const url = `/api/fs/list${isForce ? ('?t=' + new Date().getTime()) : ''}`
      const res = await request({ url, method: 'post', data: { path }})
      const files = res.data.content || []
  
      for (const file of files) {
        const filePath = `${path}/${file.name}`
        if (file.is_dir) {
          await AList.listSong(filePath, depth + 1, result, isForce)
        } else {
          // 如果是文件，加入到结果中
          result.push({ name: file.name, path: path, is_dir: file.is_dir, size: file.size })
        }
      }
    } catch (e) { }
    return result
  }
}
window.resetAlist = () => {};
function isMusic(val) { return /\.(mp3|wav|aac|flac)$/i.test(val) } // |wma 浏览器不支持
function getFileName(val) { return val.lastIndexOf('.') === -1 ? val : val.slice(0, val.lastIndexOf('.')) }

function handleSongs(songs) {
  songs.forEach(item => {
    if (!isMusic(item.name)) return;
    item.id = md5(item.path + item.name).slice(0, 8)
    item.m = true
    item.artist = item.path;
    item.source = 'alist'
    const one = songs.find(x => `${getFileName(item.name)}.lrc`.toLowerCase() === x.name.toLowerCase())
    one && (item.lyric = `${one.path}/${one.name}`, item.album = '[本地歌词]')
  })
}

let urlObj = Object.fromEntries(new URLSearchParams(location.search))
window.isAList = urlObj.t && urlObj.t == 'a'
!(async function() {
  if (!isAList) return; // ?t=a  开启AList
  
  window.alist = await getStorage('alist_config')
  if (!alist) {
    alist = (prompt('请输入alist: alist域名|音乐绝对路径|username|password', 'http://.199311.xyz:25244|/Local/Music||') || '').split('|')
    if (alist.length != 4) return;
    setStorage('alist_config', alist)
  }
  window.AListUrl = alist[0]
  window.request = axios.create({ baseURL: AListUrl })
  request.interceptors.response.use(({data}) => data)
  if (!AList.getToken()) {
    let token = await AList.getApiToken()
    if (!token) return showNotification('登录失败，无法获取AList Token', 'error');
    setStorageExp('alist_token', token, 24 * 60 * 60)
  }
  request.defaults.headers['Authorization'] = AList.getToken()
  // 请求播放列表
  window.musicList = await getStorage('alist_MusicList')
  if (!musicList) {
    let songs = await AList.listAllSong(alist[1])
    if (!songs || !songs.length) return showNotification('获取音乐列表失败', 'error');
    handleSongs(songs);  console.log(songs);
    musicList = songs.filter(item => item.m)
    setStorage('alist_MusicList', musicList)
  }
  vueApp.searchResults = musicList
  // 获取搜索项
  window.singers = await getStorage('alist_options')
  if (!singers) {
    const singerFile = `${alist[1]}/search.json`
    const { data } = await AList.getFileInfo(singerFile)
    if (data && data.raw_url) {
      const res = await AList.getRawFile(singerFile, { sign: data.sign, alist_ts: Date.now() })
      if (res.singers && res.singers.length) {
        window.singers = res.singers
        setStorage('alist_options', singers)
      }
    }
  }
  if (singers && singers.length) {
    vueApp.options = [{ k: '全部歌手', v: '' }].concat(singers.map(x => ({ k: x, v: x })))
    vueApp.selectedSource = ''
  }
})()
window.lyricSources = ['tencent','netease','kuwo','kugou', 'joox', 'migu', 'spotify', 'deezer']
window.currLyricSource = 0
if (isAList) {
  setTimeout(() => vueApp.isAList = true, 500)
  window.cacheKey = {
    searchHistory: 'alist_searchHistory',
    lyricHistory: 'alist_lyricHistory',
    playList: 'alist_playList',
    playMode: 'alist_playMode',
    fontSize: 'dm_fontSize',
    currInd: 'alist_currInd',
    currTime: 'alist_currTime',
  }
  window.getSongUrl = async function(song, br) {
    try {
      return AList.getFileInfo(`${song.path}/${song.name}`).then(res => res.data?.raw_url);
    } catch (e) { console.error(e); return null; }
  }
  window.getSongLyric = async function(song, isChangeSouece) {
    try {
      if (!song.lyric) {
        // 尝试请求远端歌词接口
        let source = lyricSources[0]
        if (isChangeSouece) {
          currLyricSource = (currLyricSource + 1) % lyricSources.length
          source = lyricSources[currLyricSource]
        }
        let results = await fetch(`${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(song.name)}&count=5`).then(res => res.json()) || []
        if (!results.length) return;
        showNotification(`正在获取歌词：${source}`, 'info');
        return (await fetch(`${API_BASE}?types=lyric&source=${source}&id=${results[0].lyric_id || results[0].id}`).then(res => res.json()) || {}).lyric
      }
      const { data } = await AList.getFileInfo(song.lyric)
      if (!data.raw_url) return null;
      return AList.getRawFile(song.lyric, { sign: data.sign, alist_ts: Date.now() }).then(res => res.message ? null : res);
    } catch (e) { console.error(e); return null; }
  }
  // 反上传歌词到AList
  window.uploadLyricBind = async function() {
    const key = `${this.currentSong.raw.source}_${this.currentSong.raw.id}`
    console.log(key);
    if (this.lyricHistory[key]) {
      const formData = new FormData();
      formData.append('file', new Blob([this.lyricHistory[key]], { type: 'text/plain' }));
      const path = `${this.currentSong.raw.path}/${getFileName(this.currentSong.raw.name)}.lrc`
      AList.uploadRawFile(formData, path).then(() => showNotification('歌词上传成功', 'success'));
    }
  }
  window.getAlbumCoverUrl = async function (song, size = 300) {
    return albumSbgImg
  }
  window.searchMusicBind = async function(keyword, source) { 
    this.searchResults = musicList.filter(item => item.name.toLowerCase().includes(keyword.toLowerCase())
      || item.path.toLowerCase().includes(keyword.toLowerCase()))
    if (!this.searchResults.length) {
      return showNotification('未找到相关歌曲，请尝试其他关键词', 'warning');
    }
  }
  window.refreshBind =  async function() {
    console.log(this);
    if (!confirm('确定重新刷新列表吗')) return;
    let songs = await AList.listAllSong(alist[1])
    if (!songs || !songs.length) return showNotification('获取音乐列表失败', 'error');
    handleSongs(songs);  console.log(songs);
    musicList = songs.filter(item => item.m)
    setStorage('alist_MusicList', musicList)
    vueApp.searchResults = musicList
  }
  window.sourceChangeBind = async function() {
    console.log('sourceChangeBind', this);
    this.searchKeyword = this.selectedSource
    this.searchMusic()
  }
  window.resetAlist = async function() {
    if (!confirm('确定要重置Alist配置吗？')) return;
    setStorage('alist_config', null)
    location.reload()
  }
}

window.syncCode = getStorageExp('dm_syncCode') || ''
function changeSyncCode() {
  let temp = prompt('请输入同步编码, 4-10个字符', syncCode)
  if (!temp || temp.trim().length < 4) return;
  syncCode = temp
  setStorageExp('dm_syncCode', syncCode)
  showNotification('同步编码已保存', 'success');
}
function uploadList(data) {
  if(!confirm('确定要上传覆盖远端列表吗？')) return;
  if (!syncCode) {
    const code = prompt('请输入同步编码, 超过3个字符', '')
    if (!code || code.trim().length < 4) return showNotification('未配置同步编码', 'error');
    syncCode = code
    setStorageExp('dm_syncCode', syncCode)
  }
  let uploadUrl = `//home.199311.xyz:40003/upload?name=gdmusic${window.isAList ? '_alist' : ''}_${syncCode}.dat`
  let arr = pako.deflate(new TextEncoder().encode(JSON.stringify(data)), { level: 9 })
  const formData = new FormData();
  formData.append('file', new Blob([arr], { type: 'application/octet-stream' }));
  return fetch(uploadUrl, { method: 'POST', body: formData }).then(res => res.text())
}

async function downloadList() {
  if (!syncCode) {
    const code = prompt('请输入同步编码, 超过3个字符', '')
    if (!code || code.trim().length < 4) return showNotification('未配置同步编码', 'error');
    syncCode = code
    setStorageExp('dm_syncCode', syncCode)
  }
  let downloadUrl = `//home.199311.xyz:40003/download?name=gdmusic${window.isAList ? '_alist' : ''}_${syncCode}.dat&t=${Date.now()}`
  try {
    const res = await fetch(downloadUrl, { method: 'GET' }).then(res => res.arrayBuffer())
    return JSON.parse(pako.inflate(new Uint8Array(res), { to: 'string' }))
  } catch (e) {
    return null;
  }
}