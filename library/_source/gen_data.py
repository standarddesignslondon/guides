import json, collections, pprint, re

rows=json.load(open('catalogue.json'))

# --- Simon's own devices: type, note and maker taken from the guide's own site_data ---
OWN={
 'Cascade':('delay','Claude'),'Microcosmos':('granular','Claude'),
 'Pulsograph':('drums','Claude'),'ORAM':('synth','Claude'),
 'The 1958 Machine':('tape','Claude'),'Splice (Tape Collage)':('tape','Claude'),
 'Ondes Martenot':('synth','Claude'),'SW Radio':('other','Claude'),
 'YT Sampler':('sampler','Claude'),'Preset Scroll':('utility','Claude'),
 'Manual Tape':('sampler','GPT-5.6'),'Scene Placer':('spatial','GPT-5.6'),
 'False Memory':('distortion','GPT-5.6'),'Tape Error':('tape','GPT-5.6'),
 'Strip Silence':('utility','GPT-5.6'),'Disintegration':('tape','GPT-5.6'),
 'Magnabelt':('sampler','ChatGPT'),
}
import sys
sys.path.insert(0,'/sessions/vibrant-blissful-thompson/mnt/Guides/max-for-live')
import site_data as SD
tagline={i['name']:i['tagline'] for i in SD.ITEMS}
kindof={i['name']:i['kind'] for i in SD.ITEMS}

INSTRUMENT_TYPES={'synth','sampler','drums'}
def role(e):
    if e['source']=='Max for Live':
        return e['fmt'] if e['fmt'] in ('Instrument','Audio Effect','MIDI Effect') else 'Audio Effect'
    return 'Instrument' if e['type'] in INSTRUMENT_TYPES else 'Audio Effect'

out=[]
for e in rows:
    if e['origin']=='Built here':
        t,a=OWN[e['name']]
        e['type']=t; e['maker']=a
        e['note']=tagline.get(e['name'],'')
        e['fmt']=kindof.get(e['name'],e['fmt'])
    e['role']=role(e)
    if e['type']=='tutorial': e['role']='Audio Effect'
    out.append({k:e.get(k,'') or '' for k in
        ('slug','name','source','type','role','maker','fmt','origin','note',
         'version','url','manual','guide')})

# sort: own devices first, then alphabetically
out.sort(key=lambda e:(0 if e['origin']=='Built here' else 1, e['name'].lower()))

TYPE_ORDER=['delay','reverb','eq','dynamics','distortion','modulation','filter',
  'pitch','spatial','tape','granular','amp','vocal','synth','sampler','drums',
  'sequencer','analyser','utility','other','tutorial']

SUBJECT={
 'short':'library',
 'title':'plugin &\nm4l library',
 'subtitle':'searchable inventory',
 'blurb':'Everything Ableton can load on this machine — every plugin and every '
         'Max for Live device, with a link out to the product page and the '
         'manual wherever one exists. Read straight out of Live’s own '
         'plugin database and browser index, so it is what Live actually sees, '
         'not what I remember installing.',
 'legend':'**Type** is the maker’s own classification where they publish one, '
          'otherwise the category Live reports. **guide** links go to the '
          'written chapter for the devices built here; **product** and '
          '**manual** open the maker’s own pages. Entries with no link are '
          'ones whose source I could not find — they are still installed, '
          'just undocumented. *Building Max Devices* lesson patches are filed '
          'under the **tutorial** type so they stay out of the way.',
 'hub_label':'guides',
 'accent':'#ff4f00',
 'facets':[
   {'field':'source','all':'everything','order':['Plugin','Max for Live']},
   {'field':'role','all':'all roles','order':['Instrument','Audio Effect','MIDI Effect']},
   {'field':'type','all':'all types','order':TYPE_ORDER},
 ],
}

with open('/sessions/vibrant-blissful-thompson/mnt/Guides/library/catalogue_data.py','w') as f:
    f.write('"""Catalogue content for the library subject.\n\n'
            'Generated from Ableton Live 12.4.3\'s own databases:\n'
            '  Live-plugins-1.db   the plugin scanner database\n'
            '  Live-files-12300.db the browser index (Max for Live devices)\n'
            'plus researched product and manual links. Regenerate rather than\n'
            'hand-editing if the underlying library changes.\n"""\n\n')
    f.write('SUBJECT = ')
    f.write(pprint.pformat(SUBJECT,width=78,sort_dicts=False))
    f.write('\n\nENTRIES = ')
    f.write(pprint.pformat(out,width=100,sort_dicts=False))
    f.write('\n')
print('entries',len(out))
print('roles',collections.Counter(e['role'] for e in out))
print('types',len({e['type'] for e in out}))
