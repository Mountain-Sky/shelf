"""Prepare an isolated, private Koha sandbox from pinned official checkouts.
This generates local secrets. Never put the output directory in Git.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
from urllib.parse import urlparse

KOHA_REV = '7d272018beee67e422a090697796921a03a6eb39'
KTD_REV = 'ef7f1f97a5ba24d7552d3c4ed6396f196e6b1b36'
KOHA_IMAGE = 'koha/koha-testing@sha256:d45ca1a7f445d7ad1dc5f924506010b3422ae14ca1a7e40025b5db93578b77a0'
parser = argparse.ArgumentParser()
parser.add_argument('--koha-source', required=True)
parser.add_argument('--ktd-source', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--image', default=KOHA_IMAGE)
parser.add_argument('--ca-bundle')
parser.add_argument('--use-environment-proxy', action='store_true')
args = parser.parse_args()
koha, ktd, out = map(lambda p: Path(p).resolve(), [args.koha_source, args.ktd_source, args.output])
for directory, expected in [(koha, KOHA_REV), (ktd, KTD_REV)]:
    actual = subprocess.check_output(['git', '-C', str(directory), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != expected:
        raise SystemExit(f'Unexpected source revision in {directory}; use the documented pinned revision.')
if out.exists():
    raise SystemExit('Output must be a new directory; refusing to overwrite credentials or data.')
ancestor = out.parent
while not ancestor.exists():
    ancestor = ancestor.parent
probe = subprocess.run(['git', '-C', str(ancestor), 'rev-parse', '--is-inside-work-tree'], capture_output=True, text=True)
if probe.returncode == 0 and probe.stdout.strip() == 'true':
    raise SystemExit('Output must be outside every Git worktree; refusing to write secrets there.')
out.mkdir(parents=True, mode=0o700)

def private_write(name, text):
    with os.fdopen(os.open(out/name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as stream:
        stream.write(text)

private_write('.gitignore', '*\n')

env = {}
for line in (ktd/'env/defaults.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        env[key] = value.strip('"')
env.update({
    'KOHA_DB_PASSWORD': secrets.token_hex(24),
    'KOHA_DB_ROOT_PASSWORD': secrets.token_hex(24),
    'KOHA_PASS': secrets.token_hex(24), 'KOHA_USER': 'shelf_sandbox_admin',
    'KOHA_DOMAIN': '.localhost', 'KOHA_OPAC_URL': 'http://127.0.0.1:18080',
    'KOHA_INTRANET_URL': 'http://127.0.0.1:18081', 'LOCAL_USER_ID': str(os.getuid() if hasattr(os, 'getuid') else 1000),
    'SKIP_L10N': 'yes', 'SKIP_CYPRESS_CHOWN': 'yes', 'KOHA_ELASTICSEARCH': 'no',
    'USE_EXISTING_DB': 'yes', 'CPAN': 'no', 'CYPRESS_INSTALL_BINARY': '0',
    'ERL_FLAGS': '+S 2:2 +SDcpu 1 +SDio 1 +A 2',
    'RABBITMQ_SERVER_ADDITIONAL_ERL_ARGS': '+S 2:2 +SDcpu 1 +SDio 1 +A 2',
    'RABBITMQ_CTL_ERL_ARGS': '+S 2:2 +SDcpu 1 +SDio 1 +A 2',
})
extra_hosts = {}
if args.use_environment_proxy:
    for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']:
        if os.environ.get(key):
            env[key] = os.environ[key]
            if key != 'NO_PROXY':
                host = urlparse(env[key]).hostname
                extra_hosts[host] = socket.gethostbyname(host)
volumes = [f'{koha}:/kohadevbox/koha', f'{out}/run-private.sh:/kohadevbox/run.sh:ro']
if args.ca_bundle:
    (out/'trusted-ca.pem').write_bytes(Path(args.ca_bundle).read_bytes())
    volumes.append(f'{out}/trusted-ca.pem:/trusted-ca.pem:ro')
    env['NODE_EXTRA_CA_CERTS'] = '/trusted-ca.pem'
script = (ktd/'files/run.sh').read_text()
if script.count('hostname kohadevbox') != 1 or script.count('echo "password = password"') != 1:
    raise SystemExit('Upstream startup script changed; review the adaptation before continuing.')
script = script.replace('hostname kohadevbox', 'true # Compose supplies hostname; no SYS_ADMIN needed')
script = script.replace('echo "password = password"', 'echo "password = ${KOHA_DB_ROOT_PASSWORD}"')
script = script.replace('cp /kohadevbox/koha/yarn.lock    /kohadevbox', 'cp /kohadevbox/koha/yarn.lock    /kohadevbox\nchmod a+r /kohadevbox/package.json /kohadevbox/yarn.lock')
script = script.replace('a2ensite ${KOHA_INSTANCE}.conf', '''a2ensite ${KOHA_INSTANCE}.conf
# A single sandbox instance uses standard prefork under its dedicated Apache user.
# mpm_itk's per-vhost initgroups fails in this unprivileged Docker environment.
a2dismod mpm_itk
sed -i '/^[[:space:]]*AssignUserID /d' /etc/apache2/sites-available/${KOHA_INSTANCE}.conf''')
script = script.replace('service rabbitmq-server start || true', '''printf '%s\\n' 'SERVER_ADDITIONAL_ERL_ARGS="+S 2:2 +SDcpu 1 +SDio 1 +A 2"' 'CTL_ERL_ARGS="+S 2:2 +SDcpu 1 +SDio 1 +A 2"' > /etc/rabbitmq/rabbitmq-env.conf
service rabbitmq-server start || true''')
restart_existing = '''
# Resume an initialized container without rerunning koha-create or sample-data bootstrap.
# The readiness marker survives container stops; its presence alone is not API readiness.
if [ -f /ktd_ready ] && [ -f "/etc/koha/sites/${KOHA_INSTANCE}/koha-conf.xml" ]; then
    service koha-common start
    service apache2 start
    service rabbitmq-server start || true
    echo "Resumed existing Shelf Koha instance; database bootstrap skipped."
    /bin/bash -c "trap : TERM INT; sleep infinity & wait"
    exit 0
fi
'''
script = script.replace('set -e\n', 'set -e\n' + restart_existing, 1)
private_write('run-private.sh', script)
private_write('sandbox.env', '\n'.join(key+'='+json.dumps(value) for key,value in env.items())+'\n')
metadata = json.loads((Path(__file__).parent/'images.json').read_text())
config = {'services': {
    'koha': {'image': args.image, 'platform':'linux/amd64', 'hostname':'kohadevbox',
        'depends_on':['db','memcached'], 'ports':['127.0.0.1:18080:8080','127.0.0.1:18081:8081'],
        'env_file':['sandbox.env'], 'volumes':volumes, 'tmpfs':['/cover_db','/tmp'],
        'extra_hosts':extra_hosts, 'ulimits':{'nofile':{'soft':65536,'hard':65536}}, 'networks':['shelf-koha']},
    'db': {'image':metadata['dbImage'], 'environment':{
        'MYSQL_ROOT_PASSWORD':env['KOHA_DB_ROOT_PASSWORD'], 'MYSQL_DATABASE':'koha_kohadev',
        'MYSQL_USER':'koha_kohadev','MYSQL_PASSWORD':env['KOHA_DB_PASSWORD']},
        'volumes':['shelf-koha-db:/var/lib/mysql'], 'networks':['shelf-koha']},
    'memcached': {'image':metadata['memcachedImage'], 'command':['memcached','-m','64m'], 'networks':['shelf-koha']},
},'volumes':{'shelf-koha-db':{}},'networks':{'shelf-koha':{}}}
private_write('compose.json', json.dumps(config, indent=2)+'\n')
print('Prepared private sandbox files. No credentials displayed. Keep the output directory outside Git.')
