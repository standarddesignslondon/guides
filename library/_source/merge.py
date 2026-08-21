import json, glob, re, collections, unicodedata

def load(f):
    try: return json.load(open(f))
    except Exception as e: print('!!',f,e); return {}

plug_links={}
for f in ['links_ik.json','links_arturia.json','links_b2.json','links_b3.json',
          'links_b4.json','links_b5.json','links_b6.json','links_b7.json']:
    for vendor,d in load(f).items():
        plug_links.setdefault(vendor,{'vendor_url':d.get('vendor_url'),'products':{}})
        plug_links[vendor]['vendor_url']=plug_links[vendor]['vendor_url'] or d.get('vendor_url')
        plug_links[vendor]['products'].update(d.get('products',{}) or {})

packs=load('links_packs.json')
builtin=load('links_builtin.json')
udev={}
for f in ['links_u0.json','links_u1.json','links_u2.json','links_u3.json']:
    udev.update(load(f))

P=json.load(open('plugins.json'))
M=json.load(open('m4l2.json'))

TYPES={'delay','reverb','eq','dynamics','distortion','modulation','filter','pitch',
       'spatial','utility','analyser','synth','sampler','drums','sequencer',
       'granular','tape','amp','vocal','other'}

def norm_type(t):
    t=(t or '').strip().lower()
    return t if t in TYPES else None

# fallback type from Live's declared subcategory
SUBMAP={'delay':'delay','reverb':'reverb','eq':'eq','dynamics':'dynamics',
        'dynamics - multiband':'dynamics','distortion':'distortion',
        'modulation':'modulation','filter':'filter','pitch shift':'pitch',
        'spatial':'spatial','tools':'utility','analyzer':'analyser',
        'synth':'synth','sampler':'sampler','drum':'drums','mastering':'dynamics',
        'channel strip':'dynamics','guitar':'amp','vocals':'vocal',
        'generator':'synth','instrument':'synth','instrument synth':'synth'}

# --- collapse VST2/VST3 name variants of the same plugin ---
def _n(x):
    x=x.lower()
    x=re.sub(r'^(tr5|uvi|air|uadx|waves)\s+','',x)
    x=re.sub(r'\s*(mono/stereo|mono|stereo)$','',x)
    x=re.sub(r'vst$','',x)
    return re.sub(r'[^a-z0-9]','',x)

_g=collections.defaultdict(list)
for p in P: _g[(p['vendor'],_n(p['name']))].append(p)
_P=[]
for (vendor,_),group in _g.items():
    if len(group)==1: _P.append(group[0]); continue
    names=[g['name'] for g in group]
    stem=re.sub(r'\s*(Mono/Stereo|Mono|Stereo)$','',names[0])
    if all(re.sub(r'\s*(Mono/Stereo|Mono|Stereo)$','',x)==stem for x in names):
        pick=dict(group[0]); pick['name']=stem          # Waves channel variants
    else:
        pick=dict(max(group,key=lambda g:(' ' in g['name'], len(g['name']))))
    fmts=set()
    for g in group: fmts.update(g['formats'].split('/'))
    pick['formats']='/'.join(sorted(fmts))
    # keep whichever spelling carries the researched link data
    L=plug_links.get(vendor,{}).get('products',{})
    for g in group:
        if L.get(g['name'],{}).get('product_url'): pick['_link_name']=g['name']; break
    _P.append(pick)
P=sorted(_P,key=lambda x:(x['vendor'].lower(),x['name'].lower()))
print('plugins after collapsing format variants:',len(P))

rows=[]
seen=set()
def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode()
    s=re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-') or 'x'
    b=s; i=2
    while s in seen: s=f'{b}-{i}'; i+=1
    seen.add(s); return s

# ---------------- plugins ----------------
for p in P:
    L=plug_links.get(p['vendor'],{})
    d=(L.get('products') or {}).get(p.get('_link_name') or p['name'],{}) or {}
    t=norm_type(d.get('category'))
    if not t:
        for part in reversed([x.strip().lower() for x in p['category'].split(',')]):
            if SUBMAP.get(part): t=SUBMAP[part]; break
    rows.append(dict(slug=slug('p-'+p['vendor']+'-'+p['name']),name=p['name'],
        source='Plugin', type=t or 'other', maker=p['vendor'],
        fmt=p['formats'], origin='Plugin',
        note=d.get('note') or '', version=p['version'],
        url=d.get('product_url') or L.get('vendor_url') or p.get('url') or '',
        manual=d.get('manual_url') or '', guide=''))

# ---------------- max for live ----------------
def cls(r):
    q=r['path']
    if 'Ableton Live 12 Suite.app' in q: return 'Live built-in'
    if '/Live Sets/' in q or 'Live Sets Archive' in q or ' Project/' in q: return 'Project copy'
    if '/User Library/' in q: return 'User Library'
    if r['source']=='Pack' or 'Factory Packs' in q or '/Packs/' in q: return 'Pack'
    return 'Elsewhere'

# Simon's own — collapse variants, link to the guide
OWN={'Cascade':'cascade','Microcosmos':'microcosmos','Pulsograph':'pulsograph',
     'ORAM':'oram','The1958Machine':'the-1958-machine','Ondes Martenot':'ondes-martenot',
     'SW Radio':'sw-radio','YT Sampler':'yt-sampler','Preset Scroll':'preset-scroll',
     'Manual Tape':'manual-tape','Scene Placer':'scene-placer','False Memory':'false-memory',
     'Tape Error':'tape-error','StripSilence':'strip-silence',
     'Disintegration':'disintegration','Magnabelt':'magnabelt','Splice 1':'splice-tape-collage'}
OWN_NAME={'The1958Machine':'The 1958 Machine','StripSilence':'Strip Silence',
          'Splice 1':'Splice (Tape Collage)'}

pack_of={}
for r in M:
    if cls(r)=='Pack': pack_of.setdefault(r['name'],r['place'])

best={}
for r in M:
    c=cls(r)
    if c in ('Project copy','Elsewhere'): continue
    own=next((k for k in OWN if r['name'].startswith(k)),None)
    key=('own',own) if own else (c, r['name'])
    cur=best.get(key)
    if cur is None or r['used']>cur['used']: best[key]=r

for (kind,k),r in best.items():
    c=cls(r)
    if kind=='own':
        rows.append(dict(slug=slug('m-'+k),name=OWN_NAME.get(k,k),source='Max for Live',
            type=None,maker='Claude + Simon',fmt=r['kind'],origin='Built here',
            note='',version='',url='',manual='',guide=f'../max-for-live/devices/{OWN[k]}.html'))
        continue
    name=r['name']
    if c=='Live built-in':
        d=builtin.get(name,{}) or {}
        rows.append(dict(slug=slug('m-builtin-'+name),name=name,source='Max for Live',
            type=norm_type(d.get('category')) or 'other',maker='Ableton',fmt=r['kind'],
            origin='Live built-in',note=d.get('note') or '',version='',
            url=d.get('manual_url') or '',manual=d.get('manual_url') or '',guide=''))
    elif c=='Pack':
        pk=r['place']; pd=packs.get(pk,{}) or {}
        dd=(pd.get('devices') or {}).get(name,{}) or {}
        rows.append(dict(slug=slug('m-pack-'+pk+'-'+name),name=name,source='Max for Live',
            type=norm_type(dd.get('category')) or 'other',
            maker=re.sub(r'^.* by ','',pk) if ' by ' in pk else 'Ableton',
            fmt=r['kind'],origin=pk,note=dd.get('note') or '',version='',
            url=dd.get('device_url') or pd.get('pack_url') or '',
            manual=pd.get('docs_url') or '',guide=''))
    else:
        d=udev.get(name,{}) or {}
        rows.append(dict(slug=slug('m-user-'+name),name=name,source='Max for Live',
            type=norm_type(d.get('category')) or 'other',
            maker=d.get('maker') or 'Unknown',fmt=r['kind'],origin='User Library',
            note=d.get('note') or '',version='',url=d.get('url') or '',
            manual='',guide=''))

# tutorial pack devices get their own type so they filter away
for r in rows:
    if r['origin']=='Building Max Devices': r['type']='tutorial'

# --- corrections found by spot-checking the researched links against the
# --- real pages. Keyed on name; applied last so they survive a regenerate.
CORRECTIONS={
 'Ozone Imager 2':{'url':'https://www.izotope.com/products/ozone-imager',
   'note':'Free stereo imaging and width plugin.'},
 'MultiSquisher':{'note':'Nine parallel detuned copies of a sample per note; '
   'still monophonic.'},
}
for r in rows:
    if r['name'] in CORRECTIONS: r.update(CORRECTIONS[r['name']])

json.dump(rows,open('catalogue.json','w'),indent=1)
print('entries:',len(rows))
print('by source:',collections.Counter(r['source'] for r in rows))
print('by type:',collections.Counter(r['type'] for r in rows).most_common())
print('with url:',sum(1 for r in rows if r['url']),'with manual:',sum(1 for r in rows if r['manual']),
      'with guide:',sum(1 for r in rows if r['guide']),'with note:',sum(1 for r in rows if r['note']))
print('makers:',len({r['maker'] for r in rows}))
