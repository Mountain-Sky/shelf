"""Create a catalogue-only OAuth principal and seed synthetic Koha items.
All command output, including generated credentials, stays in private files.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--sandbox', required=True, help='Generated private sandbox directory')
parser.add_argument('--project', default='shelf-koha')
args = parser.parse_args()
root = Path(args.sandbox).resolve()
probe = subprocess.run(['git', '-C', str(root), 'rev-parse', '--is-inside-work-tree'], capture_output=True, text=True)
if probe.returncode == 0 and probe.stdout.strip() == 'true':
    raise SystemExit('Sandbox credentials must remain outside Git worktrees.')
scripts = Path(__file__).parent
compose = ['docker','compose','-p',args.project,'-f',str(root/'compose.json')]

def run(tail, input_text=None):
    result = subprocess.run(compose+tail, input=input_text, capture_output=True, text=True)
    if result.returncode:
        fd = os.open(root/'bootstrap-error.log', os.O_WRONLY|os.O_CREAT|os.O_TRUNC, 0o600)
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as stream: stream.write(result.stdout+result.stderr)
        raise SystemExit('Sandbox bootstrap command failed; inspect bootstrap-error.log privately (it may contain credentials).')
    return result.stdout

def save(data):
    fd, temp = tempfile.mkstemp(prefix='.reader-', dir=root)
    with os.fdopen(fd,'w') as stream: json.dump(data,stream,indent=2)
    os.replace(temp,root/'reader.json')

run(['exec','-T','koha','test','-f','/ktd_ready'])
for name in ['create-reader.pl','seed-shelf.pl']:
    run(['exec','-T','koha','sh','-c','cat > /tmp/'+name+' && chmod 644 /tmp/'+name], (scripts/name).read_text())
# Reuse an existing captured key; do not generate a new key on every bootstrap.
if (root/'reader.json').exists():
    data=json.loads((root/'reader.json').read_text())
    if not data.get('KOHA_CLIENT_ID') or not data.get('KOHA_CLIENT_SECRET'):
        raise SystemExit('Existing reader.json is not a configured OAuth key. Preserve/resolve it before proceeding.')
else:
    data=json.loads(run(['exec','-T','koha','koha-shell','kohadev','-c','perl /tmp/create-reader.pl']))
    save(data)
data.update(json.loads(run(['exec','-T','koha','koha-shell','kohadev','-c','perl /tmp/seed-shelf.pl'])))
save(data)
print('OAuth reader and synthetic items configured; settings saved privately in reader.json. No credentials displayed.')
