import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const root = resolve('dist')
let html = await readFile(resolve(root,'index.html'),'utf8')
for (const tag of html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)) {
  const script = await readFile(resolve(root,tag[1]),'utf8')
  html = html.replace(tag[0], () => '<script type="module">'+script.replace(/<\/script/gi,'<\\/script')+'</script>')
}
for (const tag of html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)) {
  const css = await readFile(resolve(root,tag[1]),'utf8')
  html = html.replace(tag[0], () => '<style>'+css+'</style>')
}
const license = await readFile(resolve('node_modules/three/LICENSE'),'utf8')
html = html.replace('</html>', () => '<!-- Three.js\n'+license+'\n-->\n</html>')
await writeFile(resolve(root,'迷失林界.html'),html)
await mkdir(resolve('docs'), { recursive: true })
await writeFile(resolve('docs/index.html'), html)

