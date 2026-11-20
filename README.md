# VeriOrigin — visual demo

Static GitHub Pages build of the VeriOrigin / 归源 visual demo.

- `index.html` — English
- `zh.html` — 中文
- `assets/` — CSS, scenes.js, fonts, and the four-domain sample imagery
- No backend, no API calls, no sign-in. Only the visual record / locate / restore demo.

## Deploy

This folder is intended to be the repository root of a GitHub Pages user site named `veriorigin.github.io`.

```bash
cd veriorigin.github.io
git init
git add .
git commit -m "VeriOrigin visual demo"
git branch -M main
git remote add origin https://github.com/<your-account>/veriorigin.github.io.git
git push -u origin main
```

Then in GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**.

The site will be at **https://<your-account>.github.io/** (or the matching user-site URL).

## Local preview

```bash
python -m http.server 8788
```

Open http://127.0.0.1:8788/.
