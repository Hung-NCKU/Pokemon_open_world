"""Collect selected regional BGM, preserve loop points, and encode compact local Oggs."""
import concurrent.futures,hashlib,html,json,os,re,shutil,subprocess,time,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT/'.cache/regional-music';OUT=ROOT/'assets/bgm';FF=shutil.which('ffmpeg');PROBE=(shutil.which('ffprobe') or str(Path(FF).with_name('ffprobe.exe' if os.name == 'nt' else 'ffprobe'))) if FF else None

def build():
 if not FF:raise RuntimeError('ffmpeg is required')
 CACHE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
 selection=json.loads((ROOT/'data/music_selection.json').read_text(encoding='utf8'));catalog={};regions={};sources={}
 for region,(game,roles) in selection.items():
  if game not in catalog:
   listing=CACHE/(game+'.html')
   if not listing.exists():listing.write_bytes(urllib.request.urlopen('https://enls.eu/prelooped/album/?game='+game,timeout=40).read())
   catalog[game]=[html.unescape(u) for u in re.findall(r"<source src='([^']+)'",listing.read_text(encoding='utf8'))]
  regions[region]={}
  for role,code in roles.items():
   parts=code.split('|');matches=[u for u in catalog[game] if re.match(r'\w+ '+re.escape(parts[0])+r' ',u.rsplit('/',1)[-1]) and all(p in u for p in parts[1:])]
   if len(matches)>1 and len(parts)>1 and parts[1]=='Victory!': matches=[u for u in matches if u.rsplit('/',1)[-1].split(' ',2)[2].startswith('Victory!')]
   if len(matches)!=1:raise ValueError(f'{region}/{role}: {code} matched {len(matches)} tracks')
   url=matches[0];key=hashlib.sha256(url.encode()).hexdigest()[:16];regions[region][role]=key;sources[key]=url
 def collect(job):
  key,url=job;raw=CACHE/(key+'.ogg');dest=OUT/(key+'.ogg');meta=CACHE/(key+'.json')
  if dest.exists() and meta.exists():return key,json.loads(meta.read_text(encoding='utf8'))
  if not raw.exists():
   for attempt in range(4):
    try:raw.write_bytes(urllib.request.urlopen(urllib.parse.quote(url,safe=':/'),timeout=90).read());break
    except Exception:
     if attempt==3:raise
     time.sleep(attempt+1)
  info=json.loads(subprocess.check_output([PROBE,'-v','error','-show_entries','format=duration:stream=sample_rate:stream_tags','-of','json',str(raw)]))
  stream=info['streams'][0];tags={k.upper():v for k,v in stream.get('tags',{}).items()};rate=int(stream['sample_rate']);duration=float(info['format']['duration']);start=int(tags.get('LOOPSTART',0))/rate
  end=min(duration,start+int(tags.get('LOOPLENGTH',0))/rate) if tags.get('LOOPLENGTH') else min(duration,int(tags.get('LOOPEND',int(duration*rate)))/rate)
  subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(raw),'-t',str(end),'-ar','32000','-ac','2','-c:a','libvorbis','-q:a','2','-threads','1',str(dest)],check=True)
  data={'file':f'assets/bgm/{key}.ogg','title':url.rsplit('/',1)[-1][:-4],'source':url,'loopStart':start,'loopEnd':end,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
  meta.write_text(json.dumps(data),encoding='utf8');return key,data
 print('Collecting',len(sources),'unique tracks across',len(regions),'regions',flush=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  tracks={}
  for i,(key,data) in enumerate(pool.map(collect,sources.items()),1):
   tracks[key]=data
   if i%12==0:print('Processed',i,'/',len(sources),flush=True)
 manifest={'credit':"ENLS's Pre-Looped Music Library; Nintendo / Creatures / GAME FREAK",'regions':regions,'tracks':tracks}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf8')
 path=ROOT/'assets/gen3/manifest.js';s=path.read_text(encoding='utf8');gen3=json.loads(s[s.index('{'):s.rindex('}')+1]);gen3['regionalMusic']=manifest;path.write_text('window.GEN3='+json.dumps(gen3,ensure_ascii=False)+';\n',encoding='utf8')
 print('Built',len(tracks),'tracks,',sum((OUT/(k+'.ogg')).stat().st_size for k in tracks),'bytes',flush=True)
if __name__=='__main__':build()
