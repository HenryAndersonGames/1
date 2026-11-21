// Финальная сборка под Windows без Wine: иконка в exe (resedit) + установщик NSIS + портативный zip.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as ResEdit from 'resedit';
import * as PE from 'pe-library';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const ver = pkg.version;
const dir = path.join(root, 'dist', 'win-ia32-unpacked');
const exePath = path.join(dir, 'BitterCreek.exe');

// 1. иконка и сведения о версии
const exe = PE.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const res = PE.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(root, 'build', 'icon.ico')));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const g = groups[0];
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g ? g.id : 1, g ? g.lang : 1033, ico.icons.map((i) => i.data));
const vis = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const vi = vis[0] || ResEdit.Resource.VersionInfo.createEmpty();
const [a, b, c] = ver.split('.').map(Number);
vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, {
  ProductName: 'Bitter Creek', FileDescription: 'Bitter Creek', CompanyName: 'Bitter Creek Team',
  OriginalFilename: 'BitterCreek.exe', InternalName: 'BitterCreek', LegalCopyright: 'Bitter Creek', FileVersion: ver, ProductVersion: ver,
});
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
console.log('icon set on', exePath, 'group', g && g.id);

// 2. установщик
const nsi = path.join(root, 'build', 'installer.nsi');
execSync(`makensis -V2 -DVERSION=${ver} "${nsi}"`, { stdio: 'inherit', cwd: path.join(root, 'build') });

// 3. портативная версия
const zip = path.join(root, 'dist', `BitterCreek-${ver}-portable.zip`);
if (fs.existsSync(zip)) fs.unlinkSync(zip);
execSync(`cd "${path.join(root, 'dist')}" && rm -rf BitterCreek && cp -r win-ia32-unpacked BitterCreek && zip -qr -9 "${zip}" BitterCreek && rm -rf BitterCreek`);
console.log('done');
