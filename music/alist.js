document.addEventListener('DOMContentLoaded', async function () {
  let alist = await getStorage('alist')
  if (!alist) {
    alist = (window.prompt('请输入alist: alist域名|音乐绝对路径|username|password', '') || '').split('|')
    if (alist.length != 4) return;
    setStorage('alist', alist)
  }
  vue
});