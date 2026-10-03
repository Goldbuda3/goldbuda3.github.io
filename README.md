# joaquinvargas.me

Personal site for my side projects, served by GitHub Pages at **[joaquinvargas.me](https://joaquinvargas.me)**.

It's plain HTML, CSS and JavaScript — no build step and no dependencies. Push to `master` and GitHub Pages publishes it.

## Folder layout

```
index.html              Homepage
css/style.css           Homepage styles (colors are variables at the top)
js/projects-data.js     All homepage content — the file you'll edit most
js/main.js              Renders the content from projects-data.js
img/                    Favicon, profile photo, project thumbnails
forms/                  Résumé PDF

feedFilter/             CSV/TSV Feed Filter project
hydroflask/             Hydro Flask: Colors of Kona project

CNAME                   Custom domain for GitHub Pages
```

Each project that's hosted on this site gets its own folder holding its page, styles and images.

## Editing the homepage

Everything on the homepage comes from [`js/projects-data.js`](js/projects-data.js).

### Add a project

Add an entry to `PROJECTS`. They show in list order, so put the newest first.

```js
{
  title: 'My Sports Project',
  category: 'sports',              // must match a key in CATEGORIES
  stack: ['React', 'Node.js'],
  description: 'One line on what it does.',
  image: 'my-sports-project/images/thumb.png',  // optional
  url: 'my-sports-project/index.html',          // or a full https:// link
  external: false                  // true opens the link in a new tab
}
```

Optional fields:

| Field | What it does |
|---|---|
| `image` | Card thumbnail. Without one, the card shows the project's initials. |
| `imagePosition` | Adjusts the thumbnail crop, e.g. `'center 70%'`. |
| `initials` | Overrides the auto-generated initials, e.g. `'FF'`. |

The filter buttons build themselves from the projects: a category gets a button as soon as one project uses it, and its count updates automatically. Once a filter matches more than 6 projects, a **Show all** button appears.

### Add a category

Add it to `CATEGORIES` (id on the left, label on the right). The order there is the order the filter buttons appear in.

### Show "Open to work"

Set `SITE.openToWork` to `true` to show the green "Open to work" chip in the header area. It's `false` by default.

### Update skills

Edit the `SKILLS` list. Each group's `color` is `green`, `purple` or `orange`.

## Previewing locally

Run a local server from the repo folder, then open http://localhost:8000:

```sh
python -m http.server 8000
```

Opening `index.html` directly from the file system mostly works too, but a local server matches how GitHub Pages serves the site.
