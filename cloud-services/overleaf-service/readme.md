## Add user to Overleaf

```bash
docker exec sharelatex /bin/bash -ce "cd /overleaf/services/web && node modules/server-ce-scripts/scripts/create-user --admin --email=joe@example.com"
```

## Install texlive packages

```bash
docker exec sharelatex /bin/bash -ce "apt-get update && apt-get install texlive-full -y && tlmgr install scheme-full"
```